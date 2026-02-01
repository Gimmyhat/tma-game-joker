import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  GamePhase,
  Player,
  Suit,
  TableCard,
  JokerOption,
  GAME_CONSTANTS,
  resolveTimeoutMs,
  TrumpDecision,
  Card,
  FinalGameResults,
} from '@joker/shared';
import { ConfigService } from '@nestjs/config';
import { DeckService } from './deck.service';
import { MoveValidator } from '../validators/move.validator';
import { BetValidator } from '../validators/bet.validator';
import { ScoringService } from './scoring.service';
import { StateMachineService } from './state-machine.service';
import { GameAuditService } from './game-audit.service';
import { TrumpService } from './trump.service';
import { RoundService } from './round.service';
import { PulkaService } from './pulka.service';

/**
 * GameEngineService - Main orchestrator for game state transitions
 * Delegates specialized logic to TrumpService, RoundService, PulkaService
 */
@Injectable()
export class GameEngineService {
  constructor(
    private deckService: DeckService,
    private moveValidator: MoveValidator,
    private betValidator: BetValidator,
    private scoringService: ScoringService,
    private stateMachine: StateMachineService,
    private configService: ConfigService,
    private gameAuditService: GameAuditService,
    private trumpService: TrumpService,
    private roundService: RoundService,
    private pulkaService: PulkaService,
  ) {}

  /**
   * Create a new game with 4 players
   */
  createGame(
    playerIds: string[],
    playerNames: string[],
    predefinedDealerIndex?: number,
  ): GameState {
    if (playerIds.length !== 4) {
      throw new Error('Game requires exactly 4 players');
    }

    // Perform tuzovanie to determine first dealer if not predefined
    const dealerIndex =
      predefinedDealerIndex !== undefined
        ? predefinedDealerIndex
        : this.deckService.tuzovanie(4).dealerIndex;

    const players: Player[] = playerIds.map((id, index) => ({
      id,
      name: playerNames[index] || `Player ${index + 1}`,
      isBot: id.startsWith('bot-'),
      connected: !id.startsWith('bot-'),
      hand: [],
      bet: null,
      tricks: 0,
      roundScores: [],
      pulkaScores: [],
      totalScore: 0,
      spoiled: false,
      hadJokerInRounds: [],
      jokerCountPerRound: [],
    }));

    const scoreSheetPlayers = this.orderPlayersForScoreSheet(players, dealerIndex);
    const scoreSheetDealerIndex = scoreSheetPlayers.length - 1;

    const gameState: GameState = {
      id: uuidv4(),
      players: scoreSheetPlayers,
      dealerIndex: scoreSheetDealerIndex,
      currentPlayerIndex: this.stateMachine.getFirstPlayerIndex(scoreSheetDealerIndex),
      round: 1,
      pulka: 1,
      cardsPerPlayer: 1,
      phase: GamePhase.Waiting,
      trump: null,
      trumpCard: null,
      table: [],
      turnStartedAt: Date.now(),
      turnTimeoutMs: this.getTurnTimeoutMs(),
      history: [],
      lastPulkaResults: null,
      createdAt: Date.now(),
      finishedAt: null,
      winnerId: null,
    };

    return gameState;
  }

  /**
   * Perform tuzovanie to select dealer
   */
  tuzovanie(playersCount: number, startPlayerIndex?: number) {
    return this.deckService.tuzovanie(playersCount, startPlayerIndex);
  }

