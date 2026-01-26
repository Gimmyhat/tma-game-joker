import { TableCard, Suit, JokerOption, Card, StandardCard } from '../index';

export class TrickLogic {
  /**
   * Determine trick winner based on cards on table
   * @param table - cards played in order
   * @param trump - trump suit (null = no trump)
   * @returns index of winning card in table array
   */
  static determineTrickWinner(table: TableCard[], trump: Suit | null): number {
    if (table.length === 0) {
      throw new Error('Table is empty');
    }

    const leadCard = table[0];
    if (
      leadCard.card.type === 'joker' &&
      (leadCard.jokerOption === JokerOption.High || leadCard.jokerOption === JokerOption.Low)
    ) {
      return this.determineJokerHighLowWinner(table, trump);
    }

    let winnerIndex = 0;
    let winnerCard = table[0];

    for (let i = 1; i < table.length; i++) {
      const comparison = this.compareCards(winnerCard, table[i], trump);
      if (comparison < 0) {
        winnerIndex = i;
        winnerCard = table[i];
      }
    }

    return winnerIndex;
  }

  private static determineJokerHighLowWinner(table: TableCard[], trump: Suit | null): number {
    const leadCard = table[0];
    const requestedSuit = leadCard.requestedSuit;

    let lastTopIndex = -1;
    for (let i = 0; i < table.length; i++) {
      if (table[i].card.type === 'joker' && table[i].jokerOption === JokerOption.Top) {
        lastTopIndex = i;
      }
    }
    if (lastTopIndex >= 0) {
      return lastTopIndex;
    }

    if (trump) {
      // Special case: If Joker led with High AND requested suit IS trump,
      // then Joker IS the highest trump and wins (unless Top joker exists, handled above)
      if (leadCard.jokerOption === JokerOption.High && leadCard.requestedSuit === trump) {
        // Joker wins against any trump because it IS the highest trump
        return 0;
      }

      let trumpWinnerIndex = -1;
      let trumpWinnerRank = -1;
      for (let i = 0; i < table.length; i++) {
        const card = table[i].card;
        if (card.type === 'standard' && (card as StandardCard).suit === trump) {
          const rank = (card as StandardCard).rank;
          if (rank > trumpWinnerRank) {
            trumpWinnerRank = rank;
            trumpWinnerIndex = i;
          }
        }
      }
      if (trumpWinnerIndex >= 0) {
        return trumpWinnerIndex;
      }
    }

    if (leadCard.jokerOption === JokerOption.Low && requestedSuit) {
      let suitedWinnerIndex = -1;
      let suitedWinnerRank = -1;
      for (let i = 0; i < table.length; i++) {
        const card = table[i].card;
        if (card.type === 'standard' && (card as StandardCard).suit === requestedSuit) {
          const rank = (card as StandardCard).rank;
          if (rank > suitedWinnerRank) {
            suitedWinnerRank = rank;
            suitedWinnerIndex = i;
          }
        }
      }
      if (suitedWinnerIndex >= 0) {
        return suitedWinnerIndex;
      }
    }

    return 0;
  }

  /**
   * Compare two table cards
   * Returns positive if card1 wins, negative if card2 wins
   */
  static compareCards(card1: TableCard, card2: TableCard, trump: Suit | null): number {
    const c1 = card1.card;
    const c2 = card2.card;

    // Both jokers
    if (c1.type === 'joker' && c2.type === 'joker') {
      // Both "Top" → last one wins
      if (card1.jokerOption === JokerOption.Top && card2.jokerOption === JokerOption.Top) {
        return -1; // card2 is later, so it wins
      }
      // One Top, one Bottom
      if (card1.jokerOption === JokerOption.Top) return 1;
      if (card2.jokerOption === JokerOption.Top) return -1;
      // Both Bottom (shouldn't happen in real game, but handle it)
      return 1; // first stays winner
    }

    // Joker vs standard card
    if (c1.type === 'joker') {
      if (card1.jokerOption === JokerOption.Top) return 1;
      if (card1.jokerOption === JokerOption.Bottom) return -1;
      // High/Low joker that led - it wins if others couldn't beat
      // This is handled by lead suit logic
      return 1;
    }

    if (c2.type === 'joker') {
      if (card2.jokerOption === JokerOption.Top) return -1;
      if (card2.jokerOption === JokerOption.Bottom) return 1;
      return -1;
    }

    // Both standard cards
    const sc1 = c1 as StandardCard;
    const sc2 = c2 as StandardCard;

    // Determine lead suit
    const leadSuit = this.getLeadSuit(card1);

    // Trump beats non-trump
    if (trump) {
      if (sc1.suit === trump && sc2.suit !== trump) return 1;
      if (sc2.suit === trump && sc1.suit !== trump) return -1;
      // Both trump - compare ranks
      if (sc1.suit === trump && sc2.suit === trump) {
        return sc1.rank - sc2.rank;
      }
    }

    // Same suit - compare ranks
    if (sc1.suit === sc2.suit) {
      return sc1.rank - sc2.rank;
    }

    // Different suits, no trump advantage
    // Card that matches lead suit wins
    if (leadSuit) {
      if (sc1.suit === leadSuit && sc2.suit !== leadSuit) return 1;
      if (sc2.suit === leadSuit && sc1.suit !== leadSuit) return -1;
    }

    // First card holds (different non-trump suits)
    return 1;
  }

  /**
   * Get lead suit from first card played
   */
  static getLeadSuit(firstCard: TableCard): Suit | null {
    const card = firstCard.card;

    if (card.type === 'joker') {
      // Joker with High/Low option specifies a suit
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

  /**
   * Calculate card power for sorting or AI
   * Uses standardized values from GAME_CONSTANTS
   */
  static getCardPower(card: Card, trump: Suit | null): number {
    if (card.type === 'joker') {
      // Jokers are high value for sorting, but context matters
      // This is a simplified power for hand sorting
      return 2000;
    }

    let power = (card as StandardCard).rank * 10;

    if (trump && (card as StandardCard).suit === trump) {
      power += 1000;
    }

    return power;
  }
}
