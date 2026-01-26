import { Card, JokerOption, Suit, TableCard } from '@joker/shared';

/**
 * Calculates card power for trick evaluation
 */
const getCardPower = (
  card: Card,
  trump: Suit | null,
  leadSuit: Suit | undefined,
  jokerOption?: JokerOption,
  _requestedSuit?: Suit,
): number => {
  // Joker handling
  if (card.type === 'joker') {
    if (jokerOption === JokerOption.Top) {
      return 1000; // Always wins (unless beaten by another joker Top later)
    }
    if (jokerOption === JokerOption.Bottom) {
      return 0; // Always loses
    }

    // High/Low options (only valid when leading)
    // requestedSuit IS the leadSuit when Joker leads, so we can use leadSuit or _requestedSuit
    const suit = _requestedSuit || leadSuit;

    if (jokerOption === JokerOption.High) {
      if (trump && suit === trump) {
        return 300; // Joker High claiming trump is STRONGER than any real trump (max 214)
      }
      // Stronger than any card of the suit (100 + 14 = 114), but weaker than Trump (200+)
      return 199;
    }

    if (jokerOption === JokerOption.Low) {
      if (trump && suit === trump) {
        return 201; // Weakest trump (200 + 6 = 206 is usually min)
      }
      // Weakest card of the suit (100 + 6 = 106 is usually min)
      // Beats off-suit non-trumps (Power < 100)
      return 101;
    }

    // Fallback
    return 1000;
  }

  // Trump handling
  if (trump && card.suit === trump) {
    return 200 + card.rank;
  }

  // Lead suit handling
  if (leadSuit && card.suit === leadSuit) {
    return 100 + card.rank;
  }

  // Off-suit handling
  return card.rank;
};

/**
 * Determines the winner of a trick on the client side
 * This duplicates backend logic for visualization purposes
 */
export const determineTrickWinner = (
  tableCards: TableCard[],
  trump: Suit | null,
): string | null => {
  if (tableCards.length === 0) return null;

  let winningIndex = 0;
  let highestPower = -1;
  let leadSuit: Suit | undefined;

  // Determine lead suit from first card
  const firstCard = tableCards[0];
  if (firstCard.card.type === 'standard') {
    leadSuit = firstCard.card.suit;
  } else if (firstCard.card.type === 'joker') {
    // If joker leads, requested suit becomes lead suit
    leadSuit = firstCard.requestedSuit;
  }

  // Special case: Two Jokers with "Top"
  // If multiple jokers are played with "Top", the LAST one wins
  const topJokerIndices: number[] = [];

  for (let i = 0; i < tableCards.length; i++) {
    const { card, jokerOption, requestedSuit } = tableCards[i];

    // Only count "Top" as overriding "Top" joker logic
    // "High" is a power-based win, not an absolute override like "Top"
    if (card.type === 'joker' && jokerOption === JokerOption.Top) {
      topJokerIndices.push(i);
    }

    const power = getCardPower(card, trump, leadSuit, jokerOption, requestedSuit);

    if (power > highestPower) {
      highestPower = power;
      winningIndex = i;
    } else if (power === highestPower) {
      // Tie-breaking (shouldn't happen in standard poker except identical cards which don't exist)
      // But for Jokers, later one might win if logic dictates
    }
  }

  // If we have Top Jokers, the last one played wins
  if (topJokerIndices.length > 0) {
    winningIndex = topJokerIndices[topJokerIndices.length - 1];
  }

  return tableCards[winningIndex].playerId;
};
