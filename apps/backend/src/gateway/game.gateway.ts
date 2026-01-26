import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MakeBetPayload,
  ThrowCardPayload,
  SelectTrumpPayload,
  GAME_CONSTANTS,
} from '@joker/shared';
import { RoomManager } from '../game/services/room.manager';
import { GameProcessService } from '../game/services/game-process.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseGuards(TelegramAuthGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);

  // Map socket.id -> { playerId, playerName }
  private socketToPlayer: Map<string, { id: string; name: string }> = new Map();

  // Bot fill timer (before room is created)
  private botFillTimer: NodeJS.Timeout | null = null;

  constructor(
    private roomManager: RoomManager,
    private gameProcess: GameProcessService,
    private configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.gameProcess.setServer(server);
  }

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
    client.onAny((event) => {
      this.logger.log(`[DEBUG] Received event: ${event} from ${client.id}`);
    });

    // Check if player was in a game (reconnection)
    const room = await this.roomManager.getRoomByPlayerId(userId);
    if (room) {
      await this.roomManager.updateSocketId(userId, client.id);
      client.join(room.id);

      this.gameProcess.clearReconnectTimeout(userId);

      // Mark player as connected
      const player = room.gameState.players.find((p) => p.id === userId);
      if (player) {
        player.connected = true;
        await this.gameProcess.emitGameState(room.id);
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
      await this.roomManager.handleDisconnect(playerInfo.id);
      this.socketToPlayer.delete(client.id);
      this.gameProcess.startReconnectTimeout(playerInfo.id);
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

    // Notify all queued players
    this.broadcastQueueStatus();

    // Check if enough players
    if (this.roomManager.canStartGame()) {
      this.clearBotFillTimer();
      await this.gameProcess.startGame();
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

    // Notify remaining queued players
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
    await this.gameProcess.emitGameState(room.id);
    this.gameProcess.startTurnTimer(room.id);
    await this.gameProcess.processBotTurn(room.id);
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
        await this.gameProcess.startGameWithBots();
      }
      this.botFillTimer = null;
    }, timeoutMs);

    this.logger.log(`Bot fill timer started (${timeoutMs}ms)`);
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

    try {
      await this.gameProcess.processUserTrump(payload.roomId, playerInfo.id, payload.trump);
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

    try {
      await this.gameProcess.processUserBet(payload.roomId, playerInfo.id, payload.amount);
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

    try {
      await this.gameProcess.processUserCard(
        payload.roomId,
        playerInfo.id,
        payload.cardId,
        payload.jokerOption,
        payload.requestedSuit,
      );
    } catch (err) {
      client.emit('error', { code: 'INVALID_MOVE', message: (err as Error).message });
    }
  }
}
