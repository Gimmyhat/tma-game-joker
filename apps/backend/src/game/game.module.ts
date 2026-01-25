import { Module } from '@nestjs/common';
import { DeckService } from './services/deck.service';
import { MoveValidator } from './validators/move.validator';
import { BetValidator } from './validators/bet.validator';
import { ScoringService } from './services/scoring.service';
import { StateMachineService } from './services/state-machine.service';
import { GameEngineService } from './services/game-engine.service';
import { GameAuditService } from './services/game-audit.service';
import { GameCleanupService } from './services/game-cleanup.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [PrismaModule, DatabaseModule],
  providers: [
    DeckService,
    MoveValidator,
    BetValidator,
    ScoringService,
    StateMachineService,
    GameEngineService,
    GameAuditService,
    GameCleanupService,
  ],
  exports: [
    DeckService,
    MoveValidator,
    BetValidator,
    ScoringService,
    StateMachineService,
    GameEngineService,
    GameAuditService,
  ],
})
export class GameModule {}
