import { IsNumber, IsString } from 'class-validator';

export class ReferralStatsDto {
  @IsNumber()
  referrals!: number;

  @IsNumber()
  totalEarnings!: number;

  @IsString()
  currency!: string;

  @IsString()
  referralLink!: string;
}
