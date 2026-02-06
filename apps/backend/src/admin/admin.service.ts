import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, User, Prisma, TournamentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { EventLogService } from '../event-log/event-log.service';
import { mergeWhere } from './utils/query-builder';

export interface AdminTokenPayload {
  sub: string;
  username: string;
  role: AdminRole;
}

export interface AdminLoginResult {
  accessToken: string;
  user: {
    id: string;
    username: string;
    role: AdminRole;
  };
}

export interface PaginatedUsers {
  items: Array<Omit<User, 'tgId'> & { tgId: string }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserFilter {
  search?: string;
  role?: AdminRole;
  isBlocked?: boolean;
}

export interface PaginatedTasks {
  items: Array<{
    id: string;
    title: string;
    shortDescription: string | null;
    rewardAmount: string;
    rewardCurrency: string | null;
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    completionsCount: number;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TaskDetailResponse {
  id: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  rewardAmount: string;
  rewardCurrency: string | null;
  status: string;
  autoVerify: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDto {
  title: string;
  shortDescription?: string;
  longDescription?: string;
  rewardAmount?: number;
  rewardCurrency?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  autoVerify?: boolean;
}

export interface UpdateTaskDto {
  title?: string;
  shortDescription?: string;
  longDescription?: string;
  rewardAmount?: number;
  rewardCurrency?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  autoVerify?: boolean;
}

export interface PaginatedTournaments {
  items: Array<{
    id: string;
    title: string | null;
    status: TournamentStatus;
    registrationStart: Date | null;
    startTime: Date | null;
    currentStage: number;
    prizePoolActual: string;
    revenue: string;
    participantsCount: number;
    tablesCount: number;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TournamentDetailResponse {
  id: string;
  title: string | null;
  config: Prisma.JsonValue;
  status: TournamentStatus;
  registrationStart: Date | null;
  startTime: Date | null;
  botFillConfig: Prisma.JsonValue | null;
  currentStage: number;
  bracketState: Prisma.JsonValue | null;
  prizePoolActual: string;
  revenue: string;
  participantsCount: number;
  tablesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTournamentDto {
  title?: string;
  config?: Prisma.InputJsonValue;
  status?: TournamentStatus;
  registrationStart?: Date;
  startTime?: Date;
  botFillConfig?: Prisma.InputJsonValue;
  currentStage?: number;
}

export interface UpdateTournamentDto {
  title?: string;
  config?: Prisma.InputJsonValue;
  status?: TournamentStatus;
  registrationStart?: Date | null;
  startTime?: Date | null;
  botFillConfig?: Prisma.InputJsonValue;
  currentStage?: number;
}

export interface UserDetailResponse {
  user: Omit<User, 'tgId'> & { tgId: string };
  referrer: { id: string; username: string | null; tgId: string } | null;
  referralsCount: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: string;
    status: string;
    createdAt: Date;
  }>;
  stats: {
    totalTransactions: number;
    totalDeposits: string;
    totalWithdrawals: string;
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly eventLog: EventLogService,
  ) {}

  /**
   * Validate admin credentials and return JWT
   */
  async login(username: string, password: string): Promise<AdminLoginResult> {
    const user = await this.prisma.user.findFirst({
      where: {
        username,
        adminRole: { not: null },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.blockedAt) {
      throw new UnauthorizedException('Account is blocked');
    }

    const payload: AdminTokenPayload = {
      sub: user.id,
      username: user.username || '',
      role: user.adminRole!,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Admin ${username} logged in successfully`);

    // Audit log
    this.eventLog.logAdminLogin(user.id);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username || '',
        role: user.adminRole!,
      },
    };
  }

  /**
   * Validate JWT payload
   */
  async validateAdmin(payload: AdminTokenPayload): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.adminRole || user.blockedAt) {
      return null;
    }

    return user;
  }

  /**
   * Create admin user
   */
  async createAdmin(
    username: string,
    password: string,
    role: AdminRole = 'OPERATOR',
    createdById?: string,
  ): Promise<User> {
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        adminRole: role,
        tgId: BigInt(Date.now()), // Generate unique tgId for admin users
      },
    });

    this.logger.log(`Admin ${username} created with role ${role} by ${createdById || 'system'}`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: createdById,
      actorType: 'ADMIN',
      targetId: user.id,
      targetType: 'USER',
      details: { action: 'CREATE_ADMIN', username, role },
    });

    return user;
  }

  /**
   * Update admin password
   */
  async updatePassword(userId: string, newPassword: string, updatedById?: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    this.logger.log(`Password updated for user ${userId}`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: updatedById,
      actorType: 'ADMIN',
      targetId: userId,
      targetType: 'USER',
      details: { action: 'PASSWORD_CHANGED' },
    });
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Get detailed user info for admin panel
   */
  async getUserDetail(id: string): Promise<UserDetailResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        referrer: {
          select: { id: true, username: true, tgId: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    // Get referrals count
    const referralsCount = await this.prisma.user.count({
      where: { referrerId: id },
    });

    // Get recent transactions (last 10)
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    // Get transaction stats
    const [totalTransactions, depositsAgg, withdrawalsAgg] = await Promise.all([
      this.prisma.transaction.count({ where: { userId: id } }),
      this.prisma.transaction.aggregate({
        where: { userId: id, type: 'DEPOSIT', status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { userId: id, type: 'WITHDRAW', status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);

    return {
      user: {
        ...user,
        tgId: user.tgId.toString(),
      },
      referrer: user.referrer
        ? {
            id: user.referrer.id,
            username: user.referrer.username,
            tgId: user.referrer.tgId.toString(),
          }
        : null,
      referralsCount,
      recentTransactions: recentTransactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount.toString(),
        status: tx.status,
        createdAt: tx.createdAt,
      })),
      stats: {
        totalTransactions,
        totalDeposits: depositsAgg._sum.amount?.toString() || '0',
        totalWithdrawals: withdrawalsAgg._sum.amount?.toString() || '0',
      },
    };
  }

  /**
   * Get user referrals with pagination
   */
  async getUserReferrals(
    userId: string,
    page = 1,
    pageSize = 20,
    advancedWhere?: Prisma.UserWhereInput,
    orderBy?: Prisma.UserOrderByWithRelationInput[],
  ): Promise<{
    items: Array<{
      id: string;
      username: string | null;
      tgId: string;
      status: string;
      createdAt: Date;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const baseWhere: Prisma.UserWhereInput = { referrerId: userId };
    const where = mergeWhere(baseWhere, advancedWhere) ?? baseWhere;
    const order: Prisma.UserOrderByWithRelationInput[] =
      orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: Prisma.SortOrder.desc }];

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: order,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          username: true,
          tgId: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((u) => ({
        id: u.id,
        username: u.username,
        tgId: u.tgId.toString(),
        status: u.status,
        createdAt: u.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * List users with pagination and filtering
   */
  async listUsers(
    filter: UserFilter,
    page = 1,
    pageSize = 20,
    advancedWhere?: Prisma.UserWhereInput,
    orderBy?: Prisma.UserOrderByWithRelationInput[],
  ): Promise<PaginatedUsers> {
    const where: Prisma.UserWhereInput = {};

    if (filter.search) {
      where.OR = [
        { username: { contains: filter.search, mode: 'insensitive' as const } },
        ...(isNaN(Number(filter.search)) ? [] : [{ tgId: BigInt(filter.search) }]),
      ];
    }

    if (filter.role) {
      where.adminRole = filter.role;
    }

    if (filter.isBlocked !== undefined) {
      where.blockedAt = filter.isBlocked ? { not: null } : null;
    }

    const finalWhere = mergeWhere(where, advancedWhere) ?? where;
    const order: Prisma.UserOrderByWithRelationInput[] =
      orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: Prisma.SortOrder.desc }];

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: finalWhere,
        orderBy: order,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where: finalWhere }),
    ]);

    return {
      items: items.map((u) => ({
        ...u,
        tgId: u.tgId.toString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Block user
   */
  async blockUser(userId: string, blockedById: string, reason: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        blockedAt: new Date(),
        blockedById,
        blockReason: reason,
      },
    });

    this.logger.log(`User ${userId} blocked by ${blockedById}. Reason: ${reason}`);

    // Audit log
    this.eventLog.logUserBlocked(blockedById, userId, reason);

    return updated;
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string, unblockedById: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        blockedAt: null,
        blockedById: null,
        blockReason: null,
      },
    });

    this.logger.log(`User ${userId} unblocked by ${unblockedById}`);

    // Audit log
    this.eventLog.logUserUnblocked(unblockedById, userId);

    return updated;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: AdminRole | null, updatedById: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { adminRole: role },
    });

    this.logger.log(`User ${userId} role updated to ${role} by ${updatedById}`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: updatedById,
      actorType: 'ADMIN',
      targetId: userId,
      targetType: 'USER',
      details: { action: 'ROLE_CHANGED', oldRole: user.adminRole, newRole: role },
    });

    return updated;
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(): Promise<{
    totalUsers: number;
    activeUsers24h: number;
    totalTransactions: number;
    pendingWithdrawals: number;
    totalBalance: string;
  }> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers24h, totalTransactions, pendingWithdrawals, balanceAgg] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            lastActiveAt: { gte: twentyFourHoursAgo },
          },
        }),
        this.prisma.transaction.count(),
        this.prisma.transaction.count({
          where: {
            type: 'WITHDRAW',
            status: 'PENDING',
          },
        }),
        this.prisma.user.aggregate({
          _sum: { balanceCj: true },
        }),
      ]);

    return {
      totalUsers,
      activeUsers24h,
      totalTransactions,
      pendingWithdrawals,
      totalBalance: balanceAgg._sum.balanceCj?.toString() || '0',
    };
  }

  // ==================== Global Settings ====================

  /**
   * Get all global settings
   */
  async getAllSettings(): Promise<
    Array<{ key: string; value: unknown; description: string | null; updatedAt: Date }>
  > {
    const settings = await this.prisma.globalSettings.findMany({
      orderBy: { key: 'asc' },
    });

    return settings.map((s) => ({
      key: s.key,
      value: s.value,
      description: s.description,
      updatedAt: s.updatedAt,
    }));
  }

  /**
   * Get single setting by key
   */
  async getSetting(
    key: string,
  ): Promise<{ key: string; value: unknown; description: string | null } | null> {
    const setting = await this.prisma.globalSettings.findUnique({
      where: { key },
    });

    if (!setting) return null;

    return {
      key: setting.key,
      value: setting.value,
      description: setting.description,
    };
  }

  /**
   * Update or create setting
   */
  async upsertSetting(
    key: string,
    value: unknown,
    description: string | null,
    updatedById: string,
  ): Promise<{ key: string; value: unknown; description: string | null; updatedAt: Date }> {
    // Get old value for audit log
    const oldSetting = await this.prisma.globalSettings.findUnique({ where: { key } });
    const oldValue = oldSetting?.value;

    const setting = await this.prisma.globalSettings.upsert({
      where: { key },
      update: {
        value: value as Prisma.InputJsonValue,
        description,
        updatedById,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
        description,
        updatedById,
      },
    });

    this.logger.log(`Setting "${key}" updated by ${updatedById}`);

    // Audit log
    this.eventLog.logSettingsChanged(updatedById, key, oldValue, value);

    return {
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * Update multiple settings at once
   */
  async updateSettings(
    settings: Array<{ key: string; value: unknown; description?: string }>,
    updatedById: string,
  ): Promise<Array<{ key: string; value: unknown }>> {
    const results = await Promise.all(
      settings.map((s) =>
        this.prisma.globalSettings.upsert({
          where: { key: s.key },
          update: {
            value: s.value as Prisma.InputJsonValue,
            description: s.description,
            updatedById,
            updatedAt: new Date(),
          },
          create: {
            key: s.key,
            value: s.value as Prisma.InputJsonValue,
            description: s.description,
            updatedById,
          },
        }),
      ),
    );

    this.logger.log(`${settings.length} settings updated by ${updatedById}`);

    // Audit log for each setting
    for (const result of results) {
      this.eventLog.logSettingsChanged(updatedById, result.key, undefined, result.value);
    }

    return results.map((s) => ({ key: s.key, value: s.value }));
  }

  // ==================== Tasks ====================

  /**
   * List tasks with pagination
   */
  async listTasks(
    page = 1,
    pageSize = 20,
    status?: string,
    advancedWhere?: Prisma.TaskWhereInput,
    orderBy?: Prisma.TaskOrderByWithRelationInput[],
  ): Promise<PaginatedTasks> {
    const where: Prisma.TaskWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumTaskStatusFilter['equals'];
    }

    const finalWhere = mergeWhere(where, advancedWhere) ?? where;
    const order: Prisma.TaskOrderByWithRelationInput[] =
      orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: Prisma.SortOrder.desc }];

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where: finalWhere,
        orderBy: order,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: { completions: true },
          },
        },
      }),
      this.prisma.task.count({ where: finalWhere }),
    ]);

    return {
      items: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        shortDescription: t.shortDescription,
        rewardAmount: t.rewardAmount.toString(),
        rewardCurrency: t.rewardCurrency,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        completionsCount: t._count.completions,
        createdAt: t.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get task by ID
   */
  async getTask(id: string): Promise<TaskDetailResponse> {
    const task = await this.prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    return {
      id: task.id,
      title: task.title,
      shortDescription: task.shortDescription,
      longDescription: task.longDescription,
      rewardAmount: task.rewardAmount.toString(),
      rewardCurrency: task.rewardCurrency,
      status: task.status,
      autoVerify: task.autoVerify,
      startDate: task.startDate,
      endDate: task.endDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Create task
   */
  async createTask(dto: CreateTaskDto, createdById?: string): Promise<TaskDetailResponse> {
    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        shortDescription: dto.shortDescription,
        longDescription: dto.longDescription,
        rewardAmount: dto.rewardAmount ?? 0,
        rewardCurrency: dto.rewardCurrency ?? 'CJ',
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: (dto.status as Prisma.EnumTaskStatusFilter['equals']) ?? 'DRAFT',
        autoVerify: dto.autoVerify ?? false,
      },
    });

    this.logger.log(`Task "${task.title}" created (id: ${task.id})`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: createdById,
      actorType: 'ADMIN',
      targetId: task.id,
      targetType: 'TASK',
      details: { action: 'TASK_CREATED', title: task.title },
    });

    return {
      id: task.id,
      title: task.title,
      shortDescription: task.shortDescription,
      longDescription: task.longDescription,
      rewardAmount: task.rewardAmount.toString(),
      rewardCurrency: task.rewardCurrency,
      status: task.status,
      autoVerify: task.autoVerify,
      startDate: task.startDate,
      endDate: task.endDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Update task
   */
  async updateTask(
    id: string,
    dto: UpdateTaskDto,
    updatedById?: string,
  ): Promise<TaskDetailResponse> {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        shortDescription: dto.shortDescription,
        longDescription: dto.longDescription,
        rewardAmount: dto.rewardAmount,
        rewardCurrency: dto.rewardCurrency,
        startDate: dto.startDate,
        endDate: dto.endDate,
        status: dto.status as Prisma.EnumTaskStatusFilter['equals'],
        autoVerify: dto.autoVerify,
      },
    });

    this.logger.log(`Task "${task.title}" updated (id: ${task.id})`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: updatedById,
      actorType: 'ADMIN',
      targetId: task.id,
      targetType: 'TASK',
      details: { action: 'TASK_UPDATED', title: task.title },
    });

    return {
      id: task.id,
      title: task.title,
      shortDescription: task.shortDescription,
      longDescription: task.longDescription,
      rewardAmount: task.rewardAmount.toString(),
      rewardCurrency: task.rewardCurrency,
      status: task.status,
      autoVerify: task.autoVerify,
      startDate: task.startDate,
      endDate: task.endDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Delete task
   */
  async deleteTask(id: string, deletedById?: string): Promise<void> {
    const existing = await this.prisma.task.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Task ${id} not found`);
    }

    // Delete completions first
    await this.prisma.taskCompletion.deleteMany({ where: { taskId: id } });
    await this.prisma.task.delete({ where: { id } });

    this.logger.log(`Task ${id} deleted`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: deletedById,
      actorType: 'ADMIN',
      targetId: id,
      targetType: 'TASK',
      details: { action: 'TASK_DELETED', title: existing.title },
    });
  }

  /**
   * List task completions
   */
  async listTaskCompletions(
    taskId: string,
    page = 1,
    pageSize = 20,
    status?: string,
    advancedWhere?: Prisma.TaskCompletionWhereInput,
    orderBy?: Prisma.TaskCompletionOrderByWithRelationInput[],
  ): Promise<{
    items: Array<{
      id: string;
      userId: string;
      username: string | null;
      status: string;
      submittedAt: Date;
      reviewedAt: Date | null;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const where: Prisma.TaskCompletionWhereInput = { taskId };
    if (status) {
      where.status = status as Prisma.EnumTaskCompletionStatusFilter['equals'];
    }

    const finalWhere = mergeWhere(where, advancedWhere) ?? where;
    const order: Prisma.TaskCompletionOrderByWithRelationInput[] =
      orderBy && orderBy.length > 0 ? orderBy : [{ submittedAt: Prisma.SortOrder.desc }];

    const [items, total] = await Promise.all([
      this.prisma.taskCompletion.findMany({
        where: finalWhere,
        orderBy: order,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true } },
        },
      }),
      this.prisma.taskCompletion.count({ where: finalWhere }),
    ]);

    return {
      items: items.map((c) => ({
        id: c.id,
        userId: c.user.id,
        username: c.user.username,
        status: c.status,
        submittedAt: c.submittedAt,
        reviewedAt: c.reviewedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Approve task completion
   */
  async approveTaskCompletion(completionId: string, adminId: string): Promise<void> {
    const completion = await this.prisma.taskCompletion.findUnique({
      where: { id: completionId },
      include: { task: true },
    });

    if (!completion) {
      throw new NotFoundException(`Completion ${completionId} not found`);
    }

    if (completion.status !== 'PENDING') {
      throw new Error(`Completion already ${completion.status}`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Update completion status
      await tx.taskCompletion.update({
        where: { id: completionId },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewedById: adminId,
        },
      });

      // Credit reward to user
      const rewardAmount = Number(completion.task.rewardAmount);
      if (rewardAmount > 0) {
        await tx.user.update({
          where: { id: completion.userId },
          data: {
            balanceCj: { increment: rewardAmount },
          },
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            userId: completion.userId,
            type: 'TASK_REWARD',
            amount: rewardAmount,
            status: 'SUCCESS',
            meta: { taskId: completion.taskId, completionId },
          },
        });
      }
    });

    this.logger.log(`Task completion ${completionId} approved by ${adminId}`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: completionId,
      targetType: 'TASK_COMPLETION',
      details: {
        action: 'TASK_COMPLETION_APPROVED',
        userId: completion.userId,
        taskId: completion.taskId,
        rewardAmount: Number(completion.task.rewardAmount),
      },
    });
  }

  /**
   * Reject task completion
   */
  async rejectTaskCompletion(completionId: string, adminId: string, reason: string): Promise<void> {
    const completion = await this.prisma.taskCompletion.findUnique({
      where: { id: completionId },
    });

    if (!completion) {
      throw new NotFoundException(`Completion ${completionId} not found`);
    }

    if (completion.status !== 'PENDING') {
      throw new Error(`Completion already ${completion.status}`);
    }

    await this.prisma.taskCompletion.update({
      where: { id: completionId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedById: adminId,
        rejectionReason: reason,
      },
    });

    this.logger.log(`Task completion ${completionId} rejected by ${adminId}. Reason: ${reason}`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: adminId,
      actorType: 'ADMIN',
      targetId: completionId,
      targetType: 'TASK_COMPLETION',
      details: {
        action: 'TASK_COMPLETION_REJECTED',
        userId: completion.userId,
        taskId: completion.taskId,
        reason,
      },
    });
  }

  async listTournaments(
    page = 1,
    pageSize = 20,
    status?: TournamentStatus,
    search?: string,
    advancedWhere?: Prisma.TournamentWhereInput,
    orderBy?: Prisma.TournamentOrderByWithRelationInput[],
  ): Promise<PaginatedTournaments> {
    const where = mergeWhere(
      status ? { status } : undefined,
      search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : undefined,
      advancedWhere,
    );

    const [items, total] = await Promise.all([
      this.prisma.tournament.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: orderBy && orderBy.length > 0 ? orderBy : [{ createdAt: 'desc' }],
        include: {
          _count: {
            select: {
              participants: true,
              tables: true,
            },
          },
        },
      }),
      this.prisma.tournament.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        registrationStart: item.registrationStart,
        startTime: item.startTime,
        currentStage: item.currentStage,
        prizePoolActual: item.prizePoolActual.toString(),
        revenue: item.revenue.toString(),
        participantsCount: item._count.participants,
        tablesCount: item._count.tables,
        createdAt: item.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getTournament(id: string): Promise<TournamentDetailResponse> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            participants: true,
            tables: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    return {
      id: tournament.id,
      title: tournament.title,
      config: tournament.config,
      status: tournament.status,
      registrationStart: tournament.registrationStart,
      startTime: tournament.startTime,
      botFillConfig: tournament.botFillConfig,
      currentStage: tournament.currentStage,
      bracketState: tournament.bracketState,
      prizePoolActual: tournament.prizePoolActual.toString(),
      revenue: tournament.revenue.toString(),
      participantsCount: tournament._count.participants,
      tablesCount: tournament._count.tables,
      createdAt: tournament.createdAt,
      updatedAt: tournament.updatedAt,
    };
  }

  async createTournament(
    dto: CreateTournamentDto,
    createdById?: string,
  ): Promise<TournamentDetailResponse> {
    const tournament = await this.prisma.tournament.create({
      data: {
        title: dto.title?.trim() || null,
        config: dto.config ?? {},
        status: dto.status ?? TournamentStatus.DRAFT,
        registrationStart: dto.registrationStart ?? null,
        startTime: dto.startTime ?? null,
        botFillConfig: dto.botFillConfig ?? Prisma.DbNull,
        currentStage: dto.currentStage ?? 0,
        createdById,
      },
    });

    this.eventLog.logTournamentEvent('TOURNAMENT_CREATED', tournament.id, createdById, {
      status: tournament.status,
      title: tournament.title,
    });

    return this.getTournament(tournament.id);
  }

  async updateTournament(
    id: string,
    dto: UpdateTournamentDto,
    updatedById?: string,
  ): Promise<TournamentDetailResponse> {
    const existing = await this.prisma.tournament.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    await this.prisma.tournament.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title?.trim() || null } : {}),
        ...(dto.config !== undefined ? { config: dto.config } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.registrationStart !== undefined
          ? { registrationStart: dto.registrationStart }
          : {}),
        ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
        ...(dto.botFillConfig !== undefined
          ? { botFillConfig: dto.botFillConfig ?? Prisma.DbNull }
          : {}),
        ...(dto.currentStage !== undefined ? { currentStage: dto.currentStage } : {}),
      },
    });

