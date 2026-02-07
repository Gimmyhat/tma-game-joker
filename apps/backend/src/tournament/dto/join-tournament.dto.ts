import { IsString } from 'class-validator';

export class JoinTournamentDto {
  @IsString()
  userId!: string;
}
