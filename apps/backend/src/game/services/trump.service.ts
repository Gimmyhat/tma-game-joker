import { Injectable } from '@nestjs/common';
import {
  GameState,
  GamePhase,
  Suit,
  GAME_CONSTANTS,
  resolveTimeoutMs,
  TrumpDecision,
  TrumpDecisionType,
  TrumpSelectionTrigger,
  Card,
} from '@joker/shared';
import { ConfigService } from '@nestjs/config';
import { DeckService } from './deck.service';
import { StateMachineService } from './state-machine.service';
import { GameAuditService } from './game-audit.service';

/**
 * TrumpService - handles trump selection and redeal logic
 */
@Injectable()
export class TrumpService {
  constructor(
    private deckService: DeckService,
    private stateMachine: StateMachineService,
    private configService: ConfigService,
    private gameAuditService: GameAuditService,
  ) {}

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
  handleRedeal(state: GameState): GameState {
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
   * Setup trump selection state for a new round
   */
  setupTrumpSelection(
    state: GameState,
    hands: Card[][],
    trumpCard: Card | null,
    trigger: TrumpSelectionTrigger,
  ): void {
    const chooserIndex = this.stateMachine.getFirstPlayerIndex(state.dealerIndex);
    const visibleCardCount = GAME_CONSTANTS.TRUMP_SELECTION_VISIBLE_CARDS;

    // Give chooser only 3 cards, others get nothing yet
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

    // Store pending cards for later
    const pendingCards: Card[][] = [];
    for (let i = 0; i < 4; i++) {
      if (i === chooserIndex) {
        pendingCards[i] = hands[i].slice(visibleCardCount);
      } else {
        pendingCards[i] = hands[i];
      }
    }

    // Set up trump selection state
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

    // Track joker count in hand for chooser only (they have partial hand)
    const jokerCount = state.players[chooserIndex].hand.filter((card) => card.type === 'joker')
      .length as 0 | 1 | 2;
    state.players[chooserIndex].hadJokerInRounds.push(jokerCount > 0);
    state.players[chooserIndex].jokerCountPerRound.push(jokerCount);
  }

  getTrumpSelectionTimeoutMs(): number {
    return resolveTimeoutMs(
      this.configService.get<string>('TRUMP_SELECTION_TIMEOUT_MS'),
      GAME_CONSTANTS.TRUMP_SELECTION_TIMEOUT_MS,
    );
  }
}
