import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GamePhase,
  MakeBetPayload,
  ThrowCardPayload,
  SelectTrumpPayload,
  GAME_CONSTANTS,
  GameState,
} from '@joker/shared';
import { GameEngineService } from '../game/services/game-engine.service';
import { RoomManager } from './room.manager';
import { BotService } from '../bot/bot.service';

import { UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseGuards(TelegramAuthGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  // Map socket.id -> { playerId, playerName }
  private socketToPlayer: Map<string, { id: string; name: string }> = new Map();

  // Bot fill timer (before room is created)
  private botFillTimer: NodeJS.Timeout | null = null;

  constructor(
    private gameEngine: GameEngineService,
    private roomManager: RoomManager,
    private botService: BotService,
    private configService: ConfigService,
  ) {}

  /**
   * Handle new connection
   */
  async handleConnection(client: Socket): Promise<void> {
    const userId = client.handshake.query.userId as string;
    const userName = (client.handshake.query.userName as string) || 'Player';

    if (!userId) {
      client.emit('error', { code: 'NO_USER_ID', message: 'userId required in query' });
      client.disconnect();
      return;
    }

    this.socketToPlayer.set(client.id, { id: userId, name: userName });

    // DEBUG: Log all incoming events
    client.onAny((event, ...args) => {
      this.logger.log(`[DEBUG] Received event: ${event} from ${client.id}`);
    });

    // Check if player was in a game (reconnection)
    const room = await this.roomManager.getRoomByPlayerId(userId);
    if (room) {
      await this.roomManager.updateSocketId(userId, client.id);
      client.join(room.id);

      // Mark player as connected
      const player = room.gameState.players.find((p) => p.id === userId);
      if (player) {
        player.connected = true;
        await this.emitGameState(room.id);
      }

      this.logger.log(`Player ${userId} reconnected to room ${room.id}`);
    }

    this.logger.log(`Client connected: ${client.id} (${userId})`);
  }

  /**
   * Handle disconnection
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const playerInfo = this.socketToPlayer.get(client.id);
    if (playerInfo) {
      await this.roomManager.handleDisconnect(playerInfo.id, client.id);
      this.socketToPlayer.delete(client.id);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Find game - join matchmaking queue
   */
  @SubscribeMessage('find_game')
  async handleFindGame(@ConnectedSocket() client: Socket): Promise<void> {
    const playerInfo = this.socketToPlayer.get(client.id);
    if (!playerInfo) {
      client.emit('error', { code: 'NOT_REGISTERED', message: 'Connection not registered' });
      return;
    }

    // Check if already in a game
    const existingRoom = await this.roomManager.getRoomByPlayerId(playerInfo.id);
    if (existingRoom) {
      client.emit('error', { code: 'ALREADY_IN_GAME', message: 'Already in a game' });
      return;
    }

    // Add to queue
    this.roomManager.addToQueue(playerInfo.id, playerInfo.name, client.id);
    this.logger.log(
      `${playerInfo.name} joined queue. Queue size: ${this.roomManager.getQueueLength()}`,
    );

    // Check if enough players
    if (this.roomManager.canStartGame()) {
      this.clearBotFillTimer();
      await this.startGame();
    } else {
      // Start bot fill timer for first player
      if (this.roomManager.getQueueLength() === 1 && !this.botFillTimer) {
        this.startBotFillTimer();
      }
    }
  }

  /**
   * Leave matchmaking queue
   */
  @SubscribeMessage('leave_queue')
  async handleLeaveQueue(@ConnectedSocket() client: Socket): Promise<void> {
    const playerInfo = this.socketToPlayer.get(client.id);
    if (!playerInfo) return;

    this.roomManager.removeFromQueue(playerInfo.id);
    if (this.roomManager.getQueueLength() === 0) {
      this.clearBotFillTimer();
    }

    client.emit('queue_left', { playerId: playerInfo.id });
  }

  /**
   * Leave current game room
   */
  @SubscribeMessage('leave_game')
  async handleLeaveGame(@ConnectedSocket() client: Socket): Promise<void> {
    const playerInfo = this.socketToPlayer.get(client.id);
    if (!playerInfo) return;

    const room = await this.roomManager.getRoomByPlayerId(playerInfo.id);
    if (!room) {
      this.roomManager.removeFromQueue(playerInfo.id);
      client.emit('left_game', { playerId: playerInfo.id });
      return;
    }

    await this.roomManager.replaceWithBot(room.id, playerInfo.id);
    client.leave(room.id);

    this.server.to(room.id).emit('player_left', {
      playerId: playerInfo.id,
      playerName: playerInfo.name,
      playersCount: room.gameState.players.length,
    });

    client.emit('left_game', { roomId: room.id });
    await this.emitGameState(room.id);
    this.startTurnTimer(room.id);
    await this.processBotTurn(room.id);
  }

  /**
   * Clear bot fill timer
   */
  private clearBotFillTimer(): void {
    if (this.botFillTimer) {
      clearTimeout(this.botFillTimer);
      this.botFillTimer = null;
      this.logger.log('Bot fill timer cleared (queue empty or game started)');
    }
  }

  /**
   * Start bot fill timer
   */
  private startBotFillTimer(): void {
    this.clearBotFillTimer();

    const timeoutMs =
      Number(this.configService.get('MATCHMAKING_TIMEOUT_MS')) ||
      GAME_CONSTANTS.MATCHMAKING_TIMEOUT_MS;

    this.botFillTimer = setTimeout(async () => {
      // Fill with bots if still waiting
      if (this.roomManager.getQueueLength() > 0) {
        this.logger.log('Bot fill timeout - creating game with bots');
        await this.startGameWithBots();
      }
      this.botFillTimer = null;
    }, timeoutMs);

    this.logger.log(`Bot fill timer started (${timeoutMs / 1000}s)`);
  }

  /**
   * Start game with queued players
   */
  private async startGame(): Promise<void> {
    const room = await this.roomManager.createRoom();
    if (!room) return;

    // Start the game
    room.gameState = this.gameEngine.startGame(room.gameState);
    await this.roomManager.updateGameState(room.id, room.gameState);

    // Join sockets to room
    for (const [, socketId] of room.sockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(room.id);
        socket.emit('game_started', { roomId: room.id });
      }
    }

    this.logger.log(`Game started in room ${room.id}`);
    await this.emitGameState(room.id);
    this.startTurnTimer(room.id);
  }

  /**
   * Start game with bots
   */
  private async startGameWithBots(): Promise<void> {
    const room = await this.roomManager.createRoomWithBots();
    if (!room) return;

    // Start the game
    room.gameState = this.gameEngine.startGame(room.gameState);
    await this.roomManager.updateGameState(room.id, room.gameState);

    // Join sockets to room
    for (const [, socketId] of room.sockets) {
      if (!socketId) continue; // Skip bots
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(room.id);
        socket.emit('game_started', { roomId: room.id });
      }
    }

    this.logger.log(`Game started in room ${room.id} with bots`);
    await this.emitGameState(room.id);
    this.startTurnTimer(room.id);

    // If it's a bot's turn, make bot move
    await this.processBotTurn(room.id);
  }

  /**
   * Select trump (9-card rounds)
   */
  @SubscribeMessage('select_trump')
  async handleSelectTrump(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectTrumpPayload,
  ): Promise<void> {
    const playerInfo = this.socketToPlayer.get(client.id);
    if (!playerInfo) return;

    const room = this.roomManager.getRoomSync(payload.roomId);
    if (!room) {
      client.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    try {
      room.gameState = this.gameEngine.selectTrump(room.gameState, playerInfo.id, payload.trump);
      await this.roomManager.updateGameState(room.id, room.gameState);

      await this.emitGameState(room.id);
      this.startTurnTimer(room.id);
      await this.processBotTurn(room.id);
    } catch (err) {
      client.emit('error', { code: 'INVALID_TRUMP', message: (err as Error).message });
    }
  }

  /**
   * Make bet
   */
  @SubscribeMessage('make_bet')
  async handleMakeBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MakeBetPayload,
  ): Promise<void> {
    const playerInfo = this.socketToPlayer.get(client.id);
    if (!playerInfo) return;

    const room = this.roomManager.getRoomSync(payload.roomId);
    if (!room) {
      client.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    try {
      room.gameState = this.gameEngine.makeBet(room.gameState, playerInfo.id, payload.amount);
      await this.roomManager.updateGameState(room.id, room.gameState);

      await this.emitGameState(room.id);
      this.startTurnTimer(room.id);
      await this.processBotTurn(room.id);
    } catch (err) {
      client.emit('error', { code: 'INVALID_BET', message: (err as Error).message });
    }
  }

  /**
   * Throw card
   */
  @SubscribeMessage('throw_card')
  async handleThrowCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ThrowCardPayload,
  ): Promise<void> {
    const playerInfo = this.socketToPlayer.get(client.id);
    if (!playerInfo) return;

    const room = this.roomManager.getRoomSync(payload.roomId);
    if (!room) {
      client.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      return;
    }

    try {
      room.gameState = this.gameEngine.playCard(
        room.gameState,
        playerInfo.id,
        payload.cardId,
        payload.jokerOption,
        payload.requestedSuit,
      );

      // Handle trick completion
      if (room.gameState.phase === GamePhase.TrickComplete) {
        room.gameState = this.gameEngine.completeTrick(room.gameState);
      }

      // Handle round completion
      if (room.gameState.phase === GamePhase.RoundComplete) {
        room.gameState = this.gameEngine.completeRound(room.gameState);
      }

      // Handle pulka completion
      if (room.gameState.phase === GamePhase.PulkaComplete) {
        room.gameState = this.gameEngine.completePulka(room.gameState);
        // Start recap timer
        this.startPulkaRecapTimer(room.id);
      }

      await this.roomManager.updateGameState(room.id, room.gameState);
      await this.emitGameState(room.id);

      // Check if game finished (should wait for PulkaComplete first now, so this might move)
      if (room.gameState.phase === GamePhase.Finished) {
        await this.handleGameFinished(room.id);
      } else if (room.gameState.phase !== GamePhase.PulkaComplete) {
        // Only start turn timer if NOT in PulkaComplete (recap)
        this.startTurnTimer(room.id);
        await this.processBotTurn(room.id);
      }
    } catch (err) {
      client.emit('error', { code: 'INVALID_MOVE', message: (err as Error).message });
    }
  }

  /**
   * Start pulka recap timer
   */
  private startPulkaRecapTimer(roomId: string): void {
    // Clear existing turn timer just in case
    this.roomManager.clearTurnTimeout(roomId);

    // Emit timer event (using same event structure or new one?)
    // Let's use a new event for clarity or repurpose turn_timer
    // But turn_timer is specific to a player. This is global.
    this.server.to(roomId).emit('pulka_recap_started', {
      expiresAt: Date.now() + GAME_CONSTANTS.PULKA_RECAP_TIMEOUT_MS,
    });

    const timeout = setTimeout(async () => {
      await this.handlePulkaRecapTimeout(roomId);
    }, GAME_CONSTANTS.PULKA_RECAP_TIMEOUT_MS);

    // We can reuse setTurnTimeout or create a new one in RoomManager.
    // For simplicity, let's reuse setTurnTimeout as it effectively blocks turns.
    this.roomManager.setTurnTimeout(roomId, timeout);
  }

  /**
   * Handle pulka recap timeout - proceed to next round
   */
  private async handlePulkaRecapTimeout(roomId: string): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room || room.gameState.phase !== GamePhase.PulkaComplete) return;

    try {
      // Advance game state
      room.gameState = this.gameEngine.startNextPulka(room.gameState);
      await this.roomManager.updateGameState(roomId, room.gameState);
      await this.emitGameState(roomId);

      if (room.gameState.phase === GamePhase.Finished) {
        await this.handleGameFinished(roomId);
      } else {
        this.startTurnTimer(roomId);
        await this.processBotTurn(roomId);
      }
    } catch (error) {
      this.logger.error(`Error handling pulka recap timeout: ${(error as Error).message}`);
    }
  }

  /**
   * Emit game state to all players in room
   */
  private async emitGameState(roomId: string): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    // Create sanitized state for each player (hide other hands)
    for (const [playerId, socketId] of room.sockets) {
      if (!socketId) continue;

      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) continue;

      // Clone state and filter hands
      const playerState = this.sanitizeStateForPlayer(room.gameState, playerId);
      const playerHand = room.gameState.players.find((p) => p.id === playerId)?.hand ?? [];
      socket.emit('game_state', { state: playerState, yourHand: playerHand, roomId });
    }
  }

  /**
   * Sanitize state - hide other players' hands
   */
  private sanitizeStateForPlayer(state: GameState, playerId: string): GameState {
    return {
      ...state,
      players: state.players.map((p) => ({
        ...p,
        hand: p.id === playerId ? p.hand : [], // Only show own hand
      })),
    };
  }

  /**
   * Start turn timer
   */
  private startTurnTimer(roomId: string): void {
    this.roomManager.clearTurnTimeout(roomId);

    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    const currentPlayerId = room.gameState.players[room.gameState.currentPlayerIndex]?.id;
    if (!currentPlayerId || this.roomManager.isBot(currentPlayerId)) return;

    // Emit timer started event
    const socketId = this.roomManager.getSocketId(roomId, currentPlayerId);
    if (socketId) {
      this.server.to(roomId).emit('turn_timer_started', {
        playerId: currentPlayerId,
        expiresAt: Date.now() + GAME_CONSTANTS.TURN_TIMEOUT_MS,
      });
    }

    const timeout = setTimeout(() => {
      this.handleTurnTimeout(roomId, currentPlayerId);
    }, GAME_CONSTANTS.TURN_TIMEOUT_MS);

    this.roomManager.setTurnTimeout(roomId, timeout);
  }

  /**
   * Handle turn timeout - replace with bot
   */
  private async handleTurnTimeout(roomId: string, playerId: string): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    const playerName = room.gameState.players.find((p) => p.id === playerId)?.name;

    // Replace with bot
    const newState = await this.roomManager.replaceWithBot(roomId, playerId);
    if (newState) {
      room.gameState = newState;

      this.server.to(roomId).emit('player_replaced_by_bot', {
        playerId,
        playerName: playerName || 'Unknown',
      });

      await this.emitGameState(roomId);
      await this.processBotTurn(roomId);
    }
  }

  /**
   * Process bot turn
   */
  private async processBotTurn(roomId: string): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    if (!currentPlayer || !currentPlayer.isBot) return;

    // Add small delay for UX
    setTimeout(async () => {
      await this.makeBotMove(roomId, currentPlayer.id);
    }, 1000);
  }

  /**
   * Make bot move
   */
  private async makeBotMove(roomId: string, botId: string): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    const bot = room.gameState.players.find((p) => p.id === botId);
    if (!bot) return;

    try {
      switch (room.gameState.phase) {
        case GamePhase.TrumpSelection:
          // Bot picks random trump or no trump
          const trump = this.botService.selectTrump();
          room.gameState = this.gameEngine.selectTrump(room.gameState, botId, trump);
          break;

        case GamePhase.Betting:
          // Bot makes bet using BotService
          const bet = this.botService.makeBet(room.gameState, botId);
          room.gameState = this.gameEngine.makeBet(room.gameState, botId, bet);
          break;

        case GamePhase.Playing:
          // Bot plays card using BotService
          const move = this.botService.makeMove(room.gameState, botId);

          room.gameState = this.gameEngine.playCard(
            room.gameState,
            botId,
            move.cardId,
            move.jokerOption,
            move.requestedSuit,
          );
          break;
      }

      // Handle completions
      if (room.gameState.phase === GamePhase.TrickComplete) {
        room.gameState = this.gameEngine.completeTrick(room.gameState);
      }
      if (room.gameState.phase === GamePhase.RoundComplete) {
        room.gameState = this.gameEngine.completeRound(room.gameState);
      }
      if (room.gameState.phase === GamePhase.PulkaComplete) {
        room.gameState = this.gameEngine.completePulka(room.gameState);
        this.startPulkaRecapTimer(roomId);
      }

      await this.roomManager.updateGameState(room.id, room.gameState);
      await this.emitGameState(roomId);

      if (room.gameState.phase === GamePhase.Finished) {
        await this.handleGameFinished(roomId);
      } else if (room.gameState.phase !== GamePhase.PulkaComplete) {
        this.startTurnTimer(roomId);
        await this.processBotTurn(roomId);
      }
    } catch (err) {
      this.logger.error(`Bot error: ${(err as Error).message}`);
    }
  }

  /**
   * Handle game finished
   */
  private async handleGameFinished(roomId: string): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    this.logger.log(`Game finished in room ${roomId}. Winner: ${room.gameState.winnerId}`);

    this.server.to(roomId).emit('game_finished', {
      winnerId: room.gameState.winnerId,
      finalScores: room.gameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.totalScore,
      })),
    });

    // Sync final state to Redis before cleanup
    await this.roomManager.syncToRedis(roomId);

    // Cleanup after delay
    setTimeout(async () => {
      await this.roomManager.cleanupRoom(roomId);
    }, 30000);
  }
}
