import { Module, forwardRef } from '@nestjs/common';
import { GameModule } from '../game/game.module';
import { BotService } from './bot.service';
import { RandomValidMoveStrategy } from './strategies/random-valid-move.strategy';

@Module({
  imports: [forwardRef(() => GameModule)],
  providers: [BotService, RandomValidMoveStrategy],
  exports: [BotService],
})
export class BotModule {}
