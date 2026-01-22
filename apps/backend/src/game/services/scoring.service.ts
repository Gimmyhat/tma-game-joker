import { Injectable } from '@nestjs/common';
import { Player, RoundHistory, GAME_CONSTANTS } from '@joker/shared';

export interface RoundScoreResult {
  playerId: string;
  bet: number;
  tricks: number;
  score: number;
  isShtanga: boolean;
  tookOwn: boolean;
  tookAll: boolean;
}

export interface PremiumResult {
  playerId: string;
  received: number;
  takenFromPlayerId: string | null;
  takenAmount: number;
}

export interface PulkaScoreResult {
  playerScores: Record<string, number>;
  premiums: PremiumResult[];
  highestTrickScore: number;
}

@Injectable()
export class ScoringService {
  /**
   * Calculate score for a single round for a player
   *
   * Rules:
   * - Took own (bet === tricks): 50 × bet
   * - Took ALL (bet === tricks === roundLength): 100 × roundLength
   * - Miss (bet ≠ tricks): 10 × tricks
   * - Shtanga (bet >= 1 && tricks === 0): -200
   */
  calculateRoundScore(bet: number, tricks: number, roundLength: number): RoundScoreResult {
    const isShtanga = bet >= 1 && tricks === 0;
    const tookOwn = bet === tricks;
    const tookAll = tookOwn && bet === roundLength;

    let score: number;

    if (isShtanga) {
      score = GAME_CONSTANTS.SCORE_SHTANGA_PENALTY;
    } else if (tookAll) {
      score = GAME_CONSTANTS.SCORE_TOOK_ALL_MULTIPLIER * roundLength;
    } else if (tookOwn) {
      score = GAME_CONSTANTS.SCORE_TOOK_OWN_MULTIPLIER * bet;
    } else {
      score = GAME_CONSTANTS.SCORE_MISS_MULTIPLIER * tricks;
    }

    return {
      playerId: '',
      bet,
      tricks,
      score,
      isShtanga,
      tookOwn,
      tookAll,
    };
  }

  /**
   * Calculate scores for all players after a round
   */
  calculateRoundScores(players: Player[], roundLength: number): RoundScoreResult[] {
    return players.map((player) => {
      const result = this.calculateRoundScore(player.bet ?? 0, player.tricks, roundLength);
      result.playerId = player.id;
      return result;
    });
  }

  /**
   * Calculate premiums at the end of a pulka
   *
   * Premium rules:
   * 1. Player who "took own" every round of pulka gets premium
   * 2. Premium = highest trick score in pulka (excluding last round)
   * 3. Premium is added to player's score
   * 4. Same amount is subtracted from NEXT player (clockwise)
   * 5. Exception: If next player is also on premium, don't subtract
   */
  calculatePulkaPremiums(
    players: Player[],
    pulkaHistory: RoundHistory[],
  ): PulkaScoreResult {
    const playerCount = players.length;

    // Find players who are "clean" (didn't spoil in this pulka)
    const cleanPlayerIndices: number[] = [];
    for (let i = 0; i < playerCount; i++) {
      if (!players[i].spoiled) {
        cleanPlayerIndices.push(i);
      }
    }

    // Find highest trick score in pulka (excluding last round)
    const roundsExceptLast = pulkaHistory.slice(0, -1);
    const highestTrickScore = this.getHighestTrickScore(roundsExceptLast);

    const premiums: PremiumResult[] = [];
    const playerScores: Record<string, number> = {};

    // Initialize scores
    for (const player of players) {
      playerScores[player.id] = 0;
    }

    if (cleanPlayerIndices.length === 0 || highestTrickScore === 0) {
      return { playerScores, premiums, highestTrickScore };
    }

    // Process premiums with complex neighbor logic
    for (const cleanIndex of cleanPlayerIndices) {
      const player = players[cleanIndex];
      const nextIndex = (cleanIndex + 1) % playerCount;
      const nextPlayer = players[nextIndex];

      // Check if this player receives (wasn't "attacked" by previous clean player)
      const prevIndex = (cleanIndex - 1 + playerCount) % playerCount;
      const prevPlayerClean = cleanPlayerIndices.includes(prevIndex);

      // Player receives premium if:
      // - They are clean AND
      // - Previous player is NOT clean (wasn't trying to subtract from this player)
      // OR this is the first clean player in sequence
      const receives = !prevPlayerClean || cleanIndex === cleanPlayerIndices[0];

      // Player subtracts from next if next is NOT clean
      const nextPlayerClean = cleanPlayerIndices.includes(nextIndex);
      const canSubtract = !nextPlayerClean;

      const premium: PremiumResult = {
        playerId: player.id,
        received: receives ? highestTrickScore : 0,
        takenFromPlayerId: canSubtract ? nextPlayer.id : null,
        takenAmount: canSubtract ? highestTrickScore : 0,
      };

      premiums.push(premium);

      // Apply to scores
      if (receives) {
        playerScores[player.id] += highestTrickScore;
      }
      if (canSubtract) {
        playerScores[nextPlayer.id] -= highestTrickScore;
      }
    }

    return { playerScores, premiums, highestTrickScore };
  }

