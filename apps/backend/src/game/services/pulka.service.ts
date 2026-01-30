import { Injectable } from '@nestjs/common';
import { GameState, GamePhase, GAME_CONSTANTS, resolveTimeoutMs } from '@joker/shared';
import { ConfigService } from '@nestjs/config';
import { ScoringService } from './scoring.service';
import { StateMachineService } from './state-machine.service';
import { GameAuditService } from './game-audit.service';
import { RoundService } from './round.service';
import { TrumpService } from './trump.service';

/**
 * PulkaService - handles pulka completion and starting next pulka
 */
@Injectable()
export class PulkaService {
  constructor(
    private scoringService: ScoringService,
    private stateMachine: StateMachineService,
    private configService: ConfigService,
    private gameAuditService: GameAuditService,
    private roundService: RoundService,
    private trumpService: TrumpService,
  ) {}

  /**
   * Complete a pulka - calculate premiums and prepare next pulka
   */
  completePulka(state: GameState): GameState {
    if (state.phase !== GamePhase.PulkaComplete) {
      throw new Error('Not in pulka complete phase');
    }

    const newState = { ...state };

    // Get rounds for this pulka
    const pulkaRounds = newState.history.filter((h) => h.pulka === newState.pulka);

    // Calculate premiums
    const premiumResult = this.scoringService.calculatePulkaPremiumsAdvanced(
      newState.players,
      pulkaRounds,
    );

    // Apply premium scores
    for (const player of newState.players) {
      const premiumScore = premiumResult.playerScores[player.id] || 0;
      const playerIndex = newState.players.findIndex((p) => p.id === player.id);

      newState.players[playerIndex] = {
        ...player,
        totalScore: player.totalScore + premiumScore,
        pulkaScores: [...player.pulkaScores, player.totalScore + premiumScore],
      };
    }

    // Save results for UI
    newState.lastPulkaResults = {
      pulka: newState.pulka,
      premiums: premiumResult.premiums,
      playerScores: premiumResult.playerScores,
      highestTrickScore: premiumResult.highestTrickScore,
    };

    this.gameAuditService.logAction(newState.id, 'PULKA_COMPLETE', 'system', {
      pulka: newState.pulka,
      premiums: premiumResult.playerScores,
    });

    // Set timeout for the recap phase
    newState.turnStartedAt = Date.now();
    newState.turnTimeoutMs = this.getPulkaRecapTimeoutMs();

    return newState;
  }

  /**
   * Start next pulka after recap
   */
  startNextPulka(state: GameState): GameState {
    if (state.phase !== GamePhase.PulkaComplete) {
      throw new Error('Not in pulka complete phase');
    }

    const newState = { ...state };

    // Check if game finished
    if (newState.round >= GAME_CONSTANTS.TOTAL_ROUNDS) {
      newState.phase = GamePhase.Finished;
      newState.finishedAt = Date.now();

      const { winnerId } = this.scoringService.calculateFinalResults(newState.players);
      newState.winnerId = winnerId;
    } else {
      // Prepare next pulka
      newState.round++;
      newState.pulka++;
      newState.cardsPerPlayer = this.stateMachine.getCardsPerPlayer(newState.round);
      newState.dealerIndex = this.stateMachine.getNextDealerIndex(newState.dealerIndex);
      newState.currentPlayerIndex = this.stateMachine.getFirstPlayerIndex(newState.dealerIndex);

      // Reset spoiled and badge tracking for new pulka
      for (let i = 0; i < 4; i++) {
        newState.players[i] = {
          ...newState.players[i],
          spoiled: false,
          tookAllInPulka: false,
          perfectPassInPulka: false,
        };
      }

      // Deal new cards with partial deal support
      this.roundService.dealNewRound(newState);

      // Use trump selection timeout if partial deal was triggered
      newState.turnTimeoutMs =
        newState.phase === GamePhase.TrumpSelection
          ? this.trumpService.getTrumpSelectionTimeoutMs()
          : this.getTurnTimeoutMs();
    }

    newState.table = [];
    newState.turnStartedAt = Date.now();

    return newState;
  }

  private getTurnTimeoutMs(): number {
    return resolveTimeoutMs(
      this.configService.get<string>('TURN_TIMEOUT_MS'),
      GAME_CONSTANTS.TURN_TIMEOUT_MS,
    );
  }

  private getPulkaRecapTimeoutMs(): number {
    return resolveTimeoutMs(
      this.configService.get<string>('PULKA_RECAP_TIMEOUT_MS'),
      GAME_CONSTANTS.PULKA_RECAP_TIMEOUT_MS,
    );
  }
}
