import { Card, Suit } from '../index';

/**
 * Sorts cards for display in player's hand.
 * Order:
 * 1. Jokers
 * 2. Trumps (High to Low)
 * 3. Other Suits (grouped by suit, High to Low)
 *
 * @param cards Array of cards to sort
 * @param trumpSuit Current trump suit (or null)
 * @returns New array of sorted cards
 */
export const sortCards = (cards: Card[], trumpSuit: Suit | null): Card[] => {
  return [...cards].sort((a, b) => {
    // 1. Jokers always first
    if (a.type === 'joker' && b.type !== 'joker') return -1;
    if (a.type !== 'joker' && b.type === 'joker') return 1;
    if (a.type === 'joker' && b.type === 'joker') return 0; // Maintain relative order of jokers

    // Now both are StandardCards
    const cardA = a as import('../index').StandardCard;
    const cardB = b as import('../index').StandardCard;

    const isATrump = trumpSuit && cardA.suit === trumpSuit;
    const isBTrump = trumpSuit && cardB.suit === trumpSuit;

    // 2. Trumps second
    if (isATrump && !isBTrump) return -1;
    if (!isATrump && isBTrump) return 1;

    // If both are trumps, sort by Rank (Descending)
    if (isATrump && isBTrump) {
      return cardB.rank - cardA.rank;
    }

    // 3. Other suits
    // Group by suit first
    if (cardA.suit !== cardB.suit) {
      // Arbitrary but consistent suit order for non-trumps
      // Let's use the enum string comparison or a fixed order
      const suitOrder: Record<Suit, number> = {
        [Suit.Spades]: 1,
        [Suit.Hearts]: 2,
        [Suit.Clubs]: 3,
        [Suit.Diamonds]: 4,
      };
      return suitOrder[cardA.suit] - suitOrder[cardB.suit];
    }

    // Same suit, sort by Rank (Descending)
    return cardB.rank - cardA.rank;
  });
};
