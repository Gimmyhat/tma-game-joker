import { Injectable, Logger } from '@nestjs/common';
import {
  Player,
  RoundHistory,
  GAME_CONSTANTS,
  FinalGameResults,
  PlayerRanking,
  PulkaSummary,
  ScoreSheetRoundEntry,
} from '@joker/shared';

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
  private readonly logger = new Logger(ScoringService.name);

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
    } else if (bet === 0) {
      if (tricks === 0) {
        score = GAME_CONSTANTS.SCORE_PASS_BONUS;
      } else {
        score = GAME_CONSTANTS.SCORE_MISS_MULTIPLIER * tricks;
      }
    } else if (tookAll) {
      score = GAME_CONSTANTS.SCORE_TOOK_ALL_MULTIPLIER * roundLength;
    } else if (tookOwn) {
      // Rule: 50 * bet + 50 (bonus)
      score = GAME_CONSTANTS.SCORE_TOOK_OWN_MULTIPLIER * bet + 50;
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
  calculatePulkaPremiums(players: Player[], pulkaHistory: RoundHistory[]): PulkaScoreResult {
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
   * Apply Georgian Joker premium rules.
   *
   * PREMIUM RULE ("Popular Georgian Joker"):
   * When a player completes ALL contracts in a pulka (bet === tricks for all rounds):
   *
   * 1. PREMIUM_PLAYER gets +self_max (their OWN highest positive score, excluding last round)
   * 2. NEIGHBOR_CLOCKWISE (next player) gets -neighbor_max (THEIR OWN highest positive score)
   *
   * IMPORTANT: Each player's bonus/penalty is based on THEIR OWN max, not a global max!
   *
   * Complex adjacency rules still apply:
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

    // Exclude last round from premium calculation
    const roundsExceptLast = pulkaHistory.slice(0, -1);

    // Global highest (for backward compatibility / logging)
    const highestTrickScore = this.getHighestTrickScore(roundsExceptLast);

    const premiums: PremiumResult[] = [];
    const playerScores: Record<string, number> = {};

    for (const player of players) {
      playerScores[player.id] = 0;
    }

    // No rounds to calculate from (pulka with only 1 round = no premium possible)
    if (roundsExceptLast.length === 0) {
      return { playerScores, premiums, highestTrickScore: 0 };
    }

    // For each player, determine:
    // 1. Do they receive premium? -> +self_max
    // 2. Do they subtract from next? -> neighbor gets -neighbor_max
    for (let i = 0; i < playerCount; i++) {
      if (!isClean[i]) continue;

      const prevIdx = (i - 1 + playerCount) % playerCount;
      const nextIdx = (i + 1) % playerCount;

      // "Popular" Variant Rule:
      // Player receives premium ONLY if they are NOT pressured by the previous player.
      // - Prev is Clean -> Prev attempts to subtract -> I am protected but LOSE my bonus.
      // - Prev is Dirty -> Prev does not act -> I am free to take my bonus.
      const prevTriedToSubtract = isClean[prevIdx];
      const receives = !prevTriedToSubtract;

      // Subtracts from next if next is NOT clean
      const nextIsClean = isClean[nextIdx];
      const subtracts = !nextIsClean;

      // Calculate per-player max scores (excluding last round)
      const selfMax = this.getPlayerHighestPositiveScore(players[i].id, roundsExceptLast);
      const neighborMax = subtracts
        ? this.getPlayerHighestPositiveScore(players[nextIdx].id, roundsExceptLast)
        : 0;

      const premium: PremiumResult = {
        playerId: players[i].id,
        received: receives ? selfMax : 0,
        takenFromPlayerId: subtracts ? players[nextIdx].id : null,
        takenAmount: subtracts ? neighborMax : 0,
      };

      premiums.push(premium);

      // Apply to scores
      if (receives && selfMax > 0) {
        playerScores[players[i].id] += selfMax;
        this.logger.log(`Premium: ${players[i].name} receives +${selfMax} (own max from current pulka)`);
      } else if (isClean[i]) {
        this.logger.log(`Premium: ${players[i].name} is Clean but receives 0 (Protected/Pressured by prev clean player)`);
      }

      if (subtracts && neighborMax > 0) {
        playerScores[players[nextIdx].id] -= neighborMax;
        this.logger.log(
          `Premium: ${players[nextIdx].name} penalized -${neighborMax} (their own max) by ${players[i].name}`,
        );
      }
    }

    return { playerScores, premiums, highestTrickScore };
  }

  /**
   * Get highest score from round history (global - any player)
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
   * Get highest POSITIVE score for a specific player from round history
   * Used for Georgian Joker premium calculation where each player's
   * premium/penalty is based on their OWN max score, not a global max.
   */
  private getPlayerHighestPositiveScore(playerId: string, history: RoundHistory[]): number {
    let highest = 0;

    for (const round of history) {
      const score = round.scores[playerId];
      if (score !== undefined && score > highest) {
        highest = score;
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
    const scoreSheetOrder = new Map(players.map((player, index) => [player.id, index]));
    const sorted = [...players].sort((a, b) => {
      const scoreDiff = b.totalScore - a.totalScore;
      if (scoreDiff !== 0) return scoreDiff;

      return (scoreSheetOrder.get(a.id) ?? 0) - (scoreSheetOrder.get(b.id) ?? 0);
    });

    return {
      winnerId: sorted[0].id,
      rankings: sorted,
    };
  }

  /**
   * Calculate detailed final results for the scoresheet
   */
  calculateFinalResultsDetailed(
    players: Player[],
    history: RoundHistory[],
    gameId: string,
  ): FinalGameResults {
    // 1. Calculate rankings first to determine places
    const { rankings: sortedPlayers } = this.calculateFinalResults(players);
    const placeMap = new Map(sortedPlayers.map((p, i) => [p.id, i + 1]));

    const scoreSheetPlayers = players; // Use original seat order for processing, but we need seatIndex

    const rankings: PlayerRanking[] = scoreSheetPlayers.map((player, seatIndex) => {
      const playerId = player.id;
      const pulkaSummaries: PulkaSummary[] = [];
      let previousPulkaCumulativeTotal = 0;

      // Process each pulka
      GAME_CONSTANTS.PULKA_STRUCTURE.forEach((structure) => {
        const pulkaNum = structure.pulka;
        const pulkaRounds: ScoreSheetRoundEntry[] = [];
        let pulkaRoundScoresSum = 0;

        // Gather round entries
        structure.rounds.forEach((roundNum, idx) => {
          const roundHistory = history.find((h) => h.round === roundNum);
          if (roundHistory) {
            const bet = roundHistory.bets[playerId];
            const tricks = roundHistory.tricks[playerId];
            const score = roundHistory.scores[playerId];
            // Joker count from history (default to 0 if missing)
            const jokerCount = roundHistory.jokerCounts?.[playerId] ?? 0;

            pulkaRounds.push({
              roundNumber: roundNum,
              cardsPerPlayer: roundHistory.cardsPerPlayer,
              bid: bet,
              bidMade: bet !== null && tricks !== null && bet === tricks, // Dot if contract made
              tricks: tricks ?? 0,
              score: score ?? 0,
              jokerCount: jokerCount as 0 | 1 | 2,
            });

            pulkaRoundScoresSum += score ?? 0;
          } else {
            // Placeholder for incomplete games/rounds
            pulkaRounds.push({
              roundNumber: roundNum,
              cardsPerPlayer: structure.cardsPerRound[idx],
              bid: null,
              bidMade: false,
              tricks: 0,
              score: 0,
              jokerCount: 0,
            });
          }
        });

        // Calculate average
        const pulkaAverage = pulkaRounds.length > 0 ? pulkaRoundScoresSum / pulkaRounds.length : 0;
        // Format to 1 decimal place usually, but store as number here
        const formattedAvg = Number(pulkaAverage.toFixed(1));

        // Get cumulative total from player state if available
        // player.pulkaScores stores [totalAfterP1, totalAfterP2, ...]
        const cumulativeTotal = player.pulkaScores[pulkaNum - 1] ?? 0;

        // Calculate premium: (Total After This Pulka) - (Total After Prev Pulka) - (Sum of Rounds)
        // If it's first pulka: Total After P1 - 0 - Sum Rounds
        const totalGainedInPulka = cumulativeTotal - previousPulkaCumulativeTotal;
        const premiumScore = totalGainedInPulka - pulkaRoundScoresSum;

        pulkaSummaries.push({
          pulkaNumber: pulkaNum,
          rounds: pulkaRounds,
          pulkaAverage: formattedAvg,
          cumulativeTotal,
          premiumScore,
        });

        previousPulkaCumulativeTotal = cumulativeTotal;
      });

      return {
        playerId,
        playerName: player.name,
        place: (placeMap.get(playerId) ?? 4) as 1 | 2 | 3 | 4,
        totalScore: player.totalScore,
        pulkaSummaries,
        isWinner: placeMap.get(playerId) === 1,
        seatIndex,
      };
    });

    // Sort rankings by place for the final result list?
    // The requirement says "rankings" usually implies sorted order.
    // However, for the scoresheet view, we often want seat order.
    // The type definition says "rankings: PlayerRanking[]", usually sorted 1st to 4th.
    // Let's return them sorted by place. The frontend can re-sort by seatIndex if needed for table.
    rankings.sort((a, b) => a.place - b.place);

    return {
      gameId,
      finishedAt: Date.now(),
      rankings,
    };
  }
}
