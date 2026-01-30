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
import { MakeBetPayload, ThrowCardPayload, SelectTrumpPayload } from '@joker/shared';
import { GameProcessService } from '../game/services/game-process.service';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { ConnectionRegistryService } from './connection-registry.service';

/** Rate limit for throw_card: 1 card per 300ms */
const THROW_CARD_RATE_LIMIT_MS = 300;

@Injectable()
@WebSocketGateway({
  transports: ['polling', 'websocket'], // Allow polling for reliable fallback
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

  /** Track last throw_card timestamp per player for rate limiting */
  private lastThrowCardTime = new Map<string, number>();

  constructor(
    private connectionRegistry: ConnectionRegistryService,
    private gameProcess: GameProcessService,
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

    this.connectionRegistry.register(client.id, userId, userName);

    // DEBUG: Log all incoming events
    client.onAny((event) => {
      this.logger.log(`[DEBUG] Received event: ${event} from ${client.id}`);
    });

    // Check if player was in a game (reconnection)
    const roomId = await this.gameProcess.handleConnection(userId, client.id);
    if (roomId) {
      client.join(roomId);
      this.logger.log(`Player ${userId} reconnected to room ${roomId}`);
    }

    this.logger.log(`Client connected: ${client.id} (${userId})`);
  }

  /**
   * Handle disconnection
   */
  async handleDisconnect(client: Socket): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (playerInfo) {
      await this.gameProcess.handleDisconnect(playerInfo.id);
      this.connectionRegistry.unregister(client.id);
      // Clean up rate limit tracking
      this.lastThrowCardTime.delete(playerInfo.id);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Find game - join matchmaking queue
   */
  @SubscribeMessage('find_game')
  async handleFindGame(@ConnectedSocket() client: Socket): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) {
      client.emit('error', { code: 'NOT_REGISTERED', message: 'Connection not registered' });
      return;
    }

    const result = await this.gameProcess.handleFindGame(playerInfo.id, playerInfo.name, client.id);
    if (result === 'already_in_game') {
      client.emit('error', { code: 'ALREADY_IN_GAME', message: 'Already in a game' });
    }
  }

  /**
   * Leave matchmaking queue
   */
  @SubscribeMessage('leave_queue')
  async handleLeaveQueue(@ConnectedSocket() client: Socket): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) return;

    this.gameProcess.handleLeaveQueue(playerInfo.id);
    client.emit('queue_left', { playerId: playerInfo.id });
  }

  /**
   * Leave current game room
   */
  @SubscribeMessage('leave_game')
  async handleLeaveGame(@ConnectedSocket() client: Socket): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) return;

    const result = await this.gameProcess.handleLeaveGame(playerInfo.id, playerInfo.name);
    if (!result) return;

    if (!result.roomId) {
      client.emit('left_game', { playerId: playerInfo.id });
      return;
    }

    client.leave(result.roomId);
    client.emit('left_game', { roomId: result.roomId });
  }

  /**
   * Select trump (special rounds with partial deal)
   */
  @SubscribeMessage('select_trump')
  async handleSelectTrump(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectTrumpPayload,
  ): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) return;

    try {
      await this.gameProcess.processUserTrump(payload.roomId, playerInfo.id, payload.decision);
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
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) return;

    try {
      await this.gameProcess.processUserBet(payload.roomId, playerInfo.id, payload.amount);
    } catch (err) {
      client.emit('error', { code: 'INVALID_BET', message: (err as Error).message });
    }
  }

  /**
   * Throw card (rate limited: 1 card per 300ms)
   */
  @SubscribeMessage('throw_card')
  async handleThrowCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ThrowCardPayload,
  ): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) return;

    // Rate limiting check
    const now = Date.now();
    const lastTime = this.lastThrowCardTime.get(playerInfo.id) || 0;
    if (now - lastTime < THROW_CARD_RATE_LIMIT_MS) {
      client.emit('error', {
        code: 'RATE_LIMITED',
        message: `Please wait before throwing another card`,
      });
      return;
    }
    this.lastThrowCardTime.set(playerInfo.id, now);

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
