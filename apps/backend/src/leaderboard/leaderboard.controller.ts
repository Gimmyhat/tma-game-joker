import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async listLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.leaderboardService.listLeaderboard(query);
  }
}
