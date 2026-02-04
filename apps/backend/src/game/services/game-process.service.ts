import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'socket.io';
import {
  GamePhase,
  GAME_CONSTANTS,
  GameState,
  TrumpDecision,
  calculatePlayerBadges,
  GameFinishedPayload,
  JokerOption,
  Suit,
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
  private frozenRoomTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private botFillTimer: NodeJS.Timeout | null = null;
  private readonly frozenRooms: Set<string> = new Set();

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

  private countConnectedHumans(state: GameState): number {
    return state.players.filter((player) => !player.isBot && player.connected).length;
  }

  private countActiveHumans(state: GameState): number {
    // Active = connected AND not on autopilot
    return state.players.filter(
      (player) => !player.isBot && player.connected && !player.controlledByBot,
    ).length;
  }

  private countHumanPlayers(state: GameState): number {
    return state.players.filter((player) => !player.isBot).length;
  }

  private shouldFreezeTimers(state: GameState): boolean {
    // Freeze when only 1 active human remains (playing alone vs bots)
    // Don't freeze if there are 0 - that means all are on autopilot, bots should play
    return this.countActiveHumans(state) === 1;
  }

  private clearReconnectTimeouts(state: GameState): void {
    for (const player of state.players) {
      if (!player.isBot) {
        this.clearReconnectTimeout(player.id);
      }
    }
  }

  private setRoomFrozen(roomId: string, frozen: boolean): void {
    if (frozen) {
      if (!this.frozenRooms.has(roomId)) {
        this.frozenRooms.add(roomId);
        this.logger.log(`Timers frozen in room ${roomId} (single human remaining)`);
      }
      return;
    }

    if (this.frozenRooms.delete(roomId)) {
      this.logger.log(`Timers resumed in room ${roomId}`);
    }
  }

  private clearFrozenRoom(roomId: string): void {
    this.frozenRooms.delete(roomId);
    this.clearFrozenRoomTimeout(roomId);
  }

  private freezeTimersIfSingleHuman(roomId: string, state: GameState): void {
    if (!this.shouldFreezeTimers(state)) return;
    this.setRoomFrozen(roomId, true);
    this.roomManager.clearTurnTimeout(roomId);
    this.clearReconnectTimeouts(state);
    // Note: Do NOT start frozen room timeout here - that's only for when ALL humans are disconnected
    // This method is for UX (single human doesn't need timer pressure)
  }

  /**
   * Start timeout to close frozen room if last human doesn't reconnect
   */
  private startFrozenRoomTimeout(roomId: string): void {
    this.clearFrozenRoomTimeout(roomId);

    const timeoutMs =
      Number(this.configService.get('FROZEN_ROOM_TIMEOUT_MS')) ||
      GAME_CONSTANTS.FROZEN_ROOM_TIMEOUT_MS;

    const timeout = setTimeout(async () => {
      this.clearFrozenRoomTimeout(roomId);

      const room = this.roomManager.getRoomSync(roomId);
      if (!room) return;

      // Check if still frozen (no human reconnected)
      if (!this.frozenRooms.has(roomId)) return;

      this.logger.log(`Frozen room ${roomId} timed out - closing (no human reconnected)`);
      this.clearFrozenRoom(roomId);
      await this.roomManager.cleanupRoom(roomId);
    }, timeoutMs);

    this.frozenRoomTimeouts.set(roomId, timeout);
    this.logger.log(`Frozen room timeout started for ${roomId} (${timeoutMs}ms)`);
  }

  private clearFrozenRoomTimeout(roomId: string): void {
    const timeout = this.frozenRoomTimeouts.get(roomId);
    if (timeout) {
      clearTimeout(timeout);
      this.frozenRoomTimeouts.delete(roomId);
    }
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
    jokerOption?: JokerOption,
    requestedSuit?: Suit,
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

    const leavingPlayer = room.gameState.players.find((p) => p.id === playerId);
    const isLeavingHuman = leavingPlayer ? !leavingPlayer.isBot : false;
    if (isLeavingHuman && this.countHumanPlayers(room.gameState) <= 1) {
      this.clearReconnectTimeouts(room.gameState);
      this.clearFrozenRoom(room.id);
      this.logger.log(`Room ${room.id} closed (last human left)`);
      await this.roomManager.cleanupRoom(room.id);
      return { roomId: room.id, playersCount: 0 };
    }

    await this.roomManager.replaceWithBot(room.id, playerId);
    this.freezeTimersIfSingleHuman(room.id, room.gameState);

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
   * Handle player disconnect - enable autopilot for this player
   */
  async handleDisconnect(playerId: string): Promise<void> {
    // Check if player was in queue BEFORE removing
    const wasInQueue = this.roomManager.isInQueue(playerId);

    await this.roomManager.handleDisconnect(playerId);

    // If player was in queue, manage bot fill timer
    if (wasInQueue) {
      if (this.roomManager.getQueueLength() === 0) {
        this.clearBotFillTimer();
      }
      this.broadcastQueueStatus();
      return;
    }

    // Handle room disconnect logic
    const room = this.roomManager.getRoomByPlayerIdSync(playerId);
    if (!room) return;

    const player = room.gameState.players.find((p) => p.id === playerId);
    if (player && !player.isBot) {
      // Enable autopilot for disconnected human
      player.controlledByBot = true;
      this.logger.log(`Player ${playerId} disconnected - autopilot enabled`);

      // Check if ALL humans are now disconnected
      const connectedHumans = room.gameState.players.filter((p) => !p.isBot && p.connected);
      if (connectedHumans.length === 0) {
        // No humans left watching - start room cleanup timeout
        this.startFrozenRoomTimeout(room.id);
      }

      await this.emitGameState(room.id);

      // If it's this player's turn, trigger bot to act immediately
      const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
      if (currentPlayer && currentPlayer.id === playerId) {
        await this.processBotTurn(room.id);
      }
    }
  }

  /**
   * Handle new connection and reconcile reconnection state
   */
  async handleConnection(playerId: string, socketId: string): Promise<string | null> {
    const room = await this.roomManager.getRoomByPlayerId(playerId);
    if (!room) return null;

    await this.roomManager.updateSocketId(playerId, socketId);
    this.clearReconnectTimeout(playerId);

    // If room was frozen (all humans disconnected), unfreeze it
    if (this.frozenRooms.has(room.id)) {
      this.logger.log(`Human reconnected to frozen room ${room.id} - resuming game`);
      this.clearFrozenRoom(room.id);
      // Don't call startTurnTimer here - it will re-freeze for single human
      // The game will continue when player makes their move
    }

    const player = room.gameState.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = true;
      // Disable autopilot - player takes control back
      if (player.controlledByBot) {
        player.controlledByBot = false;
        this.logger.log(`Player ${playerId} reconnected - autopilot disabled`);
      }
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

    // Start timer if there are players in queue and timer isn't running
    if (this.roomManager.getQueueLength() > 0 && !this.botFillTimer) {
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

    const {
      room,
      tuzovanieCards,
      tuzovanieSequence,
      tuzovanieAcePlayerId,
      tuzovanieStartIndex,
      tuzovanieStartPlayerId,
    } = result;

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
      startIndex: tuzovanieStartIndex,
      startPlayerId: tuzovanieStartPlayerId,
      dealSequence: tuzovanieSequence,
    });

    this.logger.log(
      `Tuzovanie started in room ${room.id}. Dealer: ${room.gameState.dealerIndex}, Cards: ${JSON.stringify(tuzovanieCards)}`,
    );

    // Calculate delay: total cards dealt * TUZOVANIE_CARD_DELAY_MS + buffer
    const totalCards = tuzovanieSequence.length;
    const delayMs =
      totalCards * GAME_CONSTANTS.TUZOVANIE_CARD_DELAY_MS + GAME_CONSTANTS.TUZOVANIE_BUFFER_MS;

    setTimeout(async () => {
      try {
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
      } catch (error) {
        this.logger.error(`Error starting game in room ${room.id}:`, error);
      }
    }, delayMs);
  }

  /**
   * Start game with bots
   */
  async startGameWithBots(): Promise<void> {
    const result = await this.roomManager.createRoomWithBots();
    if (!result) return;

    const {
      room,
      tuzovanieCards,
      tuzovanieSequence,
      tuzovanieAcePlayerId,
      tuzovanieStartIndex,
      tuzovanieStartPlayerId,
    } = result;

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
      startIndex: tuzovanieStartIndex,
      startPlayerId: tuzovanieStartPlayerId,
      dealSequence: tuzovanieSequence,
    });

    this.logger.log(
      `Tuzovanie started in room ${room.id} with bots. Dealer: ${room.gameState.dealerIndex}, Cards: ${JSON.stringify(tuzovanieCards)}`,
    );

    // Calculate delay: total cards dealt * TUZOVANIE_CARD_DELAY_MS + buffer
    const totalCards = tuzovanieSequence.length;
    const delayMs =
      totalCards * GAME_CONSTANTS.TUZOVANIE_CARD_DELAY_MS + GAME_CONSTANTS.TUZOVANIE_BUFFER_MS;

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
   * Process bot turn (includes players on autopilot)
   */
  async processBotTurn(roomId: string): Promise<void> {
    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    const currentPlayer = room.gameState.players[room.gameState.currentPlayerIndex];
    // Act for actual bots OR players on autopilot
    if (!currentPlayer || (!currentPlayer.isBot && !currentPlayer.controlledByBot)) return;

    // Clear existing timeout if any
    this.roomManager.clearBotMoveTimeout(roomId);

    // Add small delay for UX
    const timeout = setTimeout(async () => {
      // Re-check room existence inside timeout to prevent race condition
      const currentRoom = this.roomManager.getRoomSync(roomId);
      if (!currentRoom) return;

      await this.makeBotMove(roomId, currentPlayer.id);
    }, GAME_CONSTANTS.BOT_MOVE_DELAY_MS);

    this.roomManager.setBotMoveTimeout(roomId, timeout);
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
    const delay = GAME_CONSTANTS.TRICK_RECAP_TIMEOUT_MS;

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
      remainingMs: timeoutMs,
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

    // Calculate detailed results
    const results = this.gameEngine.calculateFinalResultsDetailed(room.gameState);

    // Send personalized results to each player
    for (const [playerId, socketId] of room.sockets) {
      if (!socketId) continue;

      const socket = this.server.sockets.sockets.get(socketId);
      if (!socket) continue;

      const ranking = results.rankings.find((r) => r.playerId === playerId);
      // Default to 4th place if not found (should not happen)
      const yourPlace = ranking ? ranking.place : 4;
      const isVictory = yourPlace === 1;

      const payload: GameFinishedPayload = {
        results,
        yourPlace,
        isVictory,
      };

      // Emit new event (v2) with full detailed stats
      socket.emit('game:finished', payload);

      // Keep legacy event for backward compatibility until frontend is fully updated
      socket.emit('game_finished', {
        winnerId: room.gameState.winnerId,
        finalScores: room.gameState.players.map((p) => ({
          id: p.id,
          name: p.name,
          score: p.totalScore,
        })),
      });
    }

    // Save game record to DB (Audit Log)
    await this.gameAuditService.saveGameRecord(room.gameState);

    // Sync final state to Redis before cleanup
    await this.roomManager.syncToRedis(roomId);

    // Cleanup after delay
    setTimeout(async () => {
      await this.roomManager.cleanupRoom(roomId);
      this.clearFrozenRoom(roomId);
    }, GAME_CONSTANTS.GAME_CLEANUP_DELAY_MS);
  }

  /**
   * Start turn timer
   */
  startTurnTimer(roomId: string): void {
    this.roomManager.clearTurnTimeout(roomId);

    const room = this.roomManager.getRoomSync(roomId);
    if (!room) return;

    if (this.shouldFreezeTimers(room.gameState)) {
      this.freezeTimersIfSingleHuman(room.id, room.gameState);
      return;
    }

    this.setRoomFrozen(room.id, false);

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
        remainingMs: timeoutMs,
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

    if (this.shouldFreezeTimers(room.gameState)) {
      this.freezeTimersIfSingleHuman(roomId, room.gameState);
      return;
    }

    const playerName = room.gameState.players.find((p) => p.id === playerId)?.name;

    // Replace with bot
    const newState = await this.roomManager.replaceWithBot(roomId, playerId);
    if (newState) {
      room.gameState = newState;
      this.freezeTimersIfSingleHuman(roomId, room.gameState);

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
        const badges = calculatePlayerBadges(p, isPulkaComplete, isOwnHand);

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

    if (this.shouldFreezeTimers(room.gameState)) {
      this.freezeTimersIfSingleHuman(room.id, room.gameState);
      return;
    }

    this.setRoomFrozen(room.id, false);

    this.clearReconnectTimeout(playerId);

    const timeoutMs =
      Number(this.configService.get('RECONNECT_TIMEOUT_MS')) || GAME_CONSTANTS.RECONNECT_TIMEOUT_MS;

    const timeout = setTimeout(async () => {
      this.clearReconnectTimeout(playerId);

      const currentRoom = this.roomManager.getRoomByPlayerIdSync(playerId);
      if (!currentRoom) return;

      const player = currentRoom.gameState.players.find((p) => p.id === playerId);
      if (!player || player.connected) return;

      if (this.shouldFreezeTimers(currentRoom.gameState)) {
        this.freezeTimersIfSingleHuman(currentRoom.id, currentRoom.gameState);
        return;
      }

      const newState = await this.roomManager.replaceWithBot(currentRoom.id, playerId);
      if (!newState) return;

      currentRoom.gameState = newState;
      this.freezeTimersIfSingleHuman(currentRoom.id, currentRoom.gameState);

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
