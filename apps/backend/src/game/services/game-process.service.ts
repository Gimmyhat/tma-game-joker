import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import {
  GamePhase,
  GAME_CONSTANTS,
  GameState,
  TrumpDecision,
  PlayerBadges,
  hasJokersInHand,
} from '@joker/shared';
import { GameEngineService } from './game-engine.service';
import { RoomManager } from './room.manager';
import { BotService } from '../../bot/bot.service';
import { GameAuditService } from './game-audit.service';

@Injectable()
export class GameProcessService {
  private readonly logger = new Logger(GameProcessService.name);
  private server!: Server;
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private botFillTimer: NodeJS.Timeout | null = null;

  constructor(
    private gameEngine: GameEngineService,
    private roomManager: RoomManager,
    private botService: BotService,
    private configService: ConfigService,
    private gameAuditService: GameAuditService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * Process user bet
   */
  async processUserBet(roomId: string, playerId: string, amount: number): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.gameState = this.gameEngine.makeBet(room.gameState, playerId, amount);
    await this.roomManager.updateGameState(room.id, room.gameState);

    await this.emitGameState(room.id);
    this.startTurnTimer(room.id);
    await this.processBotTurn(room.id);
  }

  /**
   * Process user trump selection
   */
  async processUserTrump(roomId: string, playerId: string, decision: TrumpDecision): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.gameState = this.gameEngine.selectTrump(room.gameState, playerId, decision);
    await this.roomManager.updateGameState(room.id, room.gameState);