    if (dto.status === TournamentStatus.CANCELLED) {
      this.eventLog.logTournamentEvent('TOURNAMENT_CANCELLED', id, updatedById, {
        action: 'STATUS_UPDATED',
      });
    }

    return this.getTournament(id);
  }

  async deleteTournament(
    id: string,
    deletedById?: string,
  ): Promise<{ id: string; status: string }> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            participants: true,
            tables: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    if (tournament._count.participants > 0 || tournament._count.tables > 0) {
      await this.prisma.tournament.update({
        where: { id },
        data: { status: TournamentStatus.CANCELLED },
      });
      this.eventLog.logTournamentEvent('TOURNAMENT_CANCELLED', id, deletedById, {
        reason: 'Soft cancel because tournament has relations',
      });
      return { id, status: TournamentStatus.CANCELLED };
    }

    await this.prisma.tournament.delete({ where: { id } });
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: deletedById,
      actorType: 'ADMIN',
      targetId: id,
      targetType: 'TOURNAMENT',
      details: { action: 'TOURNAMENT_DELETED' },
      contextTournamentId: id,
    });

    return { id, status: 'DELETED' };
  }

  async publishTournament(id: string, actorId?: string): Promise<TournamentDetailResponse> {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    if (
      tournament.status !== TournamentStatus.DRAFT &&
      tournament.status !== TournamentStatus.ANNOUNCED
    ) {
      throw new BadRequestException('Only DRAFT or ANNOUNCED tournaments can be published');
    }

    await this.prisma.tournament.update({
      where: { id },
      data: { status: TournamentStatus.REGISTRATION },
    });

    this.eventLog.logTournamentEvent('TOURNAMENT_PUBLISHED', id, actorId, {
      previousStatus: tournament.status,
      nextStatus: TournamentStatus.REGISTRATION,
    });

    return this.getTournament(id);
  }

  async addTournamentBots(
    id: string,
    count: number,
    actorId?: string,
  ): Promise<{ id: string; botFillConfig: Prisma.JsonValue | null }> {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    const existingBotConfig =
      tournament.botFillConfig &&
      typeof tournament.botFillConfig === 'object' &&
      !Array.isArray(tournament.botFillConfig)
        ? (tournament.botFillConfig as Prisma.JsonObject)
        : {};

    const nextBotConfig: Prisma.JsonObject = {
      ...existingBotConfig,
      manualBotAddCount: count,
      manualBotAddAt: new Date().toISOString(),
      manualBotAddBy: actorId ?? null,
    };

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: {
        botFillConfig: nextBotConfig,
      },
      select: {
        id: true,
        botFillConfig: true,
      },
    });

    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId,
      actorType: 'ADMIN',
      targetId: id,
      targetType: 'TOURNAMENT',
      details: {
        action: 'TOURNAMENT_ADD_BOTS',
        count,
      },
      contextTournamentId: id,
    });

    return updated;
  }

  async getTournamentTables(id: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    return this.prisma.table.findMany({
      where: { tournamentId: id },
      orderBy: [{ tournamentStage: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        type: true,
        status: true,
        tournamentStage: true,
        createdAt: true,
      },
    });
  }

  async getTournamentParticipants(id: string, page = 1, pageSize = 20) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      throw new NotFoundException(`Tournament ${id} not found`);
    }

    const [items, total] = await Promise.all([
      this.prisma.tournamentParticipant.findMany({
        where: { tournamentId: id },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              tgId: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { registeredAt: 'desc' },
      }),
      this.prisma.tournamentParticipant.count({ where: { tournamentId: id } }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        username: item.user.username,
        tgId: item.user.tgId.toString(),
        status: item.status,
        finalPlace: item.finalPlace,
        prizeAmount: item.prizeAmount?.toString() ?? null,
        registeredAt: item.registeredAt,
        eliminatedAt: item.eliminatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