  /**
   * Apply complex premium rules when multiple adjacent players are clean
   * Rule: If 3 players in a row are clean (1, 2, 3):
   * - Player 1: Gets premium, doesn't subtract from 2 (who's on premium)
   * - Player 2: Doesn't get (1 tried to subtract), doesn't subtract from 3 (on premium)
   * - Player 3: Doesn't get (2 tried to subtract), DOES subtract from 4 (not on premium)
   */
  calculatePulkaPremiumsAdvanced(
    players: Player[],
    pulkaHistory: RoundHistory[],
  ): PulkaScoreResult {
    const playerCount = players.length;

    // Build clean status array
    const isClean: boolean[] = players.map((p) => !p.spoiled);

    // Find highest trick score (excluding last round)
    const roundsExceptLast = pulkaHistory.slice(0, -1);
    const highestTrickScore = this.getHighestTrickScore(roundsExceptLast);

    const premiums: PremiumResult[] = [];
    const playerScores: Record<string, number> = {};

    for (const player of players) {
      playerScores[player.id] = 0;
    }

    if (highestTrickScore === 0) {
      return { playerScores, premiums, highestTrickScore };
    }

    // For each player, determine:
    // 1. Do they receive premium?
    // 2. Do they subtract from next?
    for (let i = 0; i < playerCount; i++) {
      if (!isClean[i]) continue;

      const prevIdx = (i - 1 + playerCount) % playerCount;
      const nextIdx = (i + 1) % playerCount;

      // Receives if previous player is NOT clean (or this is position 0 and no clean prev in circle)
      // More precisely: receives if previous player didn't "try" to subtract
      // Previous player tries to subtract if they are clean
      const prevTriedToSubtract = isClean[prevIdx];
      const receives = !prevTriedToSubtract;

      // Subtracts from next if next is NOT clean
      const nextIsClean = isClean[nextIdx];
      const subtracts = !nextIsClean;

      const premium: PremiumResult = {
        playerId: players[i].id,
        received: receives ? highestTrickScore : 0,
        takenFromPlayerId: subtracts ? players[nextIdx].id : null,
        takenAmount: subtracts ? highestTrickScore : 0,
      };

      premiums.push(premium);

      if (receives) {
        playerScores[players[i].id] += highestTrickScore;
      }
      if (subtracts) {
        playerScores[players[nextIdx].id] -= highestTrickScore;
      }
    }

    return { playerScores, premiums, highestTrickScore };
  }

  /**
   * Get highest score from round history
   */
  private getHighestTrickScore(history: RoundHistory[]): number {
    let highest = 0;

    for (const round of history) {
      for (const score of Object.values(round.scores)) {
        if (score > highest) {
          highest = score;
        }
      }
    }

    return highest;
  }

  /**
   * Check if player "spoiled" (didn't take own) in a round
   */
  checkSpoiled(bet: number, tricks: number): boolean {
    return bet !== tricks;
  }

  /**
   * Calculate final game results and winner
   */
  calculateFinalResults(players: Player[]): { winnerId: string; rankings: Player[] } {
    const sorted = [...players].sort((a, b) => b.totalScore - a.totalScore);

    // Tie-breaker: player positioned earlier in score sheet wins
    // This is already handled by original player order if scores are equal

    return {
      winnerId: sorted[0].id,
      rankings: sorted,
    };
  }
}
