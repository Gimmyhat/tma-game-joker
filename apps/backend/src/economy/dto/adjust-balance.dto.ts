import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class AdjustBalanceDto {
  @IsUUID()
  userId!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsUUID()
  initiatedById?: string;
}

export class WithdrawRequestDto {
  @IsUUID()
  userId!: string;

  @IsNumber()
  amount!: number;

  @IsOptional()
  @IsString()
  walletAddress?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
