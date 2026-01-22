import { Module } from '@nestjs/common';
import { DeckService } from './services/deck.service';
import { MoveValidator } from './validators/move.validator';
import { BetValidator } from './validators/bet.validator';
import { ScoringService } from './services/scoring.service';
import { StateMachineService } from './services/state-machine.service';
import { GameEngineService } from './services/game-engine.service';

@Module({
  providers: [
    DeckService,
    MoveValidator,
    BetValidator,
    ScoringService,
    StateMachineService,
    GameEngineService,
  ],
  exports: [
    DeckService,
    MoveValidator,
    BetValidator,
    ScoringService,
    StateMachineService,
    GameEngineService,
  ],
})
export class GameModule {}
