import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GameState, GamePhase } from '@joker/shared';

@Injectable()
export class GameAuditService {
  private readonly logger = new Logger(GameAuditService.name);
  private readonly AUDIT_KEY_PREFIX = 'game:audit:';

  constructor(
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {}

  /**
   * Log a game action to Redis buffer
   */
  async logAction(roomId: string, action: string, playerId: string, data: any): Promise<void> {
    const client = this.redisService.getClient();
    if (!client) return;

    const entry = {
      t: Date.now(),
      a: action,
      p: playerId,
      d: data,
    };

    try {
      // RPUSH is O(1) - extremely fast
      const key = `${this.AUDIT_KEY_PREFIX}${roomId}`;
      await client.rpush(key, JSON.stringify(entry));

      // Set/Refresh TTL to 24h on every write (simple approach)
      // Optimization: Only set if TTL is -1? But expire is fast.
      await client.expire(key, 24 * 60 * 60);
    } catch (error) {
      // Never block the game if logging fails
      this.logger.warn(`Failed to log action for room ${roomId}: ${(error as Error).message}`);
    }
  }

  /**
   * Flush game logs to PostgreSQL
   * Called when game finishes
   */
  async saveGameRecord(gameState: GameState): Promise<void> {
    const roomId = gameState.id;
    const client = this.redisService.getClient();
    if (!client) return;

    try {
      // Fetch all logs from Redis
      const key = `${this.AUDIT_KEY_PREFIX}${roomId}`;
      const rawLogs = await client.lrange(key, 0, -1);
      const logs = rawLogs
        .map((log) => {
          try {
            return JSON.parse(log);
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Prepare metadata
      const players = gameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.totalScore,
        isBot: p.isBot,
      }));

      // Save to Postgres
      const isFinished = gameState.phase === GamePhase.Finished;
      const status = isFinished ? 'FINISHED' : 'IN_PROGRESS';

      await this.prisma.game.upsert({
        where: { id: roomId },
        create: {
          id: roomId,
          status,
          startedAt: new Date(gameState.createdAt),
          finishedAt: isFinished ? new Date() : null,
          winnerId: gameState.winnerId,
          players: players as any,
          gameLog: logs as any,
        },
        update: {
          status,
          finishedAt: isFinished ? new Date() : null,
          winnerId: gameState.winnerId,
          players: players as any,
          gameLog: logs as any,
        },
      });

      this.logger.log(
        `Game ${roomId} successfully saved (Status: ${status}, ${logs.length} events)`,
      );

      // We keep the Redis log for 24h (TTL) for hot debugging,
      // no need to delete immediately unless memory is tight.
    } catch (error) {
      this.logger.error(`Failed to archive game ${roomId}: ${(error as Error).message}`);
    }
  }
}
