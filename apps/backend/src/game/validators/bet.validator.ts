import { Injectable } from '@nestjs/common';
import { ValidationResult, calculateForbiddenBet } from '@joker/shared';

@Injectable()
export class BetValidator {
  /**
   * Validate a bet according to game rules
   * Key rule: Sum of all bets CANNOT equal round length (forced bet rule)
   *
   * @param currentBets - bets already made (null for players who haven't bet yet)
   * @param newBet - the bet being validated
   * @param roundLength - number of cards per player this round (max possible tricks)
   * @param playerIndex - index of player making the bet
   * @param dealerIndex - index of dealer (bets last)
   */
  validate(
    currentBets: (number | null)[],
    newBet: number,
    roundLength: number,
    playerIndex: number,
    dealerIndex: number,
  ): ValidationResult {
    // Basic range check
    if (newBet < 0) {
      return {
        valid: false,
        reason: 'BET_NEGATIVE',
        message: 'Bet cannot be negative',
      };
    }

    if (newBet > roundLength) {
      return {
        valid: false,
        reason: 'BET_TOO_HIGH',
        message: `Bet cannot exceed ${roundLength}`,
      };
    }

    // Check if this is the last player (dealer)
    const isLastPlayer = playerIndex === dealerIndex;

    if (isLastPlayer) {
      // Last player cannot make a bet that equals the remaining amount
      const forbiddenBet = calculateForbiddenBet(
        currentBets,
        roundLength,
        playerIndex,
        dealerIndex,
      );

      if (forbiddenBet !== null && newBet === forbiddenBet) {
        return {
          valid: false,
          reason: 'FORBIDDEN_BET',
          message: `Cannot bet ${forbiddenBet} - sum would equal round length`,
          forbiddenBet,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get all valid bets for a player
   */
  getValidBets(
    currentBets: (number | null)[],
    roundLength: number,
    playerIndex: number,
    dealerIndex: number,
  ): number[] {
    const validBets: number[] = [];

    for (let bet = 0; bet <= roundLength; bet++) {
      const result = this.validate(currentBets, bet, roundLength, playerIndex, dealerIndex);
      if (result.valid) {
        validBets.push(bet);
      }
    }

    return validBets;
  }

  /**
   * Get the forbidden bet for dealer (last player)
   * Returns null if player is not the dealer
   */
  getForbiddenBet(
    currentBets: (number | null)[],
    roundLength: number,
    playerIndex: number,
    dealerIndex: number,
  ): number | null {
    return calculateForbiddenBet(currentBets, roundLength, playerIndex, dealerIndex);
  }

  /**
   * Check if all bets are placed
   */
  allBetsPlaced(bets: (number | null)[]): boolean {
    return bets.every((bet) => bet !== null);
  }

  /**
   * Calculate how many tricks are "missing" or "extra"
   * Positive = tricks will be "pushed" (someone takes more)
   * Negative = tricks will be "pulled" (someone takes less)
   */
  calculateTrickDifference(bets: number[], roundLength: number): number {
    const sumBets = bets.reduce((sum, bet) => sum + bet, 0);
    return sumBets - roundLength;
  }
}
