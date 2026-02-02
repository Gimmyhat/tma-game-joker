import {
  hasJokersInHand,
  checkTookAll,
  checkPerfectPass,
  checkSpoiled,
  calculatePlayerBadges,
  updatePlayerBadgeTracking,
  resetPlayerBadgeTracking,
  Card,
  Player,
  Suit,
} from '@joker/shared';

describe('Badge Logic', () => {
  // Helper to create test cards
  const createJoker = (id: number): Card => ({
    type: 'joker',
    id: `joker-${id}`,
    jokerId: id as 1 | 2,
  });

  const createStandardCard = (suit: Suit, rank: number): Card => ({
    type: 'standard',
    id: `${suit}-${rank}`,
    suit,
    rank: rank as 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14,
  });

  // Helper to create test player
  const createPlayer = (overrides: Partial<Player> = {}): Player => ({
    id: 'test-player',
    name: 'Test Player',
    isBot: false,
    controlledByBot: false,
    connected: true,
    hand: [],
    bet: null,
    tricks: 0,
    roundScores: [],
    pulkaScores: [],
    totalScore: 0,
    spoiled: false,
    hadJokerInRounds: [],
    jokerCountPerRound: [],
    tookAllInPulka: false,
    perfectPassInPulka: false,
    ...overrides,
  });

  describe('hasJokersInHand', () => {
    it('should return true when hand contains jokers', () => {
      const hand = [createJoker(1), createStandardCard(Suit.Hearts, 10)];
      expect(hasJokersInHand(hand)).toBe(true);
    });

    it('should return true when hand contains multiple jokers', () => {
      const hand = [createJoker(1), createJoker(2)];
      expect(hasJokersInHand(hand)).toBe(true);
    });

    it('should return false when hand has no jokers', () => {
      const hand = [createStandardCard(Suit.Hearts, 10), createStandardCard(Suit.Spades, 14)];
      expect(hasJokersInHand(hand)).toBe(false);
    });

    it('should return false for empty hand', () => {
      expect(hasJokersInHand([])).toBe(false);
    });
  });

  describe('checkTookAll', () => {
    it('should return true when bet === tricks === roundLength', () => {
      expect(checkTookAll(5, 5, 5)).toBe(true);
      expect(checkTookAll(1, 1, 1)).toBe(true);
      expect(checkTookAll(9, 9, 9)).toBe(true);
    });

    it('should return false when bet !== roundLength', () => {
      expect(checkTookAll(3, 3, 5)).toBe(false);
    });

    it('should return false when tricks !== roundLength', () => {
      expect(checkTookAll(5, 3, 5)).toBe(false);
    });

    it('should return false for roundLength 0', () => {
      expect(checkTookAll(0, 0, 0)).toBe(false);
    });
  });

  describe('checkPerfectPass', () => {
    it('should return true when bet === 0 and tricks === 0', () => {
      expect(checkPerfectPass(0, 0)).toBe(true);
    });

    it('should return false when bet === 0 but tricks > 0', () => {
      expect(checkPerfectPass(0, 1)).toBe(false);
      expect(checkPerfectPass(0, 3)).toBe(false);
    });

    it('should return false when bet > 0', () => {
      expect(checkPerfectPass(1, 1)).toBe(false);
      expect(checkPerfectPass(2, 0)).toBe(false);
    });
  });

  describe('checkSpoiled', () => {
    it('should return false when bet === tricks', () => {
      expect(checkSpoiled(0, 0)).toBe(false);
      expect(checkSpoiled(3, 3)).toBe(false);
      expect(checkSpoiled(5, 5)).toBe(false);
    });

    it('should return true when bet !== tricks', () => {
      expect(checkSpoiled(2, 0)).toBe(true);
      expect(checkSpoiled(3, 5)).toBe(true);
      expect(checkSpoiled(0, 2)).toBe(true);
    });
  });

  describe('calculatePlayerBadges', () => {
    it('should show joker badge for own hand with jokers', () => {
      const player = createPlayer({
        hand: [createJoker(1)],
      });

      const badges = calculatePlayerBadges(player, false, true);
      expect(badges.hasJokers).toBe(true);
    });

    it('should hide joker badge for other players hands', () => {
      const player = createPlayer({
        hand: [createJoker(1)],
      });

      const badges = calculatePlayerBadges(player, false, false);
      expect(badges.hasJokers).toBe(false);
    });

    it('should show spoiled badge when player is spoiled', () => {
      const player = createPlayer({ spoiled: true });

      const badges = calculatePlayerBadges(player, false, true);
      expect(badges.spoiled).toBe(true);
    });

    it('should show perfectPulka only at pulka completion and when not spoiled', () => {
      const cleanPlayer = createPlayer({ spoiled: false });
      const spoiledPlayer = createPlayer({ spoiled: true });

      // During pulka
      expect(calculatePlayerBadges(cleanPlayer, false, true).perfectPulka).toBe(false);

      // At pulka end
      expect(calculatePlayerBadges(cleanPlayer, true, true).perfectPulka).toBe(true);
      expect(calculatePlayerBadges(spoiledPlayer, true, true).perfectPulka).toBe(false);
    });

    it('should show tookAll and perfectPass badges from player flags', () => {
      const player = createPlayer({
        tookAllInPulka: true,
        perfectPassInPulka: true,
      });

      const badges = calculatePlayerBadges(player, false, true);
      expect(badges.tookAll).toBe(true);
      expect(badges.perfectPass).toBe(true);
    });

    it('should handle player with all badges active', () => {
      const player = createPlayer({
        hand: [createJoker(1)],
        spoiled: false,
        tookAllInPulka: true,
        perfectPassInPulka: true,
      });

      const badges = calculatePlayerBadges(player, true, true);
      expect(badges.hasJokers).toBe(true);
      expect(badges.spoiled).toBe(false);
      expect(badges.perfectPulka).toBe(true);
      expect(badges.tookAll).toBe(true);
      expect(badges.perfectPass).toBe(true);
    });
  });

  describe('updatePlayerBadgeTracking', () => {
    it('should track tookAll achievement', () => {
      const player = createPlayer({ tookAllInPulka: false });

      const updates = updatePlayerBadgeTracking(player, 5, 5, 5);
      expect(updates.tookAllInPulka).toBe(true);
    });

    it('should preserve existing tookAll', () => {
      const player = createPlayer({ tookAllInPulka: true });

      const updates = updatePlayerBadgeTracking(player, 3, 3, 5);
      expect(updates.tookAllInPulka).toBe(true);
    });

    it('should track perfectPass achievement', () => {
      const player = createPlayer({ perfectPassInPulka: false });

      const updates = updatePlayerBadgeTracking(player, 0, 0, 5);
      expect(updates.perfectPassInPulka).toBe(true);
    });

    it('should preserve existing perfectPass', () => {
      const player = createPlayer({ perfectPassInPulka: true });

      const updates = updatePlayerBadgeTracking(player, 2, 2, 5);
      expect(updates.perfectPassInPulka).toBe(true);
    });
  });

  describe('resetPlayerBadgeTracking', () => {
    it('should reset all pulka tracking flags', () => {
      const resets = resetPlayerBadgeTracking();

      expect(resets.spoiled).toBe(false);
      expect(resets.tookAllInPulka).toBe(false);
      expect(resets.perfectPassInPulka).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle player with joker and failed contract (🎭❌)', () => {
      const player = createPlayer({
        hand: [createJoker(1)],
        spoiled: true,
      });

      const badges = calculatePlayerBadges(player, false, true);
      expect(badges.hasJokers).toBe(true);
      expect(badges.spoiled).toBe(true);
    });

    it('should handle multiple achievements in one pulka (💎⚡)', () => {
      const player = createPlayer({
        tookAllInPulka: true,
        perfectPassInPulka: true,
      });

      const badges = calculatePlayerBadges(player, false, true);
      expect(badges.tookAll).toBe(true);
      expect(badges.perfectPass).toBe(true);
    });

    it('should handle perfect pulka with all achievements (⭐💎⚡)', () => {
      const player = createPlayer({
        spoiled: false,
        tookAllInPulka: true,
        perfectPassInPulka: true,
      });

      const badges = calculatePlayerBadges(player, true, true);
      expect(badges.perfectPulka).toBe(true);
      expect(badges.tookAll).toBe(true);
      expect(badges.perfectPass).toBe(true);
    });
  });
});
