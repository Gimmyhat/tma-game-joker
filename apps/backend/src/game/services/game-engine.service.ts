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
  resolveTimeoutMs,
  TrumpDecision,
  TrumpDecisionType,
  TrumpSelectionState,
  Card,
  checkTookAll,
  checkPerfectPass,
  FinalGameResults,
} from '@joker/shared';
import { ConfigService } from '@nestjs/config';
import { DeckService } from './deck.service';
import { MoveValidator } from '../validators/move.validator';
import { BetValidator } from '../validators/bet.validator';
import { ScoringService } from './scoring.service';
import { StateMachineService } from './state-machine.service';
import { GameAuditService } from './game-audit.service';

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
  tuzovanie(playersCount: number) {
    return this.deckService.tuzovanie(playersCount);
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
      // Partial deal: only give 3 cards to the first player (chooser)
      const chooserIndex = this.stateMachine.getFirstPlayerIndex(newState.dealerIndex);
      const visibleCardCount = GAME_CONSTANTS.TRUMP_SELECTION_VISIBLE_CARDS;

      // Give chooser only 3 cards, others get nothing yet
      for (let i = 0; i < 4; i++) {
        if (i === chooserIndex) {
          // Chooser gets only first 3 cards
          newState.players[i] = {
            ...newState.players[i],
            hand: hands[i].slice(0, visibleCardCount),
            bet: null,
            tricks: 0,
          };
        } else {
          // Others get no cards yet
          newState.players[i] = {
            ...newState.players[i],
            hand: [],
            bet: null,
            tricks: 0,
          };
        }
      }

      // Store pending cards for later
      const pendingCards: Card[][] = [];
      for (let i = 0; i < 4; i++) {
        if (i === chooserIndex) {
          // Remaining cards for chooser (after first 3)
          pendingCards[i] = hands[i].slice(visibleCardCount);
        } else {
          // All cards for other players
          pendingCards[i] = hands[i];
        }
      }

      // Set up trump selection state
      newState.trumpSelection = {
        chooserPlayerId: newState.players[chooserIndex].id,
        chooserSeatIndex: chooserIndex,
        visibleCardCount,
        allowed: {
          suits: [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades],
          noTrump: true,
          redeal: true,
        },
        redealCount: 0,
        maxRedeals: GAME_CONSTANTS.TRUMP_SELECTION_MAX_REDEALS,
        deadlineTs: Date.now() + this.getTrumpSelectionTimeoutMs(),
        trigger,
        pendingCards,
      };

      newState.trump = null;
      newState.trumpCard = trumpCard; // Keep the joker card visible if it triggered selection
      newState.phase = GamePhase.TrumpSelection;
      newState.currentPlayerIndex = chooserIndex;

      // Track joker count in hand for chooser only (they have partial hand)
      const jokerCount = newState.players[chooserIndex].hand.filter((card) => card.type === 'joker')
        .length as 0 | 1 | 2;
      newState.players[chooserIndex].hadJokerInRounds.push(jokerCount > 0);
      newState.players[chooserIndex].jokerCountPerRound.push(jokerCount);
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
        ? this.getTrumpSelectionTimeoutMs()
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

    // Log round start with dealer and initial hands (for analysis)
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
   * Select trump (for special rounds with partial deal)
   * Handles Suit, NoTrump, and Redeal decisions
   */
  selectTrump(state: GameState, playerId: string, decision: TrumpDecision): GameState {
    if (state.phase !== GamePhase.TrumpSelection) {
      throw new Error('Not in trump selection phase');
    }

    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex !== state.currentPlayerIndex) {
      throw new Error('Not your turn to select trump');
    }

    const trumpSelection = state.trumpSelection;
    if (!trumpSelection) {
      throw new Error('No trump selection state');
    }

    if (trumpSelection.chooserPlayerId !== playerId) {
      throw new Error('Only the chooser can select trump');
    }

    // Handle Redeal
    if (decision.type === TrumpDecisionType.Redeal) {
      if (!trumpSelection.allowed.redeal) {
        throw new Error('Redeal not allowed');
      }
      if (trumpSelection.redealCount >= trumpSelection.maxRedeals) {
        throw new Error('Maximum redeals reached');
      }
      return this.handleRedeal(state);
    }

    const newState = { ...state };

    // Set trump based on decision
    if (decision.type === TrumpDecisionType.Suit) {
      newState.trump = decision.suit;
    } else {
      // NoTrump
      newState.trump = null;
    }

    // Complete the deal - give remaining cards to all players
    if (trumpSelection.pendingCards) {
      for (let i = 0; i < 4; i++) {
        const currentHand = newState.players[i].hand;
        const pendingCards = trumpSelection.pendingCards[i] || [];
        newState.players[i] = {
          ...newState.players[i],
          hand: [...currentHand, ...pendingCards],
        };

        // Track joker count in full hand (for players other than chooser)
        if (i !== trumpSelection.chooserSeatIndex) {
          const jokerCount = newState.players[i].hand.filter((card) => card.type === 'joker')
            .length as 0 | 1 | 2;
          newState.players[i].hadJokerInRounds.push(jokerCount > 0);
          newState.players[i].jokerCountPerRound.push(jokerCount);
        } else {
          // Update chooser's joker tracking with full hand
          const jokerCount = newState.players[i].hand.filter((card) => card.type === 'joker')
            .length as 0 | 1 | 2;
          const roundIndex = newState.players[i].hadJokerInRounds.length - 1;
          if (roundIndex >= 0) {
            newState.players[i].hadJokerInRounds[roundIndex] = jokerCount > 0;
            newState.players[i].jokerCountPerRound[roundIndex] = jokerCount;
          }
        }
      }
    }

    // Clear trump selection state
    newState.trumpSelection = undefined;

    // Transition to betting phase
    newState.phase = this.stateMachine.transition(newState, { type: 'TRUMP_SELECTED' });
    newState.currentPlayerIndex = this.stateMachine.getFirstPlayerIndex(newState.dealerIndex);
    newState.turnStartedAt = Date.now();

    this.gameAuditService.logAction(newState.id, 'TRUMP', playerId, {
      decision: decision.type,
      trump: newState.trump,
    });

    return newState;
  }

  /**
   * Handle redeal - reshuffle and deal again
   */
  private handleRedeal(state: GameState): GameState {
    const trumpSelection = state.trumpSelection;
    if (!trumpSelection) {
      throw new Error('No trump selection state');
    }

    const newState = { ...state };

    // Increment redeal count
    const newRedealCount = trumpSelection.redealCount + 1;

    // Create new deck and deal
    const deck = this.deckService.shuffle(this.deckService.createDeck());
    const { hands, remainingDeck } = this.deckService.deal(deck, 4, newState.cardsPerPlayer);

    // Determine trump card (for non-9-card rounds)
    let trumpCard: Card | null = null;
    if (newState.cardsPerPlayer !== 9 && remainingDeck.length > 0) {
      const trumpResult = this.deckService.determineTrumpWithCard(remainingDeck);
      trumpCard = trumpResult.trumpCard;
    }

    // Check trigger for the new deal
    const trigger = this.stateMachine.getTrumpSelectionTrigger({
      ...newState,
      trumpCard,
    });

    const chooserIndex = trumpSelection.chooserSeatIndex;
    const visibleCardCount = GAME_CONSTANTS.TRUMP_SELECTION_VISIBLE_CARDS;

    // Partial deal again
    for (let i = 0; i < 4; i++) {
      if (i === chooserIndex) {
        newState.players[i] = {
          ...newState.players[i],
          hand: hands[i].slice(0, visibleCardCount),
        };
      } else {
        newState.players[i] = {
          ...newState.players[i],
          hand: [],
        };
      }
    }

    // Store pending cards
    const pendingCards: Card[][] = [];
    for (let i = 0; i < 4; i++) {
      if (i === chooserIndex) {
        pendingCards[i] = hands[i].slice(visibleCardCount);
      } else {
        pendingCards[i] = hands[i];
      }
    }

    // Update trump selection state
    newState.trumpSelection = {
      ...trumpSelection,
      redealCount: newRedealCount,
      allowed: {
        ...trumpSelection.allowed,
        redeal: newRedealCount < trumpSelection.maxRedeals,
      },
      deadlineTs: Date.now() + this.getTrumpSelectionTimeoutMs(),
      trigger: trigger || trumpSelection.trigger,
      pendingCards,
    };

    newState.trumpCard = trumpCard;
    newState.turnStartedAt = Date.now();
    newState.turnTimeoutMs = this.getTrumpSelectionTimeoutMs();

    this.gameAuditService.logAction(newState.id, 'REDEAL', trumpSelection.chooserPlayerId, {
      redealCount: newRedealCount,
    });

    return newState;
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
        // Track badge achievements for this pulka
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
      tableHistory: [], // TODO: Track full table history if needed
      jokerCounts: Object.fromEntries(
        newState.players.map((p) => {
          // Get joker count for current round (last entry in jokerCountPerRound)
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
          ? this.getTrumpSelectionTimeoutMs()
          : this.getTurnTimeoutMs();
    }

    newState.table = [];
    newState.turnStartedAt = Date.now();

    return newState;
  }

  /**
   * Deal cards for a new round, with partial deal support for trump selection
   */
  private dealNewRound(state: GameState): void {
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
      // Partial deal
      const chooserIndex = this.stateMachine.getFirstPlayerIndex(state.dealerIndex);
      const visibleCardCount = GAME_CONSTANTS.TRUMP_SELECTION_VISIBLE_CARDS;

      for (let i = 0; i < 4; i++) {
        if (i === chooserIndex) {
          state.players[i] = {
            ...state.players[i],
            hand: hands[i].slice(0, visibleCardCount),
            bet: null,
            tricks: 0,
          };
        } else {
          state.players[i] = {
            ...state.players[i],
            hand: [],
            bet: null,
            tricks: 0,
          };
        }
      }

      // Store pending cards
      const pendingCards: Card[][] = [];
      for (let i = 0; i < 4; i++) {
        if (i === chooserIndex) {
          pendingCards[i] = hands[i].slice(visibleCardCount);
        } else {
          pendingCards[i] = hands[i];
        }
      }

      // Track joker count for chooser's partial hand
      const jokerCount = state.players[chooserIndex].hand.filter((card) => card.type === 'joker')
        .length as 0 | 1 | 2;
      state.players[chooserIndex].hadJokerInRounds.push(jokerCount > 0);
      state.players[chooserIndex].jokerCountPerRound.push(jokerCount);

      state.trumpSelection = {
        chooserPlayerId: state.players[chooserIndex].id,
        chooserSeatIndex: chooserIndex,
        visibleCardCount,
        allowed: {
          suits: [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades],
          noTrump: true,
          redeal: true,
        },
        redealCount: 0,
        maxRedeals: GAME_CONSTANTS.TRUMP_SELECTION_MAX_REDEALS,
        deadlineTs: Date.now() + this.getTrumpSelectionTimeoutMs(),
        trigger,
        pendingCards,
      };

      state.trump = null;
      state.trumpCard = trumpCard;
      state.phase = GamePhase.TrumpSelection;
      state.currentPlayerIndex = chooserIndex;
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
      this.dealNewRound(newState);

      // Use trump selection timeout if partial deal was triggered
      newState.turnTimeoutMs =
        newState.phase === GamePhase.TrumpSelection
          ? this.getTrumpSelectionTimeoutMs()
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

  private getTrumpSelectionTimeoutMs(): number {
    return resolveTimeoutMs(
      this.configService.get<string>('TRUMP_SELECTION_TIMEOUT_MS'),
      GAME_CONSTANTS.TRUMP_SELECTION_TIMEOUT_MS,
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