    await this.emitGameState(room.id);
    this.startTurnTimer(room.id);
    await this.processBotTurn(room.id);
  }

  /**
   * Process user card throw
   */
  async processUserCard(
    roomId: string,
    playerId: string,
    cardId: string,
    jokerOption?: any,
    requestedSuit?: any,
  ): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) {
      throw new Error('Room not found');
    }

    room.gameState = this.gameEngine.playCard(
      room.gameState,
      playerId,
      cardId,
      jokerOption,
      requestedSuit,
    );

    // Handle trick completion (with delay)
    if (room.gameState.phase === GamePhase.TrickComplete) {
      // Send state with TrickComplete phase so users see the table
      await this.roomManager.updateGameState(room.id, room.gameState);
      await this.emitGameState(room.id);

      this.handleTrickCompletionWithDelay(room.id);
    } else {
      await this.handlePostMoveTransitions(room.id);
    }
  }

  /**
   * Leave current game room and replace with bot
   */
  async handleLeaveGame(
    playerId: string,
    playerName: string,
  ): Promise<{ roomId: string | null; playersCount?: number } | null> {
    const room = await this.roomManager.getRoomByPlayerId(playerId);
    if (!room) {
      this.roomManager.removeFromQueue(playerId);
      return { roomId: null };
    }

    await this.roomManager.replaceWithBot(room.id, playerId);

    this.server.to(room.id).emit('player_left', {
      playerId,
      playerName,
      playersCount: room.gameState.players.length,
    });

    await this.emitGameState(room.id);
    this.startTurnTimer(room.id);
    await this.processBotTurn(room.id);

    return { roomId: room.id, playersCount: room.gameState.players.length };
  }

  /**
   * Handle player disconnect
   */
  async handleDisconnect(playerId: string): Promise<void> {
    await this.roomManager.handleDisconnect(playerId);
    this.startReconnectTimeout(playerId);
  }

  /**
   * Handle new connection and reconcile reconnection state
   */
  async handleConnection(playerId: string, socketId: string): Promise<string | null> {
    const room = await this.roomManager.getRoomByPlayerId(playerId);
    if (!room) return null;

    await this.roomManager.updateSocketId(playerId, socketId);
    this.clearReconnectTimeout(playerId);

    const player = room.gameState.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = true;
      await this.emitGameState(room.id);
    }

    return room.id;
  }

  /**
   * Add player to matchmaking queue and start game if ready
   */
  async handleFindGame(
    playerId: string,
    playerName: string,
    socketId: string,
  ): Promise<'already_in_game' | 'queued' | 'started'> {
    const existingRoom = await this.roomManager.getRoomByPlayerId(playerId);
    if (existingRoom) {
      return 'already_in_game';
    }

    this.roomManager.addToQueue(playerId, playerName, socketId);
    this.logger.log(`${playerName} joined queue. Queue size: ${this.roomManager.getQueueLength()}`);

    this.broadcastQueueStatus();

    if (this.roomManager.canStartGame()) {
      this.clearBotFillTimer();
      await this.startGame();
      return 'started';
    }

    if (this.roomManager.getQueueLength() === 1 && !this.botFillTimer) {
      this.startBotFillTimer();
    }

    return 'queued';
  }

  /**
   * Remove player from matchmaking queue
   */
  handleLeaveQueue(playerId: string): void {
    this.roomManager.removeFromQueue(playerId);
    if (this.roomManager.getQueueLength() === 0) {
      this.clearBotFillTimer();
    }

    this.broadcastQueueStatus();
  }

  /**
   * Broadcast queue status to all queued players
   */
  private broadcastQueueStatus(): void {
    const sockets = this.roomManager.getQueueSockets();
    const current = this.roomManager.getQueueLength();
    const required = GAME_CONSTANTS.PLAYERS_COUNT;

    for (const socketId of sockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('waiting_for_players', {
          roomId: 'queue',
          current,
          required,
        });
      }
    }
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

    this.logger.log(`Bot fill timer started (${timeoutMs}ms)`);
  }

  /**
   * Start game with queued players
   */
  async startGame(): Promise<void> {
    const result = await this.roomManager.createRoom();
    if (!result) return;

    const { room, tuzovanieCards, tuzovanieSequence, tuzovanieAcePlayerId } = result;

    // Join sockets to room
    for (const [, socketId] of room.sockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(room.id);
      }
    }

    // Emit tuzovanie event
    this.server.to(room.id).emit('tuzovanie_started', {
      cardsDealt: tuzovanieCards,
      dealSequence: tuzovanieSequence,
      dealerIndex: room.gameState.dealerIndex,
      players: room.gameState.players.map((p) => ({ id: p.id, name: p.name })),
    });

    this.gameAuditService.logAction(room.id, 'TUZOVANIE', 'system', {
      dealerIndex: room.gameState.dealerIndex,
      dealerPlayerId:
        tuzovanieAcePlayerId ?? room.gameState.players[room.gameState.dealerIndex]?.id ?? null,
      dealSequence: tuzovanieSequence,
    });

    this.logger.log(
      `Tuzovanie started in room ${room.id}. Dealer: ${room.gameState.dealerIndex}, Cards: ${JSON.stringify(tuzovanieCards)}`,
    );

    // Calculate delay: count total cards dealt * 600ms (frontend anim) + 4000ms buffer
    const totalCards = tuzovanieSequence.length;
    const delayMs = totalCards * 600 + 4000;

    setTimeout(async () => {
      // Check if room still exists (players might disconnect)
      const currentRoom = this.roomManager.getRoomSync(room.id);
      if (!currentRoom) return;

      // Start the game logic
      currentRoom.gameState = this.gameEngine.startGame(currentRoom.gameState);
      await this.roomManager.updateGameState(currentRoom.id, currentRoom.gameState);

      // Notify start
      this.server.to(currentRoom.id).emit('game_started', { roomId: currentRoom.id });

      this.logger.log(`Game started in room ${currentRoom.id}`);
      await this.emitGameState(currentRoom.id);
      this.startTurnTimer(currentRoom.id);
    }, delayMs);
  }

  /**
   * Start game with bots
   */
  async startGameWithBots(): Promise<void> {
    const result = await this.roomManager.createRoomWithBots();
    if (!result) return;

    const { room, tuzovanieCards, tuzovanieSequence, tuzovanieAcePlayerId } = result;

    // Join sockets to room
    for (const [, socketId] of room.sockets) {
      if (!socketId) continue; // Skip bots
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket) {
        socket.join(room.id);
      }
    }

    // Emit tuzovanie event
    this.server.to(room.id).emit('tuzovanie_started', {
      cardsDealt: tuzovanieCards,
      dealSequence: tuzovanieSequence,
      dealerIndex: room.gameState.dealerIndex,
      players: room.gameState.players.map((p) => ({ id: p.id, name: p.name })),
    });

    this.gameAuditService.logAction(room.id, 'TUZOVANIE', 'system', {
      dealerIndex: room.gameState.dealerIndex,
      dealerPlayerId:
        tuzovanieAcePlayerId ?? room.gameState.players[room.gameState.dealerIndex]?.id ?? null,
      dealSequence: tuzovanieSequence,
    });

    this.logger.log(
      `Tuzovanie started in room ${room.id} with bots. Dealer: ${room.gameState.dealerIndex}, Cards: ${JSON.stringify(tuzovanieCards)}`,
    );

    // Calculate delay: count total cards dealt * 600ms (frontend anim) + 4000ms buffer
    const totalCards = tuzovanieSequence.length;
    const delayMs = totalCards * 600 + 4000;

    setTimeout(async () => {
      // Check if room still exists
      const currentRoom = this.roomManager.getRoomSync(room.id);
      if (!currentRoom) return;

      // Start the game
      currentRoom.gameState = this.gameEngine.startGame(currentRoom.gameState);
      await this.roomManager.updateGameState(currentRoom.id, currentRoom.gameState);

      // Notify start
      this.server.to(currentRoom.id).emit('game_started', { roomId: currentRoom.id });

      this.logger.log(`Game started in room ${currentRoom.id} with bots`);
      await this.emitGameState(currentRoom.id);
      this.startTurnTimer(currentRoom.id);

      // If it's a bot's turn, make bot move
      await this.processBotTurn(currentRoom.id);
    }, delayMs);
  }

  /**
   * Process bot turn
   */
  async processBotTurn(roomId: string): Promise<void> {
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
        case GamePhase.TrumpSelection: {
          // Bot picks trump using BotService
          const decision = this.botService.selectTrumpDecision(room.gameState, botId);
          room.gameState = this.gameEngine.selectTrump(room.gameState, botId, decision);
          break;
        }

        case GamePhase.Betting: {
          // Bot makes bet using BotService
          const bet = this.botService.makeBet(room.gameState, botId);
          room.gameState = this.gameEngine.makeBet(room.gameState, botId, bet);
          break;
        }

        case GamePhase.Playing: {
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
      }

      // Handle completions
      if (room.gameState.phase === GamePhase.TrickComplete) {
        // Send state with TrickComplete phase so users see the table
        await this.roomManager.updateGameState(room.id, room.gameState);
        await this.emitGameState(room.id);

        this.handleTrickCompletionWithDelay(room.id);
      } else {
        await this.handlePostMoveTransitions(room.id);
      }
    } catch (err) {
      this.logger.error(`Bot error: ${(err as Error).message}`);
    }
  }

  /**
   * Handle trick completion with delay
   */
  handleTrickCompletionWithDelay(roomId: string): void {
    // Set a timeout to complete the trick
    const delay = GAME_CONSTANTS.TRICK_RECAP_TIMEOUT_MS || 2000;

    setTimeout(async () => {
      const room = this.roomManager.getRoomSync(roomId);
      if (!room || room.gameState.phase !== GamePhase.TrickComplete) return;

      try {
        // Complete trick
        room.gameState = this.gameEngine.completeTrick(room.gameState);
        await this.handlePostMoveTransitions(roomId);
      } catch (err) {
        this.logger.error(`Error completing trick: ${(err as Error).message}`);
      }
    }, delay);
  }

  async handlePostMoveTransitions(roomId: string): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room || room.gameState.phase === GamePhase.TrickComplete) return;

    if (room.gameState.phase === GamePhase.RoundComplete) {
      room.gameState = this.gameEngine.completeRound(room.gameState);
    }

    if (room.gameState.phase === GamePhase.PulkaComplete) {
      room.gameState = this.gameEngine.completePulka(room.gameState);
      // Save game state at the end of each Pulka
      await this.gameAuditService.saveGameRecord(room.gameState);
      this.startPulkaRecapTimer(roomId);
    }

    await this.roomManager.updateGameState(room.id, room.gameState);
    await this.emitGameState(room.id);

    if (room.gameState.phase === GamePhase.Finished) {
      await this.handleGameFinished(room.id);
    } else if (room.gameState.phase !== GamePhase.PulkaComplete) {
      this.startTurnTimer(room.id);
      await this.processBotTurn(room.id);
    }
  }

  /**
   * Start pulka recap timer
   */
  private startPulkaRecapTimer(roomId: string): void {
    // Clear existing turn timer just in case
    this.roomManager.clearTurnTimeout(roomId);

    const timeoutMs =
      Number(this.configService.get('PULKA_RECAP_TIMEOUT_MS')) ||
      GAME_CONSTANTS.PULKA_RECAP_TIMEOUT_MS;

    // Emit timer event
    this.server.to(roomId).emit('pulka_recap_started', {
      expiresAt: Date.now() + timeoutMs,
    });

    const timeout = setTimeout(async () => {
      await this.handlePulkaRecapTimeout(roomId);
    }, timeoutMs);

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

    // Save game record to DB (Audit Log)
    await this.gameAuditService.saveGameRecord(room.gameState);

    // Sync final state to Redis before cleanup
    await this.roomManager.syncToRedis(roomId);

    // Cleanup after delay
    setTimeout(async () => {
      await this.roomManager.cleanupRoom(roomId);
    }, 30000);
  }

  /**
   * Start turn timer
   */
  startTurnTimer(roomId: string): void {
    this.roomManager.clearTurnTimeout(roomId);

    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    const currentPlayerId = room.gameState.players[room.gameState.currentPlayerIndex]?.id;
    if (!currentPlayerId || this.roomManager.isBot(currentPlayerId)) return;

    // Get timeout from config or default
    const timeoutMs =
      room.gameState.turnTimeoutMs ??
      (Number(this.configService.get('TURN_TIMEOUT_MS')) || GAME_CONSTANTS.TURN_TIMEOUT_MS);

    // Emit timer started event
    const socketId = this.roomManager.getSocketId(roomId, currentPlayerId);
    if (socketId) {
      this.server.to(roomId).emit('turn_timer_started', {
        playerId: currentPlayerId,
        expiresAt: Date.now() + timeoutMs,
      });
    }

    const timeout = setTimeout(() => {
      this.handleTurnTimeout(roomId, currentPlayerId);
    }, timeoutMs);

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

      this.server.to(roomId).emit('player_replaced', {
        playerId,
        playerName: playerName || 'Unknown',
      });

      await this.emitGameState(roomId);
      await this.processBotTurn(roomId);
    }
  }

  /**
   * Emit game state to all players in room
   */
  async emitGameState(roomId: string): Promise<void> {
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
   * Sanitize state - hide other players' hands and add computed badges
   */
  private sanitizeStateForPlayer(state: GameState, playerId: string): GameState {
    const isPulkaComplete = state.phase === GamePhase.PulkaComplete;

    return {
      ...state,
      players: state.players.map((p) => {
        const isOwnHand = p.id === playerId;

        // Calculate badges for this player
        const badges: PlayerBadges = {
          // Only show joker badge for own hand (other players' jokers hidden)
          hasJokers: isOwnHand ? hasJokersInHand(p.hand) : false,
          // Spoiled is visible to everyone
          spoiled: p.spoiled,
          // Perfect pulka only shown at pulka completion
          perfectPulka: isPulkaComplete && !p.spoiled,
          // Achievements are visible to everyone
          tookAll: p.tookAllInPulka ?? false,
          perfectPass: p.perfectPassInPulka ?? false,
        };

        return {
          ...p,
          hand: isOwnHand ? p.hand : [], // Only show own hand
          badges,
        };
      }),
    };
  }

  startReconnectTimeout(playerId: string): void {
    if (this.roomManager.isBot(playerId)) return;

    const room = this.roomManager.getRoomByPlayerIdSync(playerId);
    if (!room) return;

    this.clearReconnectTimeout(playerId);

    const timeoutMs =
      Number(this.configService.get('RECONNECT_TIMEOUT_MS')) || GAME_CONSTANTS.RECONNECT_TIMEOUT_MS;

    const timeout = setTimeout(async () => {
      this.clearReconnectTimeout(playerId);

      const currentRoom = this.roomManager.getRoomByPlayerIdSync(playerId);
      if (!currentRoom) return;

      const player = currentRoom.gameState.players.find((p) => p.id === playerId);
      if (!player || player.connected) return;

      const newState = await this.roomManager.replaceWithBot(currentRoom.id, playerId);
      if (!newState) return;

      currentRoom.gameState = newState;

      this.server.to(currentRoom.id).emit('player_replaced', {
        playerId,
        playerName: player.name,
      });

      await this.emitGameState(currentRoom.id);
      await this.processBotTurn(currentRoom.id);
    }, timeoutMs);

    this.reconnectTimeouts.set(playerId, timeout);
  }

  clearReconnectTimeout(playerId: string): void {
    const timeout = this.reconnectTimeouts.get(playerId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(playerId);
    }
  }
}
