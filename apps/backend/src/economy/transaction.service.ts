import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction, TxType, TxStatus, Prisma } from '@prisma/client';
import Decimal from 'decimal.js';

export interface TransactionFilter {
  userId?: string;
  type?: TxType;
  status?: TxStatus;
  fromDate?: Date;
  toDate?: Date;
}

export interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get transaction by ID
   */
  async getById(id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, tgId: true },
        },
        initiatedBy: {
          select: { id: true, username: true },
        },
      },
    });
  }

  /**
   * Get transaction by idempotency key
   */
  async getByIdempotencyKey(key: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { idempotencyKey: key },
    });
  }

  /**
   * List transactions with filtering and pagination
   */
  async list(filter: TransactionFilter, page = 1, pageSize = 20): Promise<PaginatedTransactions> {
    const where: Prisma.TransactionWhereInput = {};

    if (filter.userId) {
      where.userId = filter.userId;
    }
    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.status) {
      where.status = filter.status;
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

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { id: true, username: true, tgId: true },
          },
        },
      }),
      this.prisma.transaction.count({ where }),
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
   * Get pending withdrawals
   */
  async getPendingWithdrawals(page = 1, pageSize = 20): Promise<PaginatedTransactions> {
    return this.list(
      {
        type: 'WITHDRAW',
        status: 'PENDING',
      },
      page,
      pageSize,
    );
  }

  /**
   * Create withdrawal request
   */
  async createWithdrawal(
    userId: string,
    amount: number,
    walletAddress?: string,
    idempotencyKey?: string,
  ): Promise<Transaction> {
    const amountDecimal = new Decimal(amount);

    if (amountDecimal.lte(0)) {
      throw new BadRequestException('Amount must be positive');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existing = await this.getByIdempotencyKey(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    // Atomic: check balance and create pending withdrawal
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const currentBalance = new Decimal(user.balanceCj.toString());
      if (currentBalance.lt(amountDecimal)) {
        throw new BadRequestException('Insufficient balance');
      }

      // Hold the amount immediately
      const newBalance = currentBalance.minus(amountDecimal);
      await tx.user.update({
        where: { id: userId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      // Create pending withdrawal
      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: amountDecimal.negated().toFixed(2),
          type: 'WITHDRAW',
          status: 'PENDING',
          balanceAfter: newBalance.toFixed(2),
          idempotencyKey,
          meta: walletAddress ? { walletAddress } : undefined,
        },
      });

      return transaction;
    });

    this.logger.log(
      `Withdrawal request created: ${result.id} for user ${userId}, amount ${amount}`,
    );
    return result;
  }

  /**
   * Approve withdrawal (admin action)
   */
  async approveWithdrawal(transactionId: string, adminId: string): Promise<Transaction> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (tx.type !== 'WITHDRAW') {
      throw new BadRequestException('Transaction is not a withdrawal');
    }

    if (tx.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal already ${tx.status}`);
    }

    const updated = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'SUCCESS',
        processedAt: new Date(),
        initiatedById: adminId,
      },
    });

    this.logger.log(`Withdrawal ${transactionId} approved by admin ${adminId}`);
    return updated;
  }

  /**
   * Reject withdrawal (admin action) - refund to user
   */
  async rejectWithdrawal(
    transactionId: string,
    adminId: string,
    reason: string,
  ): Promise<Transaction> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    if (tx.type !== 'WITHDRAW') {
      throw new BadRequestException('Transaction is not a withdrawal');
    }

    if (tx.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal already ${tx.status}`);
    }

    // Refund the held amount
    const refundAmount = new Decimal(tx.amount.toString()).abs();

    const result = await this.prisma.$transaction(async (prisma) => {
      // Update user balance
      const user = await prisma.user.findUnique({
        where: { id: tx.userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${tx.userId} not found`);
      }

      const newBalance = new Decimal(user.balanceCj.toString()).plus(refundAmount);
      await prisma.user.update({
        where: { id: tx.userId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      // Update transaction
      const updated = await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'CANCELLED',
          processedAt: new Date(),
          initiatedById: adminId,
          rejectionReason: reason,
        },
      });

      // Create refund transaction
      await prisma.transaction.create({
        data: {
          userId: tx.userId,
          amount: refundAmount.toFixed(2),
          type: 'REFUND',
          status: 'SUCCESS',
          balanceAfter: newBalance.toFixed(2),
          referenceId: transactionId,
          referenceType: 'TRANSACTION',
          initiatedById: adminId,
          comment: `Refund for rejected withdrawal: ${reason}`,
        },
      });

      return updated;
    });

    this.logger.log(`Withdrawal ${transactionId} rejected by admin ${adminId}. Reason: ${reason}`);
    return result;
  }

  /**
   * Get user transaction history
   */
  async getUserHistory(userId: string, page = 1, pageSize = 20): Promise<PaginatedTransactions> {
    return this.list({ userId }, page, pageSize);
  }

  /**
   * Create deposit (typically from external payment system)
   */
  async createDeposit(
    userId: string,
    amount: number,
    idempotencyKey?: string,
    meta?: Record<string, unknown>,
  ): Promise<Transaction> {
    const amountDecimal = new Decimal(amount);

    if (amountDecimal.lte(0)) {
      throw new BadRequestException('Amount must be positive');
    }

    if (idempotencyKey) {
      const existing = await this.getByIdempotencyKey(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const newBalance = new Decimal(user.balanceCj.toString()).plus(amountDecimal);

      await tx.user.update({
        where: { id: userId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: amountDecimal.toFixed(2),
          type: 'DEPOSIT',
          status: 'SUCCESS',
          balanceAfter: newBalance.toFixed(2),
          idempotencyKey,
          meta: meta as Prisma.InputJsonValue,
        },
      });

      return transaction;
    });

    this.logger.log(`Deposit ${result.id} for user ${userId}, amount ${amount}`);
    return result;
  }
}
