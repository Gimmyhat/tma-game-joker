import { BetValidator } from '../validators/bet.validator';

describe('BetValidator', () => {
  let validator: BetValidator;

  beforeEach(() => {
    validator = new BetValidator();
  });

  describe('validate', () => {
    it('should accept valid bet within range', () => {
      const result = validator.validate([null, null, null, null], 3, 5, 0, 3);
      expect(result.valid).toBe(true);
    });

    it('should reject negative bet', () => {
      const result = validator.validate([null, null, null, null], -1, 5, 0, 3);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('BET_NEGATIVE');
    });

    it('should reject bet exceeding round length', () => {
      const result = validator.validate([null, null, null, null], 6, 5, 0, 3);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('BET_TOO_HIGH');
    });

    it('should allow zero bet', () => {
      const result = validator.validate([null, null, null, null], 0, 5, 0, 3);
      expect(result.valid).toBe(true);
    });

    it('should allow bet equal to round length', () => {
      const result = validator.validate([null, null, null, null], 5, 5, 0, 3);
      expect(result.valid).toBe(true);
    });

    describe('forced bet rule (last player)', () => {
      it('should forbid bet that equals remaining', () => {
        // Round of 5, bets: 2, 1, 1 = 4. Dealer cannot bet 1 (4+1=5)
        const result = validator.validate([2, 1, 1, null], 1, 5, 3, 3);
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('FORBIDDEN_BET');
        expect(result.forbiddenBet).toBe(1);
      });

      it('should allow dealer to bet more than remaining', () => {
        // Round of 5, bets: 2, 1, 1 = 4. Dealer CAN bet 2
        const result = validator.validate([2, 1, 1, null], 2, 5, 3, 3);
        expect(result.valid).toBe(true);
      });

      it('should allow dealer to bet less than remaining', () => {
        // Round of 5, bets: 2, 1, 1 = 4. Dealer CAN bet 0
        const result = validator.validate([2, 1, 1, null], 0, 5, 3, 3);
        expect(result.valid).toBe(true);
      });

      it('should allow non-dealer any valid bet', () => {
        // Round of 5, first player can bet anything
        const result = validator.validate([null, null, null, null], 5, 5, 0, 3);
        expect(result.valid).toBe(true);
      });

      it('should handle edge case: all zeros before dealer', () => {
        // Round of 3, bets: 0, 0, 0. Dealer cannot bet 3
        const result = validator.validate([0, 0, 0, null], 3, 3, 3, 3);
        expect(result.valid).toBe(false);
      });

      it('should handle edge case: sum already exceeds round length', () => {
        // Round of 3, bets: 2, 2, 2 = 6. Dealer can bet anything (no forbidden)
        const result = validator.validate([2, 2, 2, null], 0, 3, 3, 3);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('getValidBets', () => {
    it('should return all bets for non-dealer', () => {
      const validBets = validator.getValidBets([null, null, null, null], 5, 0, 3);
      expect(validBets).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it('should exclude forbidden bet for dealer', () => {
      // Round of 5, bets: 2, 1, 1 = 4. Forbidden: 1
      const validBets = validator.getValidBets([2, 1, 1, null], 5, 3, 3);
      expect(validBets).toEqual([0, 2, 3, 4, 5]);
      expect(validBets).not.toContain(1);
    });

    it('should return all bets if sum already exceeds round', () => {
      const validBets = validator.getValidBets([3, 3, 3, null], 3, 3, 3);
      expect(validBets).toEqual([0, 1, 2, 3]);
    });
  });

  describe('getForbiddenBet', () => {
    it('should return null for non-dealer', () => {
      const forbidden = validator.getForbiddenBet([null, null, null, null], 5, 0, 3);
      expect(forbidden).toBeNull();
    });

    it('should return correct forbidden bet for dealer', () => {
      const forbidden = validator.getForbiddenBet([2, 1, 1, null], 5, 3, 3);
      expect(forbidden).toBe(1);
    });

    it('should return null if forbidden bet out of range', () => {
      // Sum is 10, round is 5. Forbidden would be -5 (out of range)
      const forbidden = validator.getForbiddenBet([4, 3, 3, null], 5, 3, 3);
      expect(forbidden).toBeNull();
    });
  });

  describe('allBetsPlaced', () => {
    it('should return true when all bets are numbers', () => {
      expect(validator.allBetsPlaced([2, 1, 1, 3])).toBe(true);
    });

    it('should return false when any bet is null', () => {
      expect(validator.allBetsPlaced([2, 1, null, 3])).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(validator.allBetsPlaced([])).toBe(true);
    });
  });

  describe('calculateTrickDifference', () => {
    it('should return 0 when sum equals round length', () => {
      // This shouldn't happen due to forced bet rule, but test the math
      expect(validator.calculateTrickDifference([1, 1, 1, 2], 5)).toBe(0);
    });

    it('should return positive when "pushing" (extra tricks)', () => {
      // Sum = 7, round = 5. 2 extra tricks will be taken
      expect(validator.calculateTrickDifference([2, 2, 2, 1], 5)).toBe(2);
    });

    it('should return negative when "pulling" (missing tricks)', () => {
      // Sum = 3, round = 5. 2 tricks will be unaccounted
      expect(validator.calculateTrickDifference([1, 1, 1, 0], 5)).toBe(-2);
    });
  });
});
