import { Module } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { BotService } from './bot.service';
import { RandomValidMoveStrategy } from './strategies/random-valid-move.strategy';

@Module({
  imports: [GameModule],
  providers: [BotService, RandomValidMoveStrategy],
  exports: [BotService],
})
export class BotModule {}
