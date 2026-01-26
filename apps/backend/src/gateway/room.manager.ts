import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { GameState, GAME_CONSTANTS, Card } from '@joker/shared';
import { GameEngineService } from '../game/services/game-engine.service';
import { RedisService } from '../database/redis.service';

interface QueuedPlayer {
  id: string;
  name: string;
  socketId: string;
  joinedAt: number;
}

interface GameRoom {
  id: string;
  gameState: GameState;
  sockets: Map<string, string>; // playerId -> socketId
  botFillTimeout?: NodeJS.Timeout;
  turnTimeout?: NodeJS.Timeout;
}

@Injectable()
export class RoomManager {
  private readonly logger = new Logger(RoomManager.name);

  // In-memory cache (hot data, authoritative during game)
  private queue: QueuedPlayer[] = [];
  private rooms: Map<string, GameRoom> = new Map();
  private playerToRoom: Map<string, string> = new Map(); // playerId -> roomId

  constructor(
    private gameEngine: GameEngineService,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {}

  // ==========================================
  // Queue Management
  // ==========================================

  /**
   * Add player to matchmaking queue
   */
  addToQueue(playerId: string, playerName: string, socketId: string): void {
    // Remove if already in queue
    this.removeFromQueue(playerId);

    this.queue.push({
      id: playerId,
      name: playerName,
      socketId,
      joinedAt: Date.now(),
    });

    this.logger.log(`Player ${playerName} (${playerId}) added to queue`);
  }

  /**
   * Remove player from queue
   */
  removeFromQueue(playerId: string): void {
    this.queue = this.queue.filter((p) => p.id !== playerId);
  }

  /**
   * Check if enough players to start game
   */
  canStartGame(): boolean {
    return this.queue.length >= GAME_CONSTANTS.PLAYERS_COUNT;
  }

  /**
   * Get oldest player in queue (for bot fill check)
   */
  getOldestQueueEntry(): QueuedPlayer | null {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get socket IDs of all queued players
   */
  getQueueSockets(): string[] {
    return this.queue.map((p) => p.socketId).filter(Boolean);
  }

  // ==========================================
  // Room Creation
  // ==========================================

  /**
   * Create game room from queued players
   */
  async createRoom(): Promise<{ room: GameRoom; tuzovanieCards: Card[][] } | null> {
    if (this.queue.length < GAME_CONSTANTS.PLAYERS_COUNT) {
      return null;
    }

    // Take first 4 players from queue
    const players = this.queue.splice(0, GAME_CONSTANTS.PLAYERS_COUNT);

    const playerIds = players.map((p) => p.id);
    const playerNames = players.map((p) => p.name);

    // Perform tuzovanie
    const { dealerIndex, cardsDealt } = this.gameEngine.tuzovanie(4);

    // Create game state with determined dealer
    const gameState = this.gameEngine.createGame(playerIds, playerNames, dealerIndex);

    // Sort cardsDealt to match gameState.players order
    // gameState.players can be shuffled (dealer is last), so we must align cardsDealt
    const sortedCardsDealt = gameState.players.map((p) => {
      const originalIndex = playerIds.indexOf(p.id);
      return cardsDealt[originalIndex];
    });

    // Create room
    const room: GameRoom = {
      id: uuidv4(),
      gameState,
      sockets: new Map(players.map((p) => [p.id, p.socketId])),
    };

    // Store in memory
    this.rooms.set(room.id, room);

    // Map players to room
    for (const player of players) {
      this.playerToRoom.set(player.id, room.id);
    }

    // Persist to Redis
    await this.persistRoom(room);

    this.logger.log(`Room ${room.id} created with players: ${playerIds.join(', ')}`);

    return { room, tuzovanieCards: sortedCardsDealt };
  }

  /**
   * Create room with bots filling remaining slots
   */
  async createRoomWithBots(): Promise<{ room: GameRoom; tuzovanieCards: Card[][] } | null> {
    if (this.queue.length === 0) {
      return null;
    }

    const realPlayers = [...this.queue];
    this.queue = [];

    // Fill remaining with bots
    const botsNeeded = GAME_CONSTANTS.PLAYERS_COUNT - realPlayers.length;
    const botPlayers: QueuedPlayer[] = [];

    for (let i = 0; i < botsNeeded; i++) {
      botPlayers.push({
        id: `bot-${uuidv4().slice(0, 8)}`,
        name: `Bot ${i + 1}`,
        socketId: '',
        joinedAt: Date.now(),
      });
    }

    const allPlayers = [...realPlayers, ...botPlayers];
    const playerIds = allPlayers.map((p) => p.id);
    const playerNames = allPlayers.map((p) => p.name);

    // Perform tuzovanie
    const { dealerIndex, cardsDealt } = this.gameEngine.tuzovanie(4);

    // Create game state with determined dealer
    const gameState = this.gameEngine.createGame(playerIds, playerNames, dealerIndex);

    // Sort cardsDealt to match gameState.players order
    const sortedCardsDealt = gameState.players.map((p) => {
      const originalIndex = playerIds.indexOf(p.id);
      return cardsDealt[originalIndex];
    });

    // Create room
    const room: GameRoom = {
      id: uuidv4(),
      gameState,
      sockets: new Map(realPlayers.map((p) => [p.id, p.socketId])),
    };

    // Store in memory
    this.rooms.set(room.id, room);

    // Map real players to room
    for (const player of realPlayers) {
      this.playerToRoom.set(player.id, room.id);
    }

    // Persist to Redis
    await this.persistRoom(room);

    this.logger.log(
      `Room ${room.id} created with ${realPlayers.length} players and ${botsNeeded} bots`,
    );

    return { room, tuzovanieCards: sortedCardsDealt };
  }

  // ==========================================
  // Room Access
  // ==========================================

  /**
   * Get room by ID (memory first, then Redis)
   */
  async getRoom(roomId: string): Promise<GameRoom | undefined> {
    // Check memory first
    const memoryRoom = this.rooms.get(roomId);
    if (memoryRoom) {
      return memoryRoom;
    }

    // Try Redis
    const redisState = await this.redisService.getGameState(roomId);
    if (redisState) {
      // Restore room to memory
      const room = await this.restoreRoomFromRedis(roomId, redisState);
      return room;
    }

    return undefined;
  }

  /**
   * Get room by ID (sync, memory only - for hot path)
   */
  getRoomSync(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get room by player ID
   */
  async getRoomByPlayerId(playerId: string): Promise<GameRoom | undefined> {
    // Check memory first
    const roomId = this.playerToRoom.get(playerId);
    if (roomId) {
      return this.rooms.get(roomId);
    }

    // Try Redis
    const redisRoomId = await this.redisService.getPlayerRoom(playerId);
    if (redisRoomId) {
      return this.getRoom(redisRoomId);
    }

    return undefined;
  }

  /**
   * Get room by player ID (sync, memory only)
   */
  getRoomByPlayerIdSync(playerId: string): GameRoom | undefined {
    const roomId = this.playerToRoom.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  // ==========================================
  // Game State Management
  // ==========================================

  /**
   * Update game state in room
   */
  async updateGameState(roomId: string, gameState: GameState): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;

      // Persist to Redis (async, don't await to avoid blocking)
      this.redisService.setGameState(roomId, gameState).catch((err) => {
        this.logger.error(`Failed to persist game state: ${err.message}`);
      });
    }
  }

  /**
   * Force sync game state to Redis
   */
  async syncToRedis(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room) {
      await this.redisService.setGameState(roomId, room.gameState);
    }
  }

  // ==========================================
  // Socket Management
  // ==========================================

  /**
   * Get socket ID for a player
   */
  getSocketId(roomId: string, playerId: string): string | undefined {
    const room = this.rooms.get(roomId);
    return room?.sockets.get(playerId);
  }

  /**
   * Get all socket IDs in room
   */
  getSocketIds(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.sockets.values()).filter(Boolean) : [];
  }