  /**
   * Start the game - deal cards and begin first round
   */
  startGame(state: GameState): GameState {
    const newState = { ...state };

    // Deal cards for round 1
    const deck = this.deckService.shuffle(this.deckService.createDeck());
    const { hands, remainingDeck } = this.deckService.deal(deck, 4, newState.cardsPerPlayer);

    // Determine trump (for non-9-card rounds)
    let trumpCard: Card | null = null;
    let trump: Suit | null = null;

    if (newState.cardsPerPlayer !== 9 && remainingDeck.length > 0) {
      const trumpResult = this.deckService.determineTrumpWithCard(remainingDeck);
      trump = trumpResult.trump;
      trumpCard = trumpResult.trumpCard;
    }

    // Check if trump selection is needed
    const trigger = this.stateMachine.getTrumpSelectionTrigger({
      ...newState,
      cardsPerPlayer: newState.cardsPerPlayer,
      trumpCard,
    });

    if (trigger) {
      // Use TrumpService for partial deal
      this.trumpService.setupTrumpSelection(newState, hands, trumpCard, trigger);
    } else {
      // Normal deal: all cards to all players
      for (let i = 0; i < 4; i++) {
        newState.players[i] = {
          ...newState.players[i],
          hand: hands[i],
          bet: null,
          tricks: 0,
        };

        // Check for joker in hand
        const jokerCount = hands[i].filter((card) => card.type === 'joker').length as 0 | 1 | 2;
        newState.players[i].hadJokerInRounds.push(jokerCount > 0);
        newState.players[i].jokerCountPerRound.push(jokerCount);
      }

      newState.trump = trump;
      newState.trumpCard = trumpCard;
      newState.phase = this.stateMachine.transition(newState, { type: 'GAME_START' });
      newState.currentPlayerIndex = this.stateMachine.getFirstPlayerIndex(newState.dealerIndex);
    }

    newState.turnStartedAt = Date.now();
    newState.turnTimeoutMs =
      newState.phase === GamePhase.TrumpSelection
        ? this.trumpService.getTrumpSelectionTimeoutMs()
        : this.getTurnTimeoutMs();

    // Log start
    this.gameAuditService.logAction(newState.id, 'GAME_START', 'system', {
      round: 1,
      pulka: 1,
      trump: newState.trump,
      trumpSelection: newState.trumpSelection
        ? {
            trigger: newState.trumpSelection.trigger,
            chooserPlayerId: newState.trumpSelection.chooserPlayerId,
          }
        : null,
    });

    // Log round start with dealer and initial hands
    this.gameAuditService.logAction(newState.id, 'ROUND_START', 'system', {
      round: 1,
      pulka: 1,
      cardsPerPlayer: newState.cardsPerPlayer,
      dealerId: newState.players[newState.dealerIndex]?.id ?? null,
      trump: newState.trump,
      hands: newState.players.map((player) => ({
        playerId: player.id,
        hand: player.hand.map((card) => ({
          id: card.id,
          type: card.type,
          suit: card.type === 'standard' ? card.suit : null,
          rank: card.type === 'standard' ? card.rank : null,
        })),
      })),
    });

    return newState;
  }

  /**
   * Select trump - delegates to TrumpService
   */
  selectTrump(state: GameState, playerId: string, decision: TrumpDecision): GameState {
    return this.trumpService.selectTrump(state, playerId, decision);
  }

  /**
   * Place a bet
   */
  makeBet(state: GameState, playerId: string, amount: number): GameState {
    if (state.phase !== GamePhase.Betting) {
      throw new Error(`Not in betting phase (current: ${state.phase})`);
    }

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex !== state.currentPlayerIndex) {
      throw new Error('Not your turn to bet');
    }

    const currentBets = state.players.map((p) => p.bet);
    const validation = this.betValidator.validate(
      currentBets,
      amount,
      state.cardsPerPlayer,
      playerIndex,
      state.dealerIndex,
    );

    if (!validation.valid) {
      throw new Error(validation.message || validation.reason);
    }

    const newState = { ...state };
    newState.players[playerIndex] = {
      ...newState.players[playerIndex],
      bet: amount,
    };

    // Check if all bets placed
    const allBetsPlaced = newState.players.every((p) => p.bet !== null);

    if (allBetsPlaced) {
      newState.phase = this.stateMachine.transition(newState, { type: 'ALL_BETS_PLACED' });
      newState.currentPlayerIndex = this.stateMachine.getFirstPlayerIndex(newState.dealerIndex);
    } else {
      newState.currentPlayerIndex = this.stateMachine.getNextPlayerIndex(playerIndex);
    }

    newState.turnStartedAt = Date.now();

    this.gameAuditService.logAction(newState.id, 'BET', playerId, { amount });

