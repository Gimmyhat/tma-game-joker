import { DeckService } from '../services/deck.service';
import { Suit, Rank, JokerOption, TableCard, StandardCard } from '@joker/shared';

describe('DeckService', () => {
  let deckService: DeckService;

  beforeEach(() => {
    deckService = new DeckService();
  });

  describe('createDeck', () => {
    it('should create a deck of 36 cards', () => {
      const deck = deckService.createDeck();
      expect(deck.length).toBe(36);
    });

    it('should have 34 standard cards and 2 jokers', () => {
      const deck = deckService.createDeck();
      const standardCards = deck.filter((c) => c.type === 'standard');
      const jokers = deck.filter((c) => c.type === 'joker');

      expect(standardCards.length).toBe(34);
      expect(jokers.length).toBe(2);
    });

    it('should not contain black sixes (6♣, 6♠)', () => {
      const deck = deckService.createDeck();
      const blackSixes = deck.filter(
        (c) =>
          c.type === 'standard' &&
          (c as StandardCard).rank === Rank.Six &&
          ((c as StandardCard).suit === Suit.Clubs || (c as StandardCard).suit === Suit.Spades),
      );

      expect(blackSixes.length).toBe(0);
    });

    it('should contain red sixes (6♥, 6♦)', () => {
      const deck = deckService.createDeck();
      const redSixes = deck.filter(
        (c) =>
          c.type === 'standard' &&
          (c as StandardCard).rank === Rank.Six &&
          ((c as StandardCard).suit === Suit.Hearts || (c as StandardCard).suit === Suit.Diamonds),
      );

      expect(redSixes.length).toBe(2);
    });

    it('should have all suits for non-six ranks', () => {
      const deck = deckService.createDeck();
      const aces = deck.filter(
        (c) => c.type === 'standard' && (c as StandardCard).rank === Rank.Ace,
      );

      expect(aces.length).toBe(4);
    });
  });

  describe('shuffle', () => {
    it('should return deck of same length', () => {
      const deck = deckService.createDeck();
      const shuffled = deckService.shuffle(deck);

      expect(shuffled.length).toBe(deck.length);
    });

    it('should contain all original cards', () => {
      const deck = deckService.createDeck();
      const shuffled = deckService.shuffle(deck);

      const originalIds = new Set(deck.map((c) => c.id));
      const shuffledIds = new Set(shuffled.map((c) => c.id));

      expect(shuffledIds).toEqual(originalIds);
    });

    it('should produce different order (statistical)', () => {
      const deck = deckService.createDeck();
      const shuffled1 = deckService.shuffle(deck);
      const shuffled2 = deckService.shuffle(deck);

      // Very unlikely both shuffles produce exact same order
      const sameOrder =
        shuffled1.every((card, i) => card.id === shuffled2[i].id) &&
        shuffled1.every((card, i) => card.id === deck[i].id);

      expect(sameOrder).toBe(false);
    });
  });

  describe('deal', () => {
    it('should deal correct number of cards to each player', () => {
      const deck = deckService.shuffle(deckService.createDeck());
      const { hands } = deckService.deal(deck, 4, 5);

      expect(hands.length).toBe(4);
      hands.forEach((hand) => expect(hand.length).toBe(5));
    });

    it('should return remaining deck', () => {
      const deck = deckService.shuffle(deckService.createDeck());
      const { hands, remainingDeck } = deckService.deal(deck, 4, 5);

      const totalDealt = hands.reduce((sum, hand) => sum + hand.length, 0);
      expect(remainingDeck.length).toBe(36 - totalDealt);
    });

    it('should deal all cards for 9-card round', () => {
      const deck = deckService.shuffle(deckService.createDeck());
      const { hands, remainingDeck } = deckService.deal(deck, 4, 9);

      expect(remainingDeck.length).toBe(0);
      hands.forEach((hand) => expect(hand.length).toBe(9));
    });
  });

  describe('determineTrump', () => {
    it('should return suit of top card', () => {
      const deck: StandardCard[] = [
        { type: 'standard', id: 'hearts-14', suit: Suit.Hearts, rank: Rank.Ace },
      ];

      const trump = deckService.determineTrump(deck);
      expect(trump).toBe(Suit.Hearts);
    });

    it('should return null if joker is top card', () => {
      const deck = [{ type: 'joker' as const, id: 'joker-1', jokerId: 1 as const }];

      const trump = deckService.determineTrump(deck);
      expect(trump).toBeNull();
    });

    it('should return null if deck is empty', () => {
      const trump = deckService.determineTrump([]);
      expect(trump).toBeNull();
    });
  });

  describe('determineTrickWinner', () => {
    it('should return highest card of lead suit', () => {
      const table: TableCard[] = [
        { card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Seven }, playerId: 'p1' },
        { card: { type: 'standard', id: '2', suit: Suit.Hearts, rank: Rank.Ace }, playerId: 'p2' },
        { card: { type: 'standard', id: '3', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Ten }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(1); // p2 has Ace
    });

    it('should trump beat non-trump', () => {
      const table: TableCard[] = [
        { card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Ace }, playerId: 'p1' },
        { card: { type: 'standard', id: '2', suit: Suit.Spades, rank: Rank.Six }, playerId: 'p2' },
        { card: { type: 'standard', id: '3', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Ten }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, Suit.Spades);
      expect(winner).toBe(1); // p2 has trump (even low)
    });

    it('should joker Top beat all', () => {
      const table: TableCard[] = [
        { card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Ace }, playerId: 'p1' },
        { card: { type: 'joker', id: 'j1', jokerId: 1 }, playerId: 'p2', jokerOption: JokerOption.Top },
        { card: { type: 'standard', id: '3', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Ten }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(1); // Joker Top wins
    });

    it('should joker Bottom not win', () => {
      const table: TableCard[] = [
        { card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Seven }, playerId: 'p1' },
        { card: { type: 'joker', id: 'j1', jokerId: 1 }, playerId: 'p2', jokerOption: JokerOption.Bottom },
        { card: { type: 'standard', id: '3', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Ten }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(2); // p3 King wins (Joker Bottom loses)
    });

    it('should last joker Top win when both play Top', () => {
      const table: TableCard[] = [
        { card: { type: 'joker', id: 'j1', jokerId: 1 }, playerId: 'p1', jokerOption: JokerOption.Top },
        { card: { type: 'standard', id: '2', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p2' },
        { card: { type: 'joker', id: 'j2', jokerId: 2 }, playerId: 'p3', jokerOption: JokerOption.Top },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Ten }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(2); // p3 (last joker Top) wins
    });
  });

  describe('tuzovanie', () => {
    it('should return valid dealer index (0-3)', () => {
      const { dealerIndex } = deckService.tuzovanie(4);
      expect(dealerIndex).toBeGreaterThanOrEqual(0);
      expect(dealerIndex).toBeLessThan(4);
    });

    it('should deal cards until first ace', () => {
      const { cardsDealt } = deckService.tuzovanie(4);

      // Find ace
      let aceFound = false;
      for (const hand of cardsDealt) {
        for (const card of hand) {
          if (card.type === 'standard' && (card as StandardCard).rank === Rank.Ace) {
            aceFound = true;
            break;
          }
        }
        if (aceFound) break;
      }

      expect(aceFound).toBe(true);
    });
  });
});
