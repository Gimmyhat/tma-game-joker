import { TableCard, Suit, TrickLogic } from '@joker/shared';

/**
 * Determines the winner of a trick on the client side
 * Uses shared logic for consistency with backend
 */
export const determineTrickWinner = (
  tableCards: TableCard[],
  trump: Suit | null,
): string | null => {
  if (tableCards.length === 0) return null;
  const winningIndex = TrickLogic.determineTrickWinner(tableCards, trump);
  return tableCards[winningIndex].playerId;
};
