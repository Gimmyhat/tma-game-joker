import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EconomyService } from '../economy/economy.service';
import { Decimal } from 'decimal.js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  // 10% from the house rake/fee goes to referrer (example config)
  private readonly REFERRAL_PERCENTAGE = 0.1;

  constructor(
    private readonly prisma: PrismaService,
    private readonly economyService: EconomyService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Ensure user has a referral code
   */
  async ensureReferralCode(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, tgId: true },
    });

    if (user?.referralCode) {
      return user.referralCode;
    }

    // Generate simple code: "ref_" + tgId
    const code = `ref_${user?.tgId}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
    });

    return code;
  }

  /**
   * Get referral stats for a user
   */
  async getReferralStats(userIdOrTgId: string | bigint) {
    const userId = await this.economyService.resolveUserId(userIdOrTgId.toString(), true);
    const code = await this.ensureReferralCode(userId);
    const botName = this.configService.get('TELEGRAM_BOT_NAME') || 'JokerGameBot';
    const referralLink = `https://t.me/${botName}?startapp=${code}`;

    const referrals = await this.prisma.user.count({
      where: { referrerId: userId },
    });

    // Sum up REFERRAL_BONUS transactions
    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'REFERRAL_BONUS',
        status: 'SUCCESS',
      },
      _sum: {
        amount: true,
      },
    });

    const totalEarnings = new Decimal(result._sum.amount || 0);

    return {
      referrals,
      totalEarnings: totalEarnings.toNumber(),
      currency: 'CJ',
      referralLink,
    };
  }

  /**
   * Process referral bonus for a completed game/fee
   * @param userId The user who paid the fee (the referee)
   * @param feeAmount The fee amount taken by the house
   * @param referenceId Game/Table ID
   */
  async processReferralBonus(
    userId: string,
    feeAmount: number,
    referenceId: string,
  ): Promise<void> {
    if (feeAmount <= 0) return;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referrerId: true },
    });

    if (!user || !user.referrerId) {
      return;
    }

    const bonusAmount = new Decimal(feeAmount).mul(this.REFERRAL_PERCENTAGE);

    // Minimum amount check (e.g. 0.01)
    if (bonusAmount.lt(0.01)) {
      return;
    }

    try {
      // Credit bonus to referrer
      await this.economyService.payoutReferralBonus(
        user.referrerId,
        bonusAmount.toNumber(),
        referenceId,
        `Referral bonus from user ${userId} (Game ${referenceId})`,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to process referral bonus for referrer ${user.referrerId}: ${reason}`,
      );
    }
  }
}
