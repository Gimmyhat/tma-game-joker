import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  GamePhase,
  Player,
  Suit,
  TableCard,
  JokerOption,
  RoundHistory,
  GAME_CONSTANTS,
} from '@joker/shared';
import { DeckService } from './deck.service';
import { MoveValidator } from '../validators/move.validator';
import { BetValidator } from '../validators/bet.validator';
import { ScoringService } from './scoring.service';
import { StateMachineService } from './state-machine.service';

@Injectable()
export class GameEngineService {
  constructor(
    private deckService: DeckService,
    private moveValidator: MoveValidator,
    private betValidator: BetValidator,
    private scoringService: ScoringService,
    private stateMachine: StateMachineService,
  ) {}

  /**
   * Create a new game with 4 players
   */
  createGame(playerIds: string[], playerNames: string[]): GameState {
    if (playerIds.length !== 4) {
      throw new Error('Game requires exactly 4 players');
    }

    // Perform tuzovanie to determine first dealer
    const { dealerIndex } = this.deckService.tuzovanie(4);

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
      table: [],
      turnStartedAt: Date.now(),
      turnTimeoutMs: GAME_CONSTANTS.TURN_TIMEOUT_MS,
      history: [],
      lastPulkaResults: null,
      createdAt: Date.now(),
      finishedAt: null,
      winnerId: null,
    };

    return gameState;
  }

  /**
   * Start the game - deal cards and begin first round
   */
  startGame(state: GameState): GameState {
    const newState = { ...state };

    // Deal cards for round 1
    const deck = this.deckService.shuffle(this.deckService.createDeck());
    const { hands, remainingDeck } = this.deckService.deal(deck, 4, newState.cardsPerPlayer);

    // Assign hands to players
    for (let i = 0; i < 4; i++) {
      newState.players[i] = {
        ...newState.players[i],
        hand: hands[i],
        bet: null,
        tricks: 0,
      };

      // Check for joker in hand
      const hasJoker = hands[i].some((card) => card.type === 'joker');
      newState.players[i].hadJokerInRounds.push(hasJoker);
    }

    // Determine trump (for non-9-card rounds)
    if (newState.cardsPerPlayer !== 9) {
      newState.trump = this.deckService.determineTrump(remainingDeck);
    }

    // Transition to betting (or trump selection for 9-card rounds)
    newState.phase = this.stateMachine.transition(newState, { type: 'GAME_START' });
    newState.currentPlayerIndex = this.stateMachine.getFirstPlayerIndex(newState.dealerIndex);
    newState.turnStartedAt = Date.now();

    return newState;
  }

  /**
   * Select trump (for 9-card rounds only)
   */
  selectTrump(state: GameState, playerId: string, trump: Suit | null): GameState {
    if (state.phase !== GamePhase.TrumpSelection) {
      throw new Error('Not in trump selection phase');
    }

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex !== state.currentPlayerIndex) {
      throw new Error('Not your turn to select trump');
    }

    const newState = { ...state };
    newState.trump = trump;
    newState.phase = this.stateMachine.transition(newState, { type: 'TRUMP_SELECTED' });
    newState.turnStartedAt = Date.now();

    return newState;
  }

  /**
   * Place a bet
   */
  makeBet(state: GameState, playerId: string, amount: number): GameState {
    if (state.phase !== GamePhase.Betting) {
      throw new Error('Not in betting phase');
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

    // Apply scores and check for spoilage
    for (const result of roundResults) {
      const playerIndex = newState.players.findIndex((p) => p.id === result.playerId);
      const player = newState.players[playerIndex];

      newState.players[playerIndex] = {
        ...player,
        roundScores: [...player.roundScores, result.score],
        totalScore: player.totalScore + result.score,
        spoiled: player.spoiled || !result.tookOwn,
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
      tableHistory: [], // TODO: Track full table history if needed
    };
    newState.history.push(roundHistory);

    // Check if pulka complete
    if (this.stateMachine.isPulkaComplete(newState)) {
      newState.phase = GamePhase.PulkaComplete;
    } else {
      // Prepare next round
      newState.round++;
      newState.cardsPerPlayer = this.stateMachine.getCardsPerPlayer(newState.round);
      newState.dealerIndex = this.stateMachine.getNextDealerIndex(newState.dealerIndex);
      newState.currentPlayerIndex = this.stateMachine.getFirstPlayerIndex(newState.dealerIndex);

      // Deal new cards
      const deck = this.deckService.shuffle(this.deckService.createDeck());
      const { hands, remainingDeck } = this.deckService.deal(deck, 4, newState.cardsPerPlayer);

      for (let i = 0; i < 4; i++) {
        newState.players[i] = {
          ...newState.players[i],
          hand: hands[i],
          bet: null,
          tricks: 0,
        };

        const hasJoker = hands[i].some((card) => card.type === 'joker');
        newState.players[i].hadJokerInRounds.push(hasJoker);
      }

      // Determine trump for non-9-card rounds
      if (newState.cardsPerPlayer !== 9) {
        newState.trump = this.deckService.determineTrump(remainingDeck);
      } else {
        newState.trump = null;
      }

      // Transition phase
      newState.phase = this.stateMachine.needsTrumpSelection(newState)
        ? GamePhase.TrumpSelection
        : GamePhase.Betting;
    }

    newState.table = [];
    newState.turnStartedAt = Date.now();

    return newState;
  }

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

    // Set timeout for the recap phase
    newState.turnStartedAt = Date.now();
    newState.turnTimeoutMs = GAME_CONSTANTS.PULKA_RECAP_TIMEOUT_MS;

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

      // Reset spoiled for new pulka
      for (let i = 0; i < 4; i++) {
        newState.players[i] = {
          ...newState.players[i],
          spoiled: false,
        };
      }

      // Deal new cards
      const deck = this.deckService.shuffle(this.deckService.createDeck());
      const { hands, remainingDeck } = this.deckService.deal(deck, 4, newState.cardsPerPlayer);

      for (let i = 0; i < 4; i++) {
        newState.players[i] = {
          ...newState.players[i],
          hand: hands[i],
          bet: null,
          tricks: 0,
        };

        const hasJoker = hands[i].some((card) => card.type === 'joker');
        newState.players[i].hadJokerInRounds.push(hasJoker);
      }

      // Determine trump for non-9-card rounds
      if (newState.cardsPerPlayer !== 9) {
        newState.trump = this.deckService.determineTrump(remainingDeck);
      } else {
        newState.trump = null;
      }

      // Transition phase
      newState.phase = this.stateMachine.needsTrumpSelection(newState)
        ? GamePhase.TrumpSelection
        : GamePhase.Betting;
    }

    newState.table = [];
    newState.turnStartedAt = Date.now();
    newState.turnTimeoutMs = GAME_CONSTANTS.TURN_TIMEOUT_MS; // Reset to normal turn timeout

    return newState;
  }

  private orderPlayersForScoreSheet(players: Player[], dealerIndex: number): Player[] {
    const ordered: Player[] = [];
    for (let offset = 1; offset <= players.length; offset++) {
      ordered.push(players[(dealerIndex + offset) % players.length]);
    }
    return ordered;
  }
}
