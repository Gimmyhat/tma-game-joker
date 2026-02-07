import { IsString } from 'class-validator';

export class ReportMatchResultDto {
  @IsString()
  winnerUserId!: string;
}
