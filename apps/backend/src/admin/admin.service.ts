import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AdminRole, User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

export interface UserDetailResponse {
  user: User;
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

    return user;
  }

  /**
   * Update admin password
   */
  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    this.logger.log(`Password updated for user ${userId}`);
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
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { referrerId: userId },
        orderBy: { createdAt: 'desc' },
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
      this.prisma.user.count({ where: { referrerId: userId } }),
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
  async listUsers(filter: UserFilter, page = 1, pageSize = 20): Promise<PaginatedUsers> {
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

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
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

    return results.map((s) => ({ key: s.key, value: s.value }));
  }
}
