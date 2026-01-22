import { MoveValidator } from '../validators/move.validator';
import { Suit, Rank, Card, TableCard, JokerOption, StandardCard } from '@joker/shared';

describe('MoveValidator', () => {
  let validator: MoveValidator;

  beforeEach(() => {
    validator = new MoveValidator();
  });

  const createCard = (suit: Suit, rank: Rank): StandardCard => ({
    type: 'standard',
    id: `${suit}-${rank}`,
    suit,
    rank,
  });

  const createJoker = (id: 1 | 2) => ({
    type: 'joker' as const,
    id: `joker-${id}`,
    jokerId: id,
  });

  describe('validate', () => {
    it('should allow any card on empty table', () => {
      const hand: Card[] = [
        createCard(Suit.Hearts, Rank.Seven),
        createCard(Suit.Spades, Rank.Ace),
      ];

      const result = validator.validate(hand, hand[0], [], null);
      expect(result.valid).toBe(true);
    });

    it('should require card to be in hand', () => {
      const hand: Card[] = [createCard(Suit.Hearts, Rank.Seven)];
      const card = createCard(Suit.Spades, Rank.Ace);

      const result = validator.validate(hand, card, [], null);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('CARD_NOT_IN_HAND');
    });

    it('should always allow joker', () => {
      const joker = createJoker(1);
      const hand: Card[] = [createCard(Suit.Hearts, Rank.Seven), joker];
      const table: TableCard[] = [
        { card: createCard(Suit.Spades, Rank.Ace), playerId: 'p1' },
      ];

      const result = validator.validate(hand, joker, table, null);
      expect(result.valid).toBe(true);
    });

    it('should require following lead suit when possible', () => {
      const hand: Card[] = [
        createCard(Suit.Hearts, Rank.Seven),
        createCard(Suit.Spades, Rank.Ace),
      ];
      const table: TableCard[] = [
        { card: createCard(Suit.Hearts, Rank.King), playerId: 'p1' },
      ];

      const validResult = validator.validate(hand, hand[0], table, null);
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validate(hand, hand[1], table, null);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toBe('MUST_FOLLOW_SUIT');
    });

    it('should require playing trump if no lead suit', () => {
      const hand: Card[] = [
        createCard(Suit.Diamonds, Rank.Seven),
        createCard(Suit.Spades, Rank.Ace),
      ];
      const table: TableCard[] = [
        { card: createCard(Suit.Hearts, Rank.King), playerId: 'p1' },
      ];

      // Spades is trump
      const validResult = validator.validate(hand, hand[1], table, Suit.Spades);
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validate(hand, hand[0], table, Suit.Spades);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toBe('MUST_PLAY_TRUMP');
    });

    it('should allow any card if no lead suit and no trump', () => {
      const hand: Card[] = [
        createCard(Suit.Diamonds, Rank.Seven),
        createCard(Suit.Clubs, Rank.Ace),
      ];
      const table: TableCard[] = [
        { card: createCard(Suit.Hearts, Rank.King), playerId: 'p1' },
      ];

      // No trump, no hearts in hand
      const result1 = validator.validate(hand, hand[0], table, null);
      expect(result1.valid).toBe(true);

      const result2 = validator.validate(hand, hand[1], table, null);
      expect(result2.valid).toBe(true);
    });

    it('should allow joker even when holding lead suit', () => {
      const joker = createJoker(1);
      const hand: Card[] = [createCard(Suit.Hearts, Rank.Seven), joker];
      const table: TableCard[] = [
        { card: createCard(Suit.Hearts, Rank.King), playerId: 'p1' },
      ];

      const result = validator.validate(hand, joker, table, null);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateJokerPlay', () => {
    it('should require High or Low for first card', () => {
      const validHigh = validator.validateJokerPlay([], JokerOption.High, Suit.Hearts);
      expect(validHigh.valid).toBe(true);

      const validLow = validator.validateJokerPlay([], JokerOption.Low, Suit.Spades);
      expect(validLow.valid).toBe(true);

      const invalidTop = validator.validateJokerPlay([], JokerOption.Top);
      expect(invalidTop.valid).toBe(false);
    });

    it('should require suit for High/Low', () => {
      const result = validator.validateJokerPlay([], JokerOption.High);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('MUST_SPECIFY_SUIT');
    });

    it('should require Top or Bottom for non-first card', () => {
      const table: TableCard[] = [
        { card: createCard(Suit.Hearts, Rank.King), playerId: 'p1' },
      ];

      const validTop = validator.validateJokerPlay(table, JokerOption.Top);
      expect(validTop.valid).toBe(true);

      const validBottom = validator.validateJokerPlay(table, JokerOption.Bottom);
      expect(validBottom.valid).toBe(true);

      const invalidHigh = validator.validateJokerPlay(table, JokerOption.High, Suit.Hearts);
      expect(invalidHigh.valid).toBe(false);
    });
  });

  describe('validateResponseToJokerHigh', () => {
    it('should allow joker as response', () => {
      const joker = createJoker(1);
      const hand: Card[] = [createCard(Suit.Hearts, Rank.Seven), joker];

      const result = validator.validateResponseToJokerHigh(hand, joker, Suit.Spades, null);
      expect(result.valid).toBe(true);
    });

    it('should require highest card of requested suit', () => {
      const hand: Card[] = [
        createCard(Suit.Hearts, Rank.Seven),
        createCard(Suit.Hearts, Rank.King),
        createCard(Suit.Hearts, Rank.Ace),
      ];

      const validResult = validator.validateResponseToJokerHigh(hand, hand[2], Suit.Hearts, null);
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validateResponseToJokerHigh(hand, hand[0], Suit.Hearts, null);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.reason).toBe('MUST_PLAY_HIGHEST');
    });

    it('should require trump if no requested suit', () => {
      const hand: Card[] = [
        createCard(Suit.Diamonds, Rank.Seven),
        createCard(Suit.Spades, Rank.Ace),
      ];

      const validResult = validator.validateResponseToJokerHigh(hand, hand[1], Suit.Hearts, Suit.Spades);
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validateResponseToJokerHigh(hand, hand[0], Suit.Hearts, Suit.Spades);
      expect(invalidResult.valid).toBe(false);
    });

    it('should allow any card if no suit and no trump', () => {
      const hand: Card[] = [
        createCard(Suit.Diamonds, Rank.Seven),
        createCard(Suit.Clubs, Rank.Ace),
      ];

      const result = validator.validateResponseToJokerHigh(hand, hand[0], Suit.Hearts, null);
      expect(result.valid).toBe(true);
    });
  });

  describe('getValidCards', () => {
    it('should return all cards on empty table', () => {
      const hand: Card[] = [
        createCard(Suit.Hearts, Rank.Seven),
        createCard(Suit.Spades, Rank.Ace),
        createJoker(1),
      ];

      const validCards = validator.getValidCards(hand, [], null);
      expect(validCards.length).toBe(3);
    });

    it('should filter to lead suit cards only', () => {
      const hand: Card[] = [
        createCard(Suit.Hearts, Rank.Seven),
        createCard(Suit.Hearts, Rank.Ace),
        createCard(Suit.Spades, Rank.King),
        createJoker(1),
      ];
      const table: TableCard[] = [
        { card: createCard(Suit.Hearts, Rank.Ten), playerId: 'p1' },
      ];

      const validCards = validator.getValidCards(hand, table, null);
      // Hearts cards + Joker
      expect(validCards.length).toBe(3);
      expect(validCards.map((c) => c.id)).toContain('hearts-7');
      expect(validCards.map((c) => c.id)).toContain('hearts-14');
      expect(validCards.map((c) => c.id)).toContain('joker-1');
    });
  });
});
