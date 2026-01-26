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
   * Select trump (9-card rounds)
   */
  @SubscribeMessage('select_trump')
  async handleSelectTrump(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SelectTrumpPayload,
  ): Promise<void> {
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
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
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
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
    const playerInfo = this.connectionRegistry.getBySocketId(client.id);
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