  /**
   * Update player's socket ID (reconnection)
   */
  async updateSocketId(playerId: string, socketId: string): Promise<void> {
    const room = this.getRoomByPlayerIdSync(playerId);
    if (room) {
      room.sockets.set(playerId, socketId);

      // Update in Redis
      await this.redisService.setPlayerSocket(playerId, socketId);
    }
  }

  // ==========================================
  // Player Connection Management
  // ==========================================

  /**
   * Handle player disconnect
   */
  async handleDisconnect(playerId: string): Promise<void> {
    // Remove from queue
    this.removeFromQueue(playerId);

    // Mark as disconnected in room
    const room = this.getRoomByPlayerIdSync(playerId);
    if (room) {
      const player = room.gameState.players.find((p) => p.id === playerId);
      if (player) {
        player.connected = false;

        // Persist disconnect state
        await this.redisService.setGameState(room.id, room.gameState);
      }
    }

    // Remove socket mapping
    await this.redisService.removePlayerSocket(playerId);
  }

  /**
   * Replace player with bot
   */
  async replaceWithBot(roomId: string, playerId: string): Promise<GameState | null> {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const playerIndex = room.gameState.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return null;

    const player = room.gameState.players[playerIndex];
    const botId = `bot-${uuidv4().slice(0, 8)}`;

    // Create new player as bot
    room.gameState.players[playerIndex] = {
      ...player,
      id: botId,
      name: `${player.name} (Bot)`,
      isBot: true,
      connected: true,
    };

    // Update mappings
    room.sockets.delete(playerId);
    this.playerToRoom.delete(playerId);
    this.playerToRoom.set(botId, roomId);

    // Persist changes
    await this.redisService.removePlayerRoom(playerId);
    await this.redisService.removePlayerSocket(playerId);
    await this.redisService.setPlayerRoom(botId, roomId);
    await this.redisService.setGameState(roomId, room.gameState);

    this.logger.log(`Player ${playerId} replaced with bot ${botId} in room ${roomId}`);

    return room.gameState;
  }

