import { IsString } from 'class-validator';

export class LeaveTournamentDto {
  @IsString()
  userId!: string;
}
