import { Injectable } from '@nestjs/common';
import { Card, StandardCard, Suit, TableCard, JokerOption, ValidationResult } from '@joker/shared';

@Injectable()
export class MoveValidator {
  /**
   * Validate if player can play the given card
   * Rules:
   * 1. Joker can always be played
   * 2. If table is empty, any card can be played
   * 3. Must follow lead suit if possible
   * 4. If no lead suit, must play trump if possible
   * 5. If no lead suit and no trump, can play any card
   */
  validate(
    hand: Card[],
    cardToPlay: Card,
    table: TableCard[],
    trump: Suit | null,
  ): ValidationResult {
    // Check card is in hand
    if (!hand.some((c) => c.id === cardToPlay.id)) {
      return { valid: false, reason: 'CARD_NOT_IN_HAND', message: 'Card is not in your hand' };
    }

    // Joker can always be played
    if (cardToPlay.type === 'joker') {
      return { valid: true };
    }

    // Empty table - any card is valid
    if (table.length === 0) {
      return { valid: true };
    }

    const firstCard = table[0];
    if (
      firstCard.card.type === 'joker' &&
      firstCard.jokerOption === JokerOption.High &&
      firstCard.requestedSuit
    ) {
      return this.validateResponseToJokerHigh(hand, cardToPlay, firstCard.requestedSuit, trump);
    }

    const playedCard = cardToPlay as StandardCard;
    const leadSuit = this.getLeadSuit(table[0]);

    // No lead suit (e.g., joker with no suit request)
    if (!leadSuit) {
      return { valid: true };
    }

    // Check if player has lead suit
    const hasLeadSuit = this.hasCardOfSuit(hand, leadSuit);

    if (hasLeadSuit) {
      // Must play lead suit
      if (playedCard.suit !== leadSuit) {
        return {
          valid: false,
          reason: 'MUST_FOLLOW_SUIT',
          message: `Must play ${leadSuit}`,
          requiredSuit: leadSuit,
        };
      }
      return { valid: true };
    }

    // No lead suit - check trump
    if (trump) {
      const hasTrump = this.hasCardOfSuit(hand, trump);

      if (hasTrump) {
        // Must play trump
        if (playedCard.suit !== trump) {
          return {
            valid: false,
            reason: 'MUST_PLAY_TRUMP',
            message: `Must play trump (${trump})`,
            requiredSuit: trump,
          };
        }
        return { valid: true };
      }
    }

    // No lead suit, no trump - can play any card
    return { valid: true };
  }

  /**
   * Validate Joker options when playing a Joker
   */
  validateJokerPlay(
    table: TableCard[],
    jokerOption: JokerOption,
    requestedSuit?: Suit,
  ): ValidationResult {
    const isFirstCard = table.length === 0;

    if (isFirstCard) {
      // First card - must use High or Low
      if (jokerOption !== JokerOption.High && jokerOption !== JokerOption.Low) {
        return {
          valid: false,
          reason: 'INVALID_JOKER_OPTION',
          message: 'First card Joker must use High or Low option',
        };
      }
      // Must specify a suit
      if (!requestedSuit) {
        return {
          valid: false,
          reason: 'MUST_SPECIFY_SUIT',
          message: 'Must specify a suit for Joker High/Low',
        };
      }
      return { valid: true };
    } else {
      // Not first card - must use Top or Bottom
      if (jokerOption !== JokerOption.Top && jokerOption !== JokerOption.Bottom) {
        return {
          valid: false,
          reason: 'INVALID_JOKER_OPTION',
          message: 'Non-first Joker must use Top or Bottom option',
        };
      }
      return { valid: true };
    }
  }

  /**
   * Validate response to Joker High
   * When Joker High is played, others must play their HIGHEST card of that suit
   */
  validateResponseToJokerHigh(
    hand: Card[],
    cardToPlay: Card,
    requestedSuit: Suit,
    trump: Suit | null,
  ): ValidationResult {
    // Joker response is always valid
    if (cardToPlay.type === 'joker') {
      return { valid: true };
    }

    const playedCard = cardToPlay as StandardCard;
    const cardsOfSuit = this.getCardsOfSuit(hand, requestedSuit);

    if (cardsOfSuit.length === 0) {
      // No cards of requested suit - check trump
      if (trump) {
        const trumpCards = this.getCardsOfSuit(hand, trump);
        if (trumpCards.length > 0) {
          // Must play trump, but any trump is valid
          if (playedCard.suit !== trump) {
            return {
              valid: false,
              reason: 'MUST_PLAY_TRUMP',
              message: `No ${requestedSuit}, must play trump`,
              requiredSuit: trump,
            };
          }
          return { valid: true };
        }
      }
      // No suit, no trump - any card is valid
      return { valid: true };
    }

    // Has requested suit - must play HIGHEST card of that suit
    if (playedCard.suit !== requestedSuit) {
      return {
        valid: false,
        reason: 'MUST_FOLLOW_SUIT',
        message: `Must play ${requestedSuit}`,
        requiredSuit: requestedSuit,
      };
    }

    const highestCard = this.getHighestCard(cardsOfSuit);
    if (playedCard.id !== highestCard.id) {
      return {
        valid: false,
        reason: 'MUST_PLAY_HIGHEST',
        message: `Must play highest ${requestedSuit} card`,
      };
    }

    return { valid: true };
  }

  /**
   * Get valid cards that can be played given current table state
   */
  getValidCards(hand: Card[], table: TableCard[], trump: Suit | null): Card[] {
    return hand.filter((card) => this.validate(hand, card, table, trump).valid);
  }

  /**
   * Check if hand contains cards of a specific suit (excluding jokers)
   */
  private hasCardOfSuit(hand: Card[], suit: Suit): boolean {
    return hand.some((card) => card.type === 'standard' && (card as StandardCard).suit === suit);
  }

  /**
   * Get all cards of a specific suit from hand
   */
  private getCardsOfSuit(hand: Card[], suit: Suit): StandardCard[] {
    return hand.filter(
      (card) => card.type === 'standard' && (card as StandardCard).suit === suit,
    ) as StandardCard[];
  }

  /**
   * Get highest card from array of standard cards
   */
  private getHighestCard(cards: StandardCard[]): StandardCard {
    return cards.reduce((highest, card) => (card.rank > highest.rank ? card : highest));
  }

  /**
   * Get lead suit from first table card
   */
  private getLeadSuit(firstCard: TableCard): Suit | null {
    const card = firstCard.card;

    if (card.type === 'joker') {
      // Joker with High/Low specifies a suit
      if (
        (firstCard.jokerOption === JokerOption.High || firstCard.jokerOption === JokerOption.Low) &&
        firstCard.requestedSuit
      ) {
        return firstCard.requestedSuit;
      }
      return null;
    }

    return (card as StandardCard).suit;
  }
}
