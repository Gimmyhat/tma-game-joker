import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { GameState } from '@joker/shared';

// TTL constants (in seconds)
const GAME_STATE_TTL = 2 * 60 * 60; // 2 hours
const PLAYER_SESSION_TTL = 24 * 60 * 60; // 24 hours

// Redis key prefixes
const KEYS = {
  GAME: 'game:', // game:{roomId} -> GameState JSON
  PLAYER_ROOM: 'player:room:', // player:room:{playerId} -> roomId
  PLAYER_SOCKET: 'player:socket:', // player:socket:{playerId} -> socketId
  ROOM_PLAYERS: 'room:players:', // room:players:{roomId} -> Set of playerIds
} as const;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    // Skip Redis connection in E2E tests to avoid open handles/reconnect loops
    if (process.env.E2E_TEST === 'true') {
      this.logger.log('Running in E2E test mode - Redis disabled (in-memory only)');
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured - running in memory-only mode');
      return;
    }

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        connectTimeout: 30000, // WSL networking can be slow
        commandTimeout: 5000,
        retryStrategy: (times) => {
          if (times > 5) {
            this.logger.error(
              'Redis connection failed after 5 retries - falling back to memory-only',
            );
            return null; // Stop retrying
          }
          const delay = Math.min(times * 500, 3000);
          this.logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
          return delay;
        },
      });

      this.client.on('connect', () => {
        this.logger.log('Connecting to Redis...');
      });

      this.client.on('ready', () => {
        this.isConnected = true;
        this.logger.log('Redis connection ready');
      });

      this.client.on('error', (err) => {
        // Don't spam logs for connection refused during startup
        if (!err.message.includes('ECONNREFUSED')) {
          this.logger.error(`Redis error: ${err.message}`);
        }
      });

      this.client.on('close', () => {
        if (this.isConnected) {
          this.isConnected = false;
          this.logger.warn('Redis connection closed');
        }
      });

      this.client.on('end', () => {
        this.isConnected = false;
        // Do not set client to null here immediately to allow reconnection attempts if configured,
        // but if retryStrategy returns null, ioredis will close it.
        // We can check status.
        if (this.client?.status === 'end') {
          this.logger.warn('Redis connection ended permanently - switching to memory-only mode');
          this.client = null;
        }
      });

      // Test connection with ping
      const pong = await this.client.ping();
      if (pong === 'PONG') {
        this.isConnected = true;
        this.logger.log('Redis connected and verified');
      }
    } catch (error) {
      this.logger.warn(
        `Redis not available: ${(error as Error).message} - running in memory-only mode`,
      );
      this.client = null;
      this.isConnected = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch (e) {
        // Ignore close errors
      }
      this.logger.log('Redis connection closed');
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isConnected && this.client !== null && this.client.status === 'ready';
  }

  // ==========================================
  // Game State Operations
  // ==========================================

  /**
   * Save game state to Redis
   */
  async setGameState(roomId: string, state: GameState): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEYS.GAME}${roomId}`;
      await this.client!.setex(key, GAME_STATE_TTL, JSON.stringify(state));
    } catch (error) {
      // Downgrade error to warn to reduce noise if Redis flakes
      this.logger.warn(`Failed to save game state (Redis): ${(error as Error).message}`);
    }
  }

  /**
   * Get game state from Redis
   */
  async getGameState(roomId: string): Promise<GameState | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEYS.GAME}${roomId}`;
      const data = await this.client!.get(key);
      return data ? (JSON.parse(data) as GameState) : null;
    } catch (error) {
      this.logger.warn(`Failed to get game state (Redis): ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Delete game state from Redis
   */
  async deleteGameState(roomId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEYS.GAME}${roomId}`;
      await this.client!.del(key);
    } catch (error) {
      this.logger.warn(`Failed to delete game state (Redis): ${(error as Error).message}`);
    }
  }

  /**
   * Refresh game state TTL
   */
  async refreshGameTTL(roomId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEYS.GAME}${roomId}`;
      await this.client!.expire(key, GAME_STATE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to refresh game TTL (Redis): ${(error as Error).message}`);
    }
  }

  // ==========================================
  // Player Session Operations
  // ==========================================

  /**
   * Map player to room (for reconnection)
   */
  async setPlayerRoom(playerId: string, roomId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEYS.PLAYER_ROOM}${playerId}`;
      await this.client!.setex(key, PLAYER_SESSION_TTL, roomId);

      // Also add to room's player set
      const roomPlayersKey = `${KEYS.ROOM_PLAYERS}${roomId}`;
      await this.client!.sadd(roomPlayersKey, playerId);
      await this.client!.expire(roomPlayersKey, GAME_STATE_TTL);
    } catch (error) {
      this.logger.warn(`Failed to set player room (Redis): ${(error as Error).message}`);
    }
  }

  /**
   * Get player's current room (for reconnection)
   */
  async getPlayerRoom(playerId: string): Promise<string | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEYS.PLAYER_ROOM}${playerId}`;
      return await this.client!.get(key);
    } catch (error) {
      this.logger.warn(`Failed to get player room (Redis): ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Remove player from room mapping
   */
  async removePlayerRoom(playerId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Get current room first
      const roomId = await this.getPlayerRoom(playerId);

      // Delete player -> room mapping
      const key = `${KEYS.PLAYER_ROOM}${playerId}`;
      await this.client!.del(key);

      // Remove from room's player set
      if (roomId) {
        const roomPlayersKey = `${KEYS.ROOM_PLAYERS}${roomId}`;
        await this.client!.srem(roomPlayersKey, playerId);
      }
    } catch (error) {
      this.logger.warn(`Failed to remove player room (Redis): ${(error as Error).message}`);
    }
  }

  /**
   * Map player to socket (for messaging)
   */
  async setPlayerSocket(playerId: string, socketId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEYS.PLAYER_SOCKET}${playerId}`;
      await this.client!.setex(key, PLAYER_SESSION_TTL, socketId);
    } catch (error) {
      this.logger.warn(`Failed to set player socket (Redis): ${(error as Error).message}`);
    }
  }

  /**
   * Get player's socket ID
   */
  async getPlayerSocket(playerId: string): Promise<string | null> {
    if (!this.isAvailable()) return null;

    try {
      const key = `${KEYS.PLAYER_SOCKET}${playerId}`;
      return await this.client!.get(key);
    } catch (error) {
      this.logger.warn(`Failed to get player socket (Redis): ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Remove player's socket mapping
   */
  async removePlayerSocket(playerId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      const key = `${KEYS.PLAYER_SOCKET}${playerId}`;
      await this.client!.del(key);
    } catch (error) {
      this.logger.warn(`Failed to remove player socket (Redis): ${(error as Error).message}`);
    }
  }

  // ==========================================
  // Room Operations
  // ==========================================

  /**
   * Get all players in a room
   */
  async getRoomPlayers(roomId: string): Promise<string[]> {
    if (!this.isAvailable()) return [];

    try {
      const key = `${KEYS.ROOM_PLAYERS}${roomId}`;
      return await this.client!.smembers(key);
    } catch (error) {
      this.logger.warn(`Failed to get room players (Redis): ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Clean up all room data
   */
  async cleanupRoom(roomId: string): Promise<void> {
    if (!this.isAvailable()) return;

    try {
      // Get all players in room
      const players = await this.getRoomPlayers(roomId);

      // Remove all player mappings
      const pipeline = this.client!.pipeline();

      for (const playerId of players) {
        pipeline.del(`${KEYS.PLAYER_ROOM}${playerId}`);
        pipeline.del(`${KEYS.PLAYER_SOCKET}${playerId}`);
      }

      // Remove room data
      pipeline.del(`${KEYS.GAME}${roomId}`);
      pipeline.del(`${KEYS.ROOM_PLAYERS}${roomId}`);

      await pipeline.exec();

      this.logger.log(`Cleaned up room ${roomId} (Redis)`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup room (Redis): ${(error as Error).message}`);
    }
  }

  // ==========================================
  // Utility Operations
  // ==========================================

  /**
   * Ping Redis (health check)
   */
  async ping(): Promise<boolean> {
    if (!this.isAvailable()) return false;

    try {
      const result = await this.client!.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Get Redis client for advanced operations
   * Returns null if not connected/ready
   */
  getClient(): Redis | null {
    return this.isAvailable() ? this.client : null;
  }
}
