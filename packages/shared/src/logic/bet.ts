export function calculateForbiddenBet(
  currentBets: (number | null)[],
  roundLength: number,
  playerIndex: number,
  dealerIndex: number,
): number | null {
  if (playerIndex !== dealerIndex) {
    return null;
  }

  const sumBets = currentBets
    .filter((bet): bet is number => bet !== null)
    .reduce((sum, bet) => sum + bet, 0);

  const forbiddenBet = roundLength - sumBets;

  if (forbiddenBet >= 0 && forbiddenBet <= roundLength) {
    return forbiddenBet;
  }

  return null;
}
