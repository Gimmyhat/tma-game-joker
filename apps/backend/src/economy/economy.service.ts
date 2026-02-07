import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import Decimal from 'decimal.js';
import { EventLogService } from '../event-log/event-log.service';

export interface BalanceResult {
  userId: string;
  balance: Decimal;
  currency: string;
}

export interface HoldResult {
  success: boolean;
  holdId: string;
  newBalance: Decimal;
}

@Injectable()
export class EconomyService {
  private readonly logger = new Logger(EconomyService.name);
  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventLog: EventLogService,
  ) {}

  async resolveUserId(userId: string, createIfTelegram = false): Promise<string> {
    if (EconomyService.UUID_REGEX.test(userId)) {
      return userId;
    }

    if (!/^\d+$/.test(userId)) {
      if (process.env.E2E_TEST === 'true') {
        return userId;
      }
      throw new BadRequestException('userId must be UUID or Telegram numeric ID');
    }

    const tgId = BigInt(userId);

    if (createIfTelegram) {
      const user = await this.getOrCreateUser(tgId);
      return user.id;
    }

    const user = await this.prisma.user.findUnique({
      where: { tgId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return user.id;
  }

  /**
   * Get user balance
   */
  async getBalance(userId: string): Promise<BalanceResult> {
    const resolvedUserId = await this.resolveUserId(userId, true);
    const user = await this.prisma.user.findUnique({
      where: { id: resolvedUserId },
      select: { id: true, balanceCj: true },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return {
      userId: user.id,
      balance: new Decimal(user.balanceCj.toString()),
      currency: 'CJ',
    };
  }

  /**
   * Get user by Telegram ID, create if not exists
   */
  async getOrCreateUser(tgId: bigint, username?: string, startParam?: string): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { tgId },
    });

    if (!user) {
      let referrerId: string | null = null;

      if (startParam) {
        // Try to find referrer by code
        const referrer = await this.prisma.user.findUnique({
          where: { referralCode: startParam },
          select: { id: true },
        });
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      user = await this.prisma.user.create({
        data: {
          tgId,
          username,
          referrerId,
        },
      });
      this.logger.log(`Created new user ${user.id} for tgId ${tgId} (referrer: ${referrerId})`);
    }

    return user;
  }

  /**
   * Check if user has sufficient balance
   */
  async hasSufficientBalance(userId: string, amount: number): Promise<boolean> {
    const { balance } = await this.getBalance(userId);
    return balance.gte(amount);
  }

  /**
   * Hold (reserve) amount for a bet - atomic operation
   * Creates a BET_HOLD transaction with PENDING status
   */
  async holdForBet(
    userId: string,
    amount: number,
    referenceId: string,
    idempotencyKey?: string,
  ): Promise<HoldResult> {
    const resolvedUserId = await this.resolveUserId(userId, true);
    const amountDecimal = new Decimal(amount);

    if (amountDecimal.lte(0)) {
      throw new BadRequestException('Amount must be positive');
    }

    // Check idempotency
    if (idempotencyKey) {
      const existingTx = await this.prisma.transaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        return {
          success: existingTx.status === 'SUCCESS',
          holdId: existingTx.id,
          newBalance: new Decimal(existingTx.balanceAfter?.toString() || '0'),
        };
      }
    }

    // Atomic debit with balance check
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock row and check balance
      const user = await tx.user.findUnique({
        where: { id: resolvedUserId },
      });

      if (!user) {
        throw new NotFoundException(`User ${resolvedUserId} not found`);
      }

      const currentBalance = new Decimal(user.balanceCj.toString());
      if (currentBalance.lt(amountDecimal)) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = currentBalance.minus(amountDecimal);

      // Update balance
      await tx.user.update({
        where: { id: resolvedUserId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      // Create hold transaction
      const transaction = await tx.transaction.create({
        data: {
          userId: resolvedUserId,
          amount: amountDecimal.negated().toFixed(2), // Negative for debit
          type: 'BET_HOLD',
          status: 'SUCCESS',
          balanceAfter: newBalance.toFixed(2),
          referenceId,
          referenceType: 'TABLE',
          idempotencyKey,
        },
      });

      return { transaction, newBalance };
    });

    this.logger.log(`Hold ${amount} CJ for user ${resolvedUserId}, table ${referenceId}`);

    return {
      success: true,
      holdId: result.transaction.id,
      newBalance: result.newBalance,
    };
  }

  /**
   * Release a bet hold (refund)
   */
  async releaseBetHold(
    userId: string,
    amount: number,
    holdId: string,
    idempotencyKey?: string,
  ): Promise<BalanceResult> {
    const resolvedUserId = await this.resolveUserId(userId);
    const amountDecimal = new Decimal(amount);

    if (idempotencyKey) {
      const existingTx = await this.prisma.transaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        return {
          userId: resolvedUserId,
          balance: new Decimal(existingTx.balanceAfter?.toString() || '0'),
          currency: 'CJ',
        };
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: resolvedUserId },
      });

      if (!user) {
        throw new NotFoundException(`User ${resolvedUserId} not found`);
      }

      const newBalance = new Decimal(user.balanceCj.toString()).plus(amountDecimal);

      await tx.user.update({
        where: { id: resolvedUserId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      await tx.transaction.create({
        data: {
          userId: resolvedUserId,
          amount: amountDecimal.toFixed(2),
          type: 'BET_RELEASE',
          status: 'SUCCESS',
          balanceAfter: newBalance.toFixed(2),
          referenceId: holdId,
          referenceType: 'TRANSACTION',
          idempotencyKey,
        },
      });

      return newBalance;
    });

    this.logger.log(`Released hold ${holdId} for user ${resolvedUserId}, +${amount} CJ`);

    return {
      userId: resolvedUserId,
      balance: result,
      currency: 'CJ',
    };
  }

  /**
   * Payout winnings
   */
  async payoutWinnings(
    userId: string,
    amount: number,
    referenceId: string,
    idempotencyKey?: string,
  ): Promise<BalanceResult> {
    const amountDecimal = new Decimal(amount);

    if (idempotencyKey) {
      const existingTx = await this.prisma.transaction.findUnique({
        where: { idempotencyKey },
      });
      if (existingTx) {
        return {
          userId,
          balance: new Decimal(existingTx.balanceAfter?.toString() || '0'),
          currency: 'CJ',
        };
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

      await tx.transaction.create({
        data: {
          userId,
          amount: amountDecimal.toFixed(2),
          type: 'WIN_PAYOUT',
          status: 'SUCCESS',
          balanceAfter: newBalance.toFixed(2),
          referenceId,
          referenceType: 'TABLE',
          idempotencyKey,
        },
      });

      return newBalance;
    });

    this.logger.log(`Payout ${amount} CJ to user ${userId} for table ${referenceId}`);

    return {
      userId,
      balance: result,
      currency: 'CJ',
    };
  }

  /**
   * Admin balance adjustment (positive or negative)
   */
  async adjustBalance(
    userId: string,
    amount: number,
    initiatedById: string,
    comment?: string,
  ): Promise<BalanceResult> {
    const amountDecimal = new Decimal(amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const currentBalance = new Decimal(user.balanceCj.toString());
      const newBalance = currentBalance.plus(amountDecimal);

      if (newBalance.lt(0)) {
        throw new BadRequestException('Resulting balance cannot be negative');
      }

      await tx.user.update({
        where: { id: userId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      await tx.transaction.create({
        data: {
          userId,
          amount: amountDecimal.toFixed(2),
          type: 'ADMIN_ADJUSTMENT',
          status: 'SUCCESS',
          balanceAfter: newBalance.toFixed(2),
          initiatedById,
          comment,
        },
      });

      return newBalance;
    });

    this.logger.log(
      `Admin ${initiatedById} adjusted balance for ${userId} by ${amount} CJ. Comment: ${comment}`,
    );

    // Audit log
    this.eventLog.logBalanceAdjustment(initiatedById, userId, amount, comment);

    return {
      userId,
      balance: result,
      currency: 'CJ',
    };
  }

  /**
   * Payout referral bonus
   */
  async payoutReferralBonus(
    userId: string,
    amount: number,
    referenceId: string,
    comment?: string,
  ): Promise<BalanceResult> {
    const amountDecimal = new Decimal(amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const currentBalance = new Decimal(user.balanceCj.toString());
      const newBalance = currentBalance.plus(amountDecimal);

      await tx.user.update({
        where: { id: userId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      await tx.transaction.create({
        data: {
          userId,
          amount: amountDecimal.toFixed(2),
          type: 'REFERRAL_BONUS',
          status: 'SUCCESS',
          balanceAfter: newBalance.toFixed(2),
          referenceId,
          referenceType: 'GAME',
          comment,
        },
      });

      return newBalance;
    });

    this.logger.log(
      `Referral bonus ${amount} CJ for user ${userId} (Game ${referenceId}). Comment: ${comment}`,
    );

    return {
      userId,
      balance: result,
      currency: 'CJ',
    };
  }

  /**
   * Payout task reward
   */
  async payoutTaskReward(
    userId: string,
    amount: number,
    taskId: string,
  ): Promise<{ balanceResult: BalanceResult; transactionId: string }> {
    const amountDecimal = new Decimal(amount);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const currentBalance = new Decimal(user.balanceCj.toString());
      const newBalance = currentBalance.plus(amountDecimal);

      await tx.user.update({
        where: { id: userId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      const transaction = await tx.transaction.create({
        data: {
          userId,
          amount: amountDecimal.toFixed(2),
          type: 'TASK_REWARD',
          status: 'SUCCESS',
          balanceAfter: newBalance.toFixed(2),
          referenceId: taskId,
          referenceType: 'TASK',
        },
      });

      return { newBalance, transactionId: transaction.id };
    });

    this.logger.log(`Payout task reward ${amount} CJ to user ${userId} for task ${taskId}`);

    return {
      balanceResult: {
        userId,
        balance: result.newBalance,
        currency: 'CJ',
      },
      transactionId: result.transactionId,
    };
  }
}
