import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventLog, EventType, Severity, Prisma } from '@prisma/client';
import { mergeWhere } from '../admin/utils/query-builder';

export interface LogEventParams {
  eventType: EventType;
  severity?: Severity;
  actorId?: string;
  actorType?: string;
  targetId?: string;
  targetType?: string;
  contextTableId?: string;
  contextTournamentId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface EventLogFilter {
  eventType?: EventType;
  severity?: Severity;
  actorId?: string;
  targetId?: string;
  targetType?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface PaginatedEventLogs {
  items: EventLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class EventLogService {
  private readonly logger = new Logger(EventLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an event - non-blocking, fire-and-forget
   */
  async log(params: LogEventParams): Promise<void> {
    try {
      await this.prisma.eventLog.create({
        data: {
          eventType: params.eventType,
          severity: params.severity ?? 'INFO',
          actorId: params.actorId,
          actorType: params.actorType,
          targetId: params.targetId,
          targetType: params.targetType,
          contextTableId: params.contextTableId,
          contextTournamentId: params.contextTournamentId,
          details: (params.details as Prisma.InputJsonValue) ?? {},
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      // Log errors should never break the application
      this.logger.error(`Failed to log event: ${params.eventType}`, error);
    }
  }

  /**
   * Log event synchronously (when you need the ID)
   */
  async logSync(params: LogEventParams): Promise<EventLog> {
    return this.prisma.eventLog.create({
      data: {
        eventType: params.eventType,
        severity: params.severity ?? 'INFO',
        actorId: params.actorId,
        actorType: params.actorType,
        targetId: params.targetId,
        targetType: params.targetType,
        contextTableId: params.contextTableId,
        contextTournamentId: params.contextTournamentId,
        details: (params.details as Prisma.InputJsonValue) ?? {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  }

  /**
   * Get event log by ID
   */
  async getById(id: string): Promise<EventLog | null> {
    return this.prisma.eventLog.findUnique({
      where: { id },
      include: {
        actor: {
          select: { id: true, username: true, adminRole: true },
        },
      },
    });
  }

  /**
   * List event logs with filtering and pagination
   */
  async list(
    filter: EventLogFilter,
    page = 1,
    pageSize = 50,
    advancedWhere?: Prisma.EventLogWhereInput,
    orderBy?: Prisma.EventLogOrderByWithRelationInput[],
  ): Promise<PaginatedEventLogs> {
    const where: Prisma.EventLogWhereInput = {};

    if (filter.eventType) {
      where.eventType = filter.eventType;
    }
    if (filter.severity) {
      where.severity = filter.severity;
    }
    if (filter.actorId) {
      where.actorId = filter.actorId;
    }
    if (filter.targetId) {
      where.targetId = filter.targetId;
    }
    if (filter.targetType) {
      where.targetType = filter.targetType;
    }
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) {
        where.createdAt.gte = filter.fromDate;
      }
      if (filter.toDate) {
        where.createdAt.lte = filter.toDate;
      }
    }

    const finalWhere = mergeWhere(where, advancedWhere) ?? where;
    const order: Prisma.EventLogOrderByWithRelationInput[] =
      orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: Prisma.SortOrder.desc }];

    const [items, total] = await Promise.all([
      this.prisma.eventLog.findMany({
        where: finalWhere,
        orderBy: order,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: {
            select: { id: true, username: true, adminRole: true },
          },
        },
      }),
      this.prisma.eventLog.count({ where: finalWhere }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get recent activity for a specific user
   */
  async getUserActivity(userId: string, limit = 20): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: {
        OR: [{ actorId: userId }, { targetId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get admin audit trail
   */
  async getAdminAuditTrail(
    adminId: string,
    page = 1,
    pageSize = 50,
    advancedWhere?: Prisma.EventLogWhereInput,
    orderBy?: Prisma.EventLogOrderByWithRelationInput[],
  ): Promise<PaginatedEventLogs> {
    return this.list(
      {
        actorId: adminId,
        eventType: 'ADMIN_ACTION',
      },
      page,
      pageSize,
      advancedWhere,
      orderBy,
    );
  }

  /**
   * Get security events (login attempts, blocks, god mode, etc.)
   */
  async getSecurityEvents(
    page = 1,
    pageSize = 50,
    advancedWhere?: Prisma.EventLogWhereInput,
    orderBy?: Prisma.EventLogOrderByWithRelationInput[],
  ): Promise<PaginatedEventLogs> {
    const where: Prisma.EventLogWhereInput = {
      eventType: {
        in: [
          'ADMIN_ACTION',
          'USER_BANNED',
          'USER_UNBANNED',
          'GOD_MODE_CARD_SWAP',
          'GOD_MODE_DECK_SHUFFLE',
          'GOD_MODE_KILLER_ENABLED',
        ],
      },
    };

    const finalWhere = mergeWhere(where, advancedWhere) ?? where;
    const order: Prisma.EventLogOrderByWithRelationInput[] =
      orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: Prisma.SortOrder.desc }];

    const [items, total] = await Promise.all([
      this.prisma.eventLog.findMany({
        where: finalWhere,
        orderBy: order,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          actor: {
            select: { id: true, username: true, adminRole: true },
          },
        },
      }),
      this.prisma.eventLog.count({ where: finalWhere }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ===== Convenience methods =====

  async logAdminLogin(adminId: string, ip?: string, userAgent?: string): Promise<void> {
    await this.log({
      eventType: 'ADMIN_ACTION',
      severity: 'INFO',
      actorId: adminId,
      actorType: 'ADMIN',
      details: { action: 'LOGIN' },
      ipAddress: ip,
      userAgent,
    });
  }

  async logUserBlocked(adminId: string, userId: string, reason: string): Promise<void> {
    await this.log({
      eventType: 'USER_BANNED',
      severity: 'WARNING',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: userId,
      targetType: 'USER',
      details: { reason },
    });
  }

  async logUserUnblocked(adminId: string, userId: string): Promise<void> {
    await this.log({
      eventType: 'USER_UNBANNED',
      severity: 'INFO',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: userId,
      targetType: 'USER',
    });
  }

  async logBalanceAdjustment(
    adminId: string,
    userId: string,
    amount: number,
    comment?: string,
  ): Promise<void> {
    await this.log({
      eventType: 'BALANCE_ADJUSTED',
      severity: 'INFO',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: userId,
      targetType: 'USER',
      details: { amount, comment },
    });
  }

  async logWithdrawalApproved(
    adminId: string,
    transactionId: string,
    userId: string,
    amount: number,
  ): Promise<void> {
    await this.log({
      eventType: 'WITHDRAWAL_APPROVED',
      severity: 'INFO',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: transactionId,
      targetType: 'TRANSACTION',
      details: { userId, amount },
    });
  }

  async logWithdrawalRejected(
    adminId: string,
    transactionId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    await this.log({
      eventType: 'WITHDRAWAL_REJECTED',
      severity: 'WARNING',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: transactionId,
      targetType: 'TRANSACTION',
      details: { userId, reason },
    });
  }

  async logSettingsChanged(
    adminId: string,
    key: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    await this.log({
      eventType: 'SETTINGS_UPDATED',
      severity: 'INFO',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: key,
      targetType: 'SETTING',
      details: { oldValue, newValue },
    });
  }

  async logGodModeCardSwap(
    adminId: string,
    tableId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      eventType: 'GOD_MODE_CARD_SWAP',
      severity: 'CRITICAL',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: tableId,
      targetType: 'TABLE',
      contextTableId: tableId,
      details,
    });
  }

  async logGodModeDeckShuffle(
    adminId: string,
    tableId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      eventType: 'GOD_MODE_DECK_SHUFFLE',
      severity: 'CRITICAL',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: tableId,
      targetType: 'TABLE',
      contextTableId: tableId,
      details,
    });
  }

  async logGodModeKillerEnabled(
    adminId: string,
    tableId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      eventType: 'GOD_MODE_KILLER_ENABLED',
      severity: 'CRITICAL',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: tableId,
      targetType: 'TABLE',
      contextTableId: tableId,
      details,
    });
  }

  async logTableEvent(
    eventType: 'TABLE_CREATED' | 'TABLE_STARTED' | 'TABLE_FINISHED' | 'TABLE_CANCELLED',
    tableId: string,
    actorId?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      eventType,
      severity: 'INFO',
      actorId,
      contextTableId: tableId,
      targetId: tableId,
      targetType: 'TABLE',
      details,
    });
  }

  async logPlayerEvent(
    eventType: 'PLAYER_JOINED' | 'PLAYER_LEFT' | 'PLAYER_REPLACED_BY_BOT' | 'PLAYER_RECONNECTED',
    tableId: string,
    playerId: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      eventType,
      severity: 'INFO',
      actorId: playerId,
      contextTableId: tableId,
      targetId: tableId,
      targetType: 'TABLE',
      details,
    });
  }

  async logTournamentEvent(
    eventType:
      | 'TOURNAMENT_CREATED'
      | 'TOURNAMENT_PUBLISHED'
      | 'TOURNAMENT_STARTED'
      | 'TOURNAMENT_STAGE_STARTED'
      | 'TOURNAMENT_FINISHED'
      | 'TOURNAMENT_CANCELLED',
    tournamentId: string,
    actorId?: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      eventType,
      severity: 'INFO',
      actorId,
      contextTournamentId: tournamentId,
      targetId: tournamentId,
      targetType: 'TOURNAMENT',
      details,
    });
  }

  async logTransactionCreated(
    transactionId: string,
    userId: string,
    amount: number,
    txType: string,
  ): Promise<void> {
    await this.log({
      eventType: 'TRANSACTION_CREATED',
      severity: 'INFO',
      actorId: userId,
      targetId: transactionId,
      targetType: 'TRANSACTION',
      details: { amount, txType },
    });
  }
}