  /**
   * Check if player is bot
   */
  isBot(playerId: string): boolean {
    return playerId.startsWith('bot-');
  }

  /**
   * Get current player in a room
   */
  getCurrentPlayer(roomId: string): string | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    return room.gameState.players[room.gameState.currentPlayerIndex]?.id ?? null;
  }

  // ==========================================
  // Timeout Management
  // ==========================================

  /**
   * Set bot fill timeout for a room
   */
  setBotFillTimeout(roomId: string, timeout: NodeJS.Timeout): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.botFillTimeout = timeout;
    }
  }

  /**
   * Clear bot fill timeout
   */
  clearBotFillTimeout(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room?.botFillTimeout) {
      clearTimeout(room.botFillTimeout);
      room.botFillTimeout = undefined;
    }
  }

  /**
   * Set turn timeout
   */
  setTurnTimeout(roomId: string, timeout: NodeJS.Timeout): void {
    const room = this.rooms.get(roomId);
    if (room) {
      if (room.turnTimeout) {
        clearTimeout(room.turnTimeout);
      }
      room.turnTimeout = timeout;
    }
  }

  /**
   * Clear turn timeout
   */
  clearTurnTimeout(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room?.turnTimeout) {
      clearTimeout(room.turnTimeout);
      room.turnTimeout = undefined;
    }
  }

  // ==========================================
  // Cleanup
  // ==========================================

  /**
   * Clean up finished room
   */
  async cleanupRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Clear timeouts
    this.clearBotFillTimeout(roomId);
    this.clearTurnTimeout(roomId);

    // Remove player mappings from memory
    for (const playerId of room.sockets.keys()) {
      this.playerToRoom.delete(playerId);
    }

    // Remove room from memory
    this.rooms.delete(roomId);

    // Cleanup Redis
    await this.redisService.cleanupRoom(roomId);

    this.logger.log(`Room ${roomId} cleaned up`);
  }

  // ==========================================
  // Redis Persistence Helpers
  // ==========================================

  /**
   * Persist room to Redis
   */
  private async persistRoom(room: GameRoom): Promise<void> {
    // Save game state
    await this.redisService.setGameState(room.id, room.gameState);

    // Map all players to room
    for (const [playerId, socketId] of room.sockets) {
      await this.redisService.setPlayerRoom(playerId, room.id);
      if (socketId) {
        await this.redisService.setPlayerSocket(playerId, socketId);
      }
    }

    // Also map bot players (they don't have sockets)
    for (const player of room.gameState.players) {
      if (player.isBot) {
        await this.redisService.setPlayerRoom(player.id, room.id);
      }
    }
  }

  /**
   * Restore room from Redis to memory
   */
  private async restoreRoomFromRedis(roomId: string, gameState: GameState): Promise<GameRoom> {
    // Recreate room structure
    const room: GameRoom = {
      id: roomId,
      gameState,
      sockets: new Map(),
    };

    // Restore socket mappings
    for (const player of gameState.players) {
      if (!player.isBot) {
        const socketId = await this.redisService.getPlayerSocket(player.id);
        if (socketId) {
          room.sockets.set(player.id, socketId);
        }
        this.playerToRoom.set(player.id, roomId);
      }
    }

    // Store in memory
    this.rooms.set(roomId, room);

    this.logger.log(`Room ${roomId} restored from Redis`);

    return room;
  }
}
