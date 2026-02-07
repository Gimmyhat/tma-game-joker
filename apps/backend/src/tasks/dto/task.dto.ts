import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
  Min,
  IsDateString,
  IsUUID,
} from 'class-validator';

export enum TaskVerificationType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
  LINK_CLICK = 'LINK_CLICK',
  CODE_ENTRY = 'CODE_ENTRY',
}

export enum TaskStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsNumber()
  @Min(0)
  rewardAmount!: number;

  @IsOptional()
  @IsString()
  rewardCurrency?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  autoVerify?: boolean;

  @IsOptional()
  @IsString()
  verificationType?: string; // e.g. 'SOCIAL', 'GAMEPLAY', 'REFERRAL', or specific types

  @IsOptional()
  @IsObject()
  verificationConfig?: Record<string, any>;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  longDescription?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rewardAmount?: number;

  @IsOptional()
  @IsString()
  rewardCurrency?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  autoVerify?: boolean;

  @IsOptional()
  @IsString()
  verificationType?: string;

  @IsOptional()
  @IsObject()
  verificationConfig?: Record<string, any>;
}

export class SubmitTaskCompletionDto {
  @IsOptional()
  @IsObject()
  proofData?: Record<string, any>;
}

export class ReviewTaskCompletionDto {
  @IsEnum(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
