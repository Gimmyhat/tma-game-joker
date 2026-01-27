import { Card, Player, PlayerBadges } from '../index';

/**
 * Badge calculation utilities for Georgian Joker "Popular" variant
 *
 * Badges:
 * - 🎭 hasJokers: Player has joker(s) in hand
 * - ❌ spoiled: Player failed a contract this pulka
 * - ⭐ perfectPulka: All contracts exact in pulka (shown at pulka end)
 * - 💎 tookAll: "Took all" at least once (bet === tricks === roundLength)
 * - ⚡ perfectPass: Perfect pass at least once (bet === 0, tricks === 0)
 */

/**
 * Check if player's hand contains any jokers
 */
export function hasJokersInHand(hand: Card[]): boolean {
  return hand.some((card) => card.type === 'joker');
}

/**
 * Check if player "took all" in a round
 * (bet === tricks === roundLength, and roundLength > 0)
 */
export function checkTookAll(bet: number, tricks: number, roundLength: number): boolean {
  return roundLength > 0 && bet === tricks && bet === roundLength;
}

/**
 * Check if player had a perfect pass
 * (bet === 0, tricks === 0)
 */
export function checkPerfectPass(bet: number, tricks: number): boolean {
  return bet === 0 && tricks === 0;
}

/**
 * Check if player failed their contract (spoiled)
 * (bet >= 1, tricks !== bet)
 */
export function checkSpoiled(bet: number, tricks: number): boolean {
  return bet !== tricks;
}

/**
 * Calculate all badges for a player
 *
 * @param player - Player data
 * @param isPulkaComplete - Whether the current pulka is complete
 * @param isOwnHand - Whether this is the player's own hand (for joker visibility)
 * @returns PlayerBadges object
 */
export function calculatePlayerBadges(
  player: Player,
  isPulkaComplete: boolean = false,
  isOwnHand: boolean = true,
): PlayerBadges {
  return {
    // Only show jokers for own hand (other players' jokers are hidden)
    hasJokers: isOwnHand ? hasJokersInHand(player.hand) : false,
    // Spoiled flag is tracked on the player object
    spoiled: player.spoiled,
    // Perfect pulka: completed all contracts (only meaningful at pulka end)
    perfectPulka: isPulkaComplete && !player.spoiled,
    // Took all: at least once this pulka
    tookAll: player.tookAllInPulka ?? false,
    // Perfect pass: at least once this pulka
    perfectPass: player.perfectPassInPulka ?? false,
  };
}

/**
 * Update player's pulka tracking flags after a round
 * Call this after scoring each round
 *
 * @param player - Current player state
 * @param bet - Player's bet for this round
 * @param tricks - Tricks taken this round
 * @param roundLength - Number of cards per player this round
 * @returns Updated player with badge tracking flags
 */
export function updatePlayerBadgeTracking(
  player: Player,
  bet: number,
  tricks: number,
  roundLength: number,
): Partial<Player> {
  return {
    // Track "took all" achievement
    tookAllInPulka: player.tookAllInPulka || checkTookAll(bet, tricks, roundLength),
    // Track "perfect pass" achievement
    perfectPassInPulka: player.perfectPassInPulka || checkPerfectPass(bet, tricks),
  };
}

/**
 * Reset pulka tracking flags for a player
 * Call this at the start of a new pulka
 */
export function resetPlayerBadgeTracking(): Partial<Player> {
  return {
    spoiled: false,
    tookAllInPulka: false,
    perfectPassInPulka: false,
  };
}