    return newState;
  }

  /**
   * Play a card
   */
  playCard(
    state: GameState,
    playerId: string,
    cardId: string,
    jokerOption?: JokerOption,
    requestedSuit?: Suit,
  ): GameState {
    if (state.phase !== GamePhase.Playing) {
      throw new Error('Not in playing phase');
    }

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex !== state.currentPlayerIndex) {
      throw new Error('Not your turn');
    }

    const player = state.players[playerIndex];
    const card = player.hand.find((c) => c.id === cardId);

    if (!card) {
      throw new Error('Card not in hand');
    }

    // Validate move
    const moveValidation = this.moveValidator.validate(player.hand, card, state.table, state.trump);

    if (!moveValidation.valid) {
      throw new Error(moveValidation.message || moveValidation.reason);
    }

    // Validate joker options if applicable
    if (card.type === 'joker') {
      if (!jokerOption) {
        throw new Error('Joker option required');
      }

      const jokerValidation = this.moveValidator.validateJokerPlay(
        state.table,
        jokerOption,
        requestedSuit,
      );

      if (!jokerValidation.valid) {
        throw new Error(jokerValidation.message || jokerValidation.reason);
      }
    }

    const newState = { ...state };

    // Remove card from hand
    newState.players[playerIndex] = {
      ...player,
      hand: player.hand.filter((c) => c.id !== cardId),
    };

    // Add card to table
    const tableCard: TableCard = {
      card,
      playerId,
      jokerOption,
      requestedSuit,
    };
    newState.table = [...newState.table, tableCard];

    // Check if trick complete (4 cards on table)
    if (newState.table.length === 4) {
      newState.phase = GamePhase.TrickComplete;
    } else {
      newState.currentPlayerIndex = this.stateMachine.getNextPlayerIndex(playerIndex);
    }

    newState.turnStartedAt = Date.now();

    this.gameAuditService.logAction(newState.id, 'CARD', playerId, {
      cardId,
      cardType: card.type,
      suit: card.type === 'standard' ? card.suit : null,
      rank: card.type === 'standard' ? card.rank : null,
      jokerOption,
      requestedSuit,
    });

    return newState;
  }

  /**
   * Complete a trick - determine winner and update state
   */
  completeTrick(state: GameState): GameState {
    if (state.phase !== GamePhase.TrickComplete) {
      throw new Error('Not in trick complete phase');
    }

    const winnerTableIndex = this.deckService.determineTrickWinner(state.table, state.trump);
    const winnerId = state.table[winnerTableIndex].playerId;
    const winnerPlayerIndex = state.players.findIndex((p) => p.id === winnerId);

    const newState = { ...state };

    // Increment winner's tricks
    newState.players[winnerPlayerIndex] = {
      ...newState.players[winnerPlayerIndex],
      tricks: newState.players[winnerPlayerIndex].tricks + 1,
    };

    this.gameAuditService.logAction(newState.id, 'TRICK_WINNER', winnerId, {
      tricks: newState.players[winnerPlayerIndex].tricks,
    });

    // Clear table
    newState.table = [];

    // Winner leads next trick
    newState.currentPlayerIndex = winnerPlayerIndex;

    // Check if round complete
    if (this.stateMachine.isRoundComplete(newState)) {
      newState.phase = GamePhase.RoundComplete;
    } else {
      newState.phase = GamePhase.Playing;
    }

    newState.turnStartedAt = Date.now();

    return newState;
  }

  /**
   * Complete a round - delegates to RoundService
   */
  completeRound(state: GameState): GameState {
    return this.roundService.completeRound(state);
  }

  /**
   * Complete a pulka - delegates to PulkaService
   */
  completePulka(state: GameState): GameState {
    return this.pulkaService.completePulka(state);
  }

  /**
   * Start next pulka after recap - delegates to PulkaService
   */
  startNextPulka(state: GameState): GameState {
    return this.pulkaService.startNextPulka(state);
  }

  private getTurnTimeoutMs(): number {
    return resolveTimeoutMs(
      this.configService.get<string>('TURN_TIMEOUT_MS'),
      GAME_CONSTANTS.TURN_TIMEOUT_MS,
    );
  }

  private orderPlayersForScoreSheet(players: Player[], dealerIndex: number): Player[] {
    const ordered: Player[] = [];
    for (let offset = 1; offset <= players.length; offset++) {
      ordered.push(players[(dealerIndex + offset) % players.length]);
    }
    return ordered;
  }

  /**
   * Calculate detailed final results
   */
  calculateFinalResultsDetailed(state: GameState): FinalGameResults {
    return this.scoringService.calculateFinalResultsDetailed(
      state.players,
      state.history,
      state.id,
    );
  }
}
