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
    if (jokerOption === JokerOption.Top || jokerOption === JokerOption.High) {
      return 1000; // Always wins (unless beaten by another joker later, handled in loop)
    }
    if (jokerOption === JokerOption.Bottom || jokerOption === JokerOption.Low) {
      return 0; // Always loses
    }
    // High/Low options when leading are effectively Top/Bottom for power calculation
    return 1000;
  }

  // Trump handling
  if (trump && card.suit === trump) {
    // If joker requested this suit (High option), treat as normal trump power
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

    if (
      card.type === 'joker' &&
      (jokerOption === JokerOption.Top || (i === 0 && jokerOption === JokerOption.High))
    ) {
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
