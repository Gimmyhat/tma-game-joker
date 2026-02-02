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
import { TelegramAuthGuard, VerifiedTelegramUser } from '../auth/guards/telegram-auth.guard';
import { ConnectionRegistryService } from './connection-registry.service';

/** Rate limit for throw_card: 1 card per 300ms */
const THROW_CARD_RATE_LIMIT_MS = 300;

/** Rate limit for general actions: 1 action per 500ms */
const ACTION_RATE_LIMIT_MS = 500;

/** Max actions per minute per user (P0-5) */
const MAX_ACTIONS_PER_MINUTE = 30;

/** Time window for action counting (1 minute) */
const ACTION_WINDOW_MS = 60_000;

/** Rate limit tracking data */
interface RateLimitData {
  lastActionTime: number;
  actionTimestamps: number[];
}

@Injectable()
@WebSocketGateway({
  transports: ['websocket'],
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

  /** P0-5: Track action rate limiting per player */
  private rateLimitData = new Map<string, RateLimitData>();

  constructor(
    private connectionRegistry: ConnectionRegistryService,
    private gameProcess: GameProcessService,
    private telegramAuthGuard: TelegramAuthGuard,
  ) {}

  afterInit(server: Server) {
    this.gameProcess.setServer(server);
  }

  /**
   * P0-5: Check rate limit for general actions
   * Returns true if action should be blocked
   */
  private isRateLimited(playerId: string, client: Socket): boolean {
    // Skip rate limiting in E2E tests to allow fast execution
    if (process.env.E2E_TEST === 'true' || process.env.NODE_ENV === 'test') {
      return false;
    }

    const now = Date.now();
    let data = this.rateLimitData.get(playerId);

    if (!data) {
      data = { lastActionTime: 0, actionTimestamps: [] };
      this.rateLimitData.set(playerId, data);
    }

    // Check minimum interval between actions
    if (now - data.lastActionTime < ACTION_RATE_LIMIT_MS) {
      client.emit('error', {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please slow down.',
      });
      return true;
    }

    // Clean old timestamps outside the window
    data.actionTimestamps = data.actionTimestamps.filter((ts) => now - ts < ACTION_WINDOW_MS);

    // Check max actions per minute
    if (data.actionTimestamps.length >= MAX_ACTIONS_PER_MINUTE) {
      client.emit('error', {
        code: 'RATE_LIMITED',
        message: 'Too many actions. Please wait a moment.',
      });
      return true;
    }

    // Record this action
    data.lastActionTime = now;
    data.actionTimestamps.push(now);

    return false;
  }

  /**
   * P0-1: Extract verified user from socket data (set by TelegramAuthGuard)
   * Falls back to query params only in dev mode for backward compatibility
   * On connection, validates initData directly since guards don't run on connect
   */
  private getVerifiedUser(client: Socket): { userId: string; userName: string } | null {
    // Priority 1: Use verified user from guard (P0-1 fix)
    const verifiedUser = client.data.verifiedUser as VerifiedTelegramUser | undefined;
    if (verifiedUser) {
      return {
        userId: String(verifiedUser.id),
        userName:
          verifiedUser.firstName + (verifiedUser.lastName ? ` ${verifiedUser.lastName}` : ''),
      };
    }

    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const skipAuth = process.env.SKIP_AUTH === 'true';

    // Priority 2: Query params in dev/test when SKIP_AUTH is enabled
    if (skipAuth && isDevelopment) {
      const userId = client.handshake.query.userId as string;
      const userName = (client.handshake.query.userName as string) || 'Player';
      if (userId) {
        return { userId, userName };
      }
    }

    // Priority 3: Validate initData on connection (guards don't run on handleConnection)
    const initData =
      (client.handshake.auth?.initData as string | undefined) ||
      (client.handshake.query.initData as string | undefined);

    if (initData) {
      const parsed = this.telegramAuthGuard.validateAndParseInitData(initData);
      if (parsed) {
        // Store for future message handlers
        client.data.verifiedUser = parsed;
        return {
          userId: String(parsed.id),
          userName: parsed.firstName + (parsed.lastName ? ` ${parsed.lastName}` : ''),
        };
      }
    }

    // Priority 4: Query params (only works if SKIP_AUTH was used in dev)
    // P0-1: Strictly disabled in production
    if (!isDevelopment) {
      return null;
    }

    const userId = client.handshake.query.userId as string;
    const userName = (client.handshake.query.userName as string) || 'Player';

    if (userId) {
      return { userId, userName };
    }

    return null;
  }

  /**
   * Handle new connection
   * P0-1: Uses verified user from initData instead of query params
   */
  async handleConnection(client: Socket): Promise<void> {
    const userInfo = this.getVerifiedUser(client);

    if (!userInfo) {
      client.emit('error', { code: 'NO_USER_ID', message: 'Authentication required' });
      client.disconnect();
      return;
    }

    const { userId, userName } = userInfo;

    this.connectionRegistry.register(client.id, userId, userName);

    // Initialize rate limit data
    this.rateLimitData.set(userId, { lastActionTime: 0, actionTimestamps: [] });

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
      this.rateLimitData.delete(playerInfo.id);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Find game - join matchmaking queue
   * P0-5: Rate limited
   */
  @SubscribeMessage('find_game')
  async handleFindGame(@ConnectedSocket() client: Socket): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) {
      client.emit('error', { code: 'NOT_REGISTERED', message: 'Connection not registered' });
      return;
    }

    // P0-5: Check rate limit
    if (this.isRateLimited(playerInfo.id, client)) {
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
   * P0-5: Rate limited
   */
  @SubscribeMessage('select_trump')
  async handleSelectTrump(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectTrumpPayload,
  ): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) return;

    // P0-5: Check rate limit
    if (this.isRateLimited(playerInfo.id, client)) {
      return;
    }

    try {
      await this.gameProcess.processUserTrump(payload.roomId, playerInfo.id, payload.decision);
    } catch (err) {
      client.emit('error', { code: 'INVALID_TRUMP', message: (err as Error).message });
    }
  }

  /**
   * Make bet
   * P0-5: Rate limited
   */
  @SubscribeMessage('make_bet')
  async handleMakeBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MakeBetPayload,
  ): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) return;

    // P0-5: Check rate limit
    if (this.isRateLimited(playerInfo.id, client)) {
      return;
    }

    try {
      await this.gameProcess.processUserBet(payload.roomId, playerInfo.id, payload.amount);
    } catch (err) {
      client.emit('error', { code: 'INVALID_BET', message: (err as Error).message });
    }
  }

  /**
   * Throw card (rate limited: 1 card per 300ms)
   * P0-5: Also subject to general rate limiting
   */
  @SubscribeMessage('throw_card')
  async handleThrowCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ThrowCardPayload,
  ): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
    if (!playerInfo) return;

    // P0-5: Check general rate limit first
    if (this.isRateLimited(playerInfo.id, client)) {
      return;
    }

    if (process.env.E2E_TEST !== 'true') {
      // Specific throw_card rate limiting (faster check)
      const now = Date.now();
      const lastTime = this.lastThrowCardTime.get(playerInfo.id) || 0;
      if (now - lastTime < THROW_CARD_RATE_LIMIT_MS) {
        client.emit('error', {
          code: 'RATE_LIMITED',
          message: 'Please wait before throwing another card',
        });
        return;
      }
      this.lastThrowCardTime.set(playerInfo.id, now);
    }

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
