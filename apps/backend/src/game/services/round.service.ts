import { Injectable } from '@nestjs/common';
import {
  GameState,
  GamePhase,
  Suit,
  GAME_CONSTANTS,
  resolveTimeoutMs,
  RoundHistory,
  Card,
  checkTookAll,
  checkPerfectPass,
} from '@joker/shared';
import { ConfigService } from '@nestjs/config';
import { DeckService } from './deck.service';
import { ScoringService } from './scoring.service';
import { StateMachineService } from './state-machine.service';
import { GameAuditService } from './game-audit.service';
import { TrumpService } from './trump.service';

/**
 * RoundService - handles round completion and dealing new rounds
 */
@Injectable()
export class RoundService {
  constructor(
    private deckService: DeckService,
    private scoringService: ScoringService,
    private stateMachine: StateMachineService,
    private configService: ConfigService,
    private gameAuditService: GameAuditService,
    private trumpService: TrumpService,
  ) {}

  /**
   * Complete a round - calculate scores and prepare next round
   */
  completeRound(state: GameState): GameState {
    if (state.phase !== GamePhase.RoundComplete) {
      throw new Error('Not in round complete phase');
    }

    const newState = { ...state };

    // Calculate round scores
    const roundResults = this.scoringService.calculateRoundScores(
      newState.players,
      newState.cardsPerPlayer,
    );

    // Apply scores and check for spoilage, track badge flags
    for (const result of roundResults) {
      const playerIndex = newState.players.findIndex((p) => p.id === result.playerId);
      const player = newState.players[playerIndex];
      const bet = player.bet ?? 0;
      const tricks = player.tricks;

      newState.players[playerIndex] = {
        ...player,
        roundScores: [...player.roundScores, result.score],
        totalScore: player.totalScore + result.score,
        spoiled: player.spoiled || !result.tookOwn,
        tookAllInPulka: player.tookAllInPulka || checkTookAll(bet, tricks, newState.cardsPerPlayer),
        perfectPassInPulka: player.perfectPassInPulka || checkPerfectPass(bet, tricks),
      };
    }

    // Save round history
    const roundHistory: RoundHistory = {
      round: newState.round,
      pulka: newState.pulka,
      cardsPerPlayer: newState.cardsPerPlayer,
      trump: newState.trump,
      bets: Object.fromEntries(newState.players.map((p) => [p.id, p.bet ?? 0])),
      tricks: Object.fromEntries(newState.players.map((p) => [p.id, p.tricks])),
      scores: Object.fromEntries(roundResults.map((r) => [r.playerId, r.score])),
      tableHistory: [],
      jokerCounts: Object.fromEntries(
        newState.players.map((p) => {
          const count = p.jokerCountPerRound[p.jokerCountPerRound.length - 1] ?? 0;
          return [p.id, count as 0 | 1 | 2];
        }),
      ),
    };
    newState.history.push(roundHistory);

    this.gameAuditService.logAction(newState.id, 'ROUND_COMPLETE', 'system', {
      round: newState.round,
      scores: roundHistory.scores,
    });

    // Check if pulka complete
    if (this.stateMachine.isPulkaComplete(newState)) {
      newState.phase = GamePhase.PulkaComplete;
    } else {
      // Prepare next round
      newState.round++;
      newState.cardsPerPlayer = this.stateMachine.getCardsPerPlayer(newState.round);
      newState.dealerIndex = this.stateMachine.getNextDealerIndex(newState.dealerIndex);
      newState.currentPlayerIndex = this.stateMachine.getFirstPlayerIndex(newState.dealerIndex);

      // Deal new cards with partial deal support
      this.dealNewRound(newState);

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

  /**
   * Deal cards for a new round, with partial deal support for trump selection
   */
  dealNewRound(state: GameState): void {
    const deck = this.deckService.shuffle(this.deckService.createDeck());
    const { hands, remainingDeck } = this.deckService.deal(deck, 4, state.cardsPerPlayer);

    // Determine trump card (for non-9-card rounds)
    let trumpCard: Card | null = null;
    let trump: Suit | null = null;

    if (state.cardsPerPlayer !== 9 && remainingDeck.length > 0) {
      const trumpResult = this.deckService.determineTrumpWithCard(remainingDeck);
      trump = trumpResult.trump;
      trumpCard = trumpResult.trumpCard;
    }

    // Check if trump selection is needed
    const trigger = this.stateMachine.getTrumpSelectionTrigger({
      ...state,
      trumpCard,
    });

    if (trigger) {
      // Use TrumpService for partial deal
      this.trumpService.setupTrumpSelection(state, hands, trumpCard, trigger);
    } else {
      // Normal full deal
      for (let i = 0; i < 4; i++) {
        state.players[i] = {
          ...state.players[i],
          hand: hands[i],
          bet: null,
          tricks: 0,
        };

        const jokerCount = hands[i].filter((card) => card.type === 'joker').length as 0 | 1 | 2;
        state.players[i].hadJokerInRounds.push(jokerCount > 0);
        state.players[i].jokerCountPerRound.push(jokerCount);
      }

      state.trump = trump;
      state.trumpCard = trumpCard;
      state.trumpSelection = undefined;
      state.phase = GamePhase.Betting;
    }

    this.gameAuditService.logAction(state.id, 'ROUND_START', 'system', {
      round: state.round,
      pulka: state.pulka,
      cardsPerPlayer: state.cardsPerPlayer,
      dealerId: state.players[state.dealerIndex]?.id ?? null,
      trump: state.trump,
      trumpSelection: state.trumpSelection ? { trigger: state.trumpSelection.trigger } : null,
      hands: state.players.map((player) => ({
        playerId: player.id,
        hand: player.hand.map((card) => ({
          id: card.id,
          type: card.type,
          suit: card.type === 'standard' ? card.suit : null,
          rank: card.type === 'standard' ? card.rank : null,
        })),
      })),
    });
  }

  private getTurnTimeoutMs(): number {
    return resolveTimeoutMs(
      this.configService.get<string>('TURN_TIMEOUT_MS'),
      GAME_CONSTANTS.TURN_TIMEOUT_MS,
    );
  }
}
