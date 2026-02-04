import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import Decimal from 'decimal.js';

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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user balance
   */
  async getBalance(userId: string): Promise<BalanceResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
  async getOrCreateUser(tgId: bigint, username?: string): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { tgId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          tgId,
          username,
        },
      });
      this.logger.log(`Created new user ${user.id} for tgId ${tgId}`);
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
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const currentBalance = new Decimal(user.balanceCj.toString());
      if (currentBalance.lt(amountDecimal)) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = currentBalance.minus(amountDecimal);

      // Update balance
      await tx.user.update({
        where: { id: userId },
        data: { balanceCj: newBalance.toFixed(2) },
      });

      // Create hold transaction
      const transaction = await tx.transaction.create({
        data: {
          userId,
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

    this.logger.log(`Hold ${amount} CJ for user ${userId}, table ${referenceId}`);

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

    this.logger.log(`Released hold ${holdId} for user ${userId}, +${amount} CJ`);

    return {
      userId,
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

    return {
      userId,
      balance: result,
      currency: 'CJ',
    };
  }
}
