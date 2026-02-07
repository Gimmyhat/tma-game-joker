import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  JoinTournamentDto,
  LeaveTournamentDto,
  ListTournamentsDto,
  ReportMatchResultDto,
} from './dto';
import { TournamentService } from './tournament.service';

@Controller('tournaments')
export class TournamentController {
  constructor(private readonly tournamentService: TournamentService) {}

  @Get()
  async listTournaments(@Query() query: ListTournamentsDto) {
    return this.tournamentService.listTournaments(query);
  }

  @Get(':id')
  async getTournament(@Param('id') id: string) {
    return this.tournamentService.getTournament(id);
  }

  @Post(':id/join')
  async joinTournament(@Param('id') id: string, @Body() body: JoinTournamentDto) {
    return this.tournamentService.joinTournament(id, body.userId);
  }

  @Post(':id/leave')
  async leaveTournament(@Param('id') id: string, @Body() body: LeaveTournamentDto) {
    return this.tournamentService.leaveTournament(id, body.userId);
  }

  @Post(':id/matches/:matchId/result')
  async reportMatchResult(
    @Param('id') id: string,
    @Param('matchId') matchId: string,
    @Body() body: ReportMatchResultDto,
  ) {
    return this.tournamentService.reportMatchResult(id, matchId, body.winnerUserId);
  }
}
