import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GameCleanupService {
  private readonly logger = new Logger(GameCleanupService.name);

  constructor(private prisma: PrismaService) {}

  // Run every day at 3 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleLogCleanup() {
    this.logger.log('Starting scheduled game log cleanup...');

    try {
      // Calculate date 3 days ago
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 3);

      // Update games older than 3 days: clear gameLog, keep metadata
      const result = await this.prisma.finishedGame.updateMany({
        where: {
          finishedAt: {
            lt: cutoffDate,
          },
          // Only update if logs are not already empty (optimization)
          // Note: Checking JSON content in Prisma where clause can be tricky,
          // so we just update all old ones. It's safe.
        },
        data: {
          gameLog: [], // Clear logs to save space
        },
      });

      if (result.count > 0) {
        this.logger.log(`Cleaned up logs for ${result.count} old games.`);
      } else {
        this.logger.log('No old game logs to clean up.');
      }
    } catch (error) {
      this.logger.error(`Failed to clean up game logs: ${(error as Error).message}`);
    }
  }
}
