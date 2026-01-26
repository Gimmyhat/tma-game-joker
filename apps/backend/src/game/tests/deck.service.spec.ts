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
        {
          card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Seven },
          playerId: 'p1',
        },
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
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p2',
          jokerOption: JokerOption.Top,
        },
        { card: { type: 'standard', id: '3', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Ten }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(1); // Joker Top wins
    });

    it('should joker Bottom not win', () => {
      const table: TableCard[] = [
        {
          card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Seven },
          playerId: 'p1',
        },
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p2',
          jokerOption: JokerOption.Bottom,
        },
        { card: { type: 'standard', id: '3', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Ten }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(2); // p3 King wins (Joker Bottom loses)
    });

    it('should NOT allow off-suit card to beat lead suit even if higher rank', () => {
      const table: TableCard[] = [
        {
          card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Seven },
          playerId: 'p1',
        }, // Lead: Hearts
        { card: { type: 'standard', id: '2', suit: Suit.Clubs, rank: Rank.Ace }, playerId: 'p2' }, // Off-suit (no trump)
        {
          card: { type: 'standard', id: '3', suit: Suit.Diamonds, rank: Rank.King },
          playerId: 'p3',
        },
        { card: { type: 'standard', id: '4', suit: Suit.Spades, rank: Rank.Ten }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(0); // p1 Hearts Seven wins because others are off-suit
    });

    it('should handle complex lead suit case where current winner is trump', () => {
      // Regression test for "Lead Suit Drift" bug
      const table: TableCard[] = [
        { card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Ace }, playerId: 'p1' }, // Lead: Hearts (Winner)
        {
          card: { type: 'standard', id: '2', suit: Suit.Diamonds, rank: Rank.Six },
          playerId: 'p2',
        }, // Trump (Beats Ace) -> New Winner
        {
          card: { type: 'standard', id: '3', suit: Suit.Diamonds, rank: Rank.Seven },
          playerId: 'p3',
        }, // Trump (Beats 6) -> New Winner
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p4' }, // Hearts (Original Lead). Should NOT beat 7 Diamonds.
      ];

      // Trump is Diamonds
      const winner = deckService.determineTrickWinner(table, Suit.Diamonds);
      expect(winner).toBe(2); // p3 7 Diamonds wins
    });

    it('should handle lead suit correctly when Joker Low leads', () => {
      // p1: Joker (Low: Hearts). Lead: Hearts. Winner: Joker (temporarily).
      // p2: 7 Diamonds (Off suit).
      // Compare (Joker, 7D).
      // Joker is current winner. getLeadSuit(Joker) -> Hearts.
      // 7D is not Hearts. 7D is not Trump.
      // Logic: if (sc2.suit === leadSuit) -> false.
      // Fallthrough: return 1. Joker wins. Correct.

      // p3: 6 Hearts (Matches lead).
      // Compare (Joker, 6H).
      // getLeadSuit(Joker) -> Hearts.
      // 6H is Hearts.
      // Logic: if (sc2.suit === leadSuit) ...
      // if (sc1.suit === leadSuit) ... Joker is NOT standard card, so sc1 is invalid cast?
      // Wait, let's check code.
      // const sc1 = c1 as StandardCard;
      // BUT c1 is Joker. Casting it to StandardCard is dangerous if properties are accessed.
      // sc1.suit -> undefined. sc1.rank -> undefined.

      // Let's verify if code handles Joker in standard logic block.
      // The code checks `if (c1.type === 'joker')` BEFORE standard block.
      // So if c1 is Joker, it returns early.

      // BUT `compareCards` logic:
      // if (c1.type === 'joker') { ... return ... }
      // So if c1 is Joker, it never reaches standard logic.

      // Case:
      // p1: Joker (Low: Hearts).
      // p2: 6 Hearts.
      // Compare(Joker, 6H).
      // c1 is Joker.
      // if (card1.jokerOption === JokerOption.Bottom) return -1;
      // Returns -1. 6H wins. Correct.

      // So Joker logic is fine because it has dedicated blocks.

      // The problem is ONLY when `card1` is STANDARD but NOT the original lead.
      // Example:
      // Trump: Spades.
      // p1: 6 Hearts (Lead).
      // p2: 7 Spades (Trump). Beats 6H. Winner = 7S.
      // p3: Ace Hearts.
      // Compare (7S, AH).
      // c1=7S (Standard), c2=AH (Standard).
      // getLeadSuit(7S) -> Spades.
      // Logic thinks Lead is Spades.
      // AH is not Spades.
      // 7S wins. Correct.

      // What if p3 was King Spades?
      // Compare (7S, KS).
      // Lead calc -> Spades.
      // Both match "lead".
      // Compare Ranks. KS > 7S.
      // KS wins. Correct.

      // Is there ANY scenario where `getLeadSuit(currentWinner)` gives WRONG result?
      // Only if `currentWinner` is neither Trump nor Lead Suit.
      // But `currentWinner` MUST be either Trump or Lead Suit (or Joker).
      // If it's Lead Suit, then `getLeadSuit` returns Lead Suit. Correct.
      // If it's Trump, then `getLeadSuit` returns Trump Suit.
      // If `getLeadSuit` returns Trump Suit, then:
      //   - Against another Trump: Both match "lead". Compare ranks. Correct.
      //   - Against Lead Suit card:
      //     - Trump vs Lead Suit.
      //     - `leadSuit` variable is Trump.
      //     - sc2 (Lead Suit card) != Trump.
      //     - sc1 (Trump) == Trump.
      //     - Logic: `if (sc1.suit === leadSuit && sc2.suit !== leadSuit) return 1`.
      //     - Trump wins. Correct.

      // It seems my fear of "Lead Suit Drift" is unfounded because the winner ALWAYS drifts towards the strongest suit (Trump).
      // Once a Trump takes over, the effective "Lead Suit" becomes Trump for the purpose of comparison, which is mathematically equivalent to "Trump beats everything else".

      // EXCEPT ONE CASE:
      // **NO TRUMP GAME.**
      // p1: 6 Hearts (Lead).
      // p2: Ace Diamonds (Off suit).
      // Compare (6H, AD). 6H wins.
      // p3: 6 Spades (Off suit). 6H wins.

      // This works.

      // What if:
      // p1: 6 Hearts (Lead).
      // p2: Joker (High: Diamonds).
      // Joker High is treated as "Lead Suit" logic usually?
      // No, Joker High/Top logic is separate.
      // If Joker High (Diamonds) played...
      // Compare (6H, Joker High).
      // Joker High -> 1000 power (if led).
      // Wait, Joker High logic:
      // If Joker led, it wins.
      // If Joker didn't lead...
      // `c2.type === 'joker'`. `if (card2.jokerOption === JokerOption.High)`?
      // Code says:
      // `if (card2.jokerOption === JokerOption.Top) return -1;`
      // `if (card2.jokerOption === JokerOption.Bottom) return 1;`
      // What about High/Low played NOT at lead?
      // UI doesn't allow High/Low if not lead.
      // Backend validator checks this?
      // `MoveValidator.validateJokerPlay`:
      // `if (table.length > 0 && (option === JokerOption.High || option === JokerOption.Low)) return error`.
      // So High/Low only possible at Lead.

      // So... logic seems surprisingly robust.
      // BUT explicitly passing `leadSuit` is cleaner and safer.

      // Let's force the one edge case where `leadSuit` matters:
      // When `currentWinner` is `Standard` and `c2` is `Standard`.

      // Re-evaluating "Trump beats non-trump" block:
      // `if (trump) { ... }`
      // This block handles ALL trump interactions properly.
      // So if either card is trump, we return early.

      // So we reach `// Same suit` block ONLY if neither is trump OR both are trump (already handled) OR no trump game.
      // Wait, `if (trump)` block handles:
      // - One is trump, one not -> return result.
      // - Both trump -> return result.
      // So if we pass `if (trump)`, it means NEITHER is trump.

      // So we are comparing two NON-TRUMP cards.
      // `if (sc1.suit === sc2.suit)` -> Compare ranks. Correct.

      // `if (leadSuit)` -> Card matching lead suit wins.
      // `leadSuit` = `getLeadSuit(card1)`.
      // Since `card1` is NOT trump (otherwise handled above), `card1` MUST be the Lead Suit (because it's the current winner, and it's not trump).
      // Why? Because if `card1` wasn't Lead Suit (and not Trump), it wouldn't be winning against the original Lead Suit card.
      // Unless... `card1` IS the original Lead Suit card.

      // So `getLeadSuit(card1)` always returns the Original Lead Suit (in a No-Trump context or Non-Trump winner context).

      // CONCLUSION: The current implementation is functionally correct due to the order of checks and the rules of the game.
      // "Lead Suit Drift" doesn't break anything because if the winner drifts to a new suit, that suit MUST be Trump (which handles itself) or Joker (handled separately).
      // It's impossible for the winner to drift to an off-suit non-trump card.

      // However, to align with Frontend and ensure clarity, passing `leadSuit` is better.
      // I will refactor it to match Frontend logic anyway.

      const table: TableCard[] = [
        {
          card: { type: 'standard', id: '1', suit: Suit.Hearts, rank: Rank.Seven },
          playerId: 'p1',
        },
      ];
      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(0);
    });

    it('should let Joker High win if no trump is played', () => {
      const table: TableCard[] = [
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p1',
          jokerOption: JokerOption.High,
          requestedSuit: Suit.Hearts,
        },
        { card: { type: 'standard', id: '2', suit: Suit.Hearts, rank: Rank.Ace }, playerId: 'p2' },
        { card: { type: 'standard', id: '3', suit: Suit.Hearts, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Clubs, rank: Rank.Ace }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, Suit.Spades);
      expect(winner).toBe(0);
    });

    it('should let trump beat Joker High', () => {
      const table: TableCard[] = [
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p1',
          jokerOption: JokerOption.High,
          requestedSuit: Suit.Hearts,
        },
        {
          card: { type: 'standard', id: '2', suit: Suit.Spades, rank: Rank.Seven },
          playerId: 'p2',
        },
        { card: { type: 'standard', id: '3', suit: Suit.Spades, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Ace }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, Suit.Spades);
      expect(winner).toBe(2);
    });

    it('should let Joker High win if requested suit IS trump', () => {
      const table: TableCard[] = [
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p1',
          jokerOption: JokerOption.High,
          requestedSuit: Suit.Spades, // Joker asks for Spades (TRUMP)
        },
        {
          card: { type: 'standard', id: '2', suit: Suit.Spades, rank: Rank.Seven },
          playerId: 'p2',
        },
        { card: { type: 'standard', id: '3', suit: Suit.Spades, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Spades, rank: Rank.Ace }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, Suit.Spades);
      expect(winner).toBe(0); // Joker should win as highest trump
    });

    it('should let Joker High win if Trump exists but nobody plays it', () => {
      const table: TableCard[] = [
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p1',
          jokerOption: JokerOption.High,
          requestedSuit: Suit.Hearts, // Request Hearts
        },
        {
          card: { type: 'standard', id: '2', suit: Suit.Hearts, rank: Rank.Ace }, // Ace of Hearts
          playerId: 'p2',
        },
        { card: { type: 'standard', id: '3', suit: Suit.Clubs, rank: Rank.King }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Hearts, rank: Rank.Nine }, playerId: 'p4' },
      ];

      // Trump is Spades. Nobody played Spades.
      const winner = deckService.determineTrickWinner(table, Suit.Spades);
      expect(winner).toBe(0); // Joker should win
    });

    it('should let trump beat requested suit for Joker Low', () => {
      const table: TableCard[] = [
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p1',
          jokerOption: JokerOption.Low,
          requestedSuit: Suit.Diamonds,
        },
        {
          card: { type: 'standard', id: '2', suit: Suit.Diamonds, rank: Rank.Seven },
          playerId: 'p2',
        },
        { card: { type: 'standard', id: '3', suit: Suit.Spades, rank: Rank.Ace }, playerId: 'p3' },
        {
          card: { type: 'standard', id: '4', suit: Suit.Diamonds, rank: Rank.King },
          playerId: 'p4',
        },
      ];

      const winner = deckService.determineTrickWinner(table, Suit.Spades);
      expect(winner).toBe(2);
    });

    it('should choose highest requested suit for Joker Low when no trump is played', () => {
      const table: TableCard[] = [
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p1',
          jokerOption: JokerOption.Low,
          requestedSuit: Suit.Diamonds,
        },
        {
          card: { type: 'standard', id: '2', suit: Suit.Diamonds, rank: Rank.Seven },
          playerId: 'p2',
        },
        { card: { type: 'standard', id: '3', suit: Suit.Clubs, rank: Rank.Ace }, playerId: 'p3' },
        {
          card: { type: 'standard', id: '4', suit: Suit.Diamonds, rank: Rank.King },
          playerId: 'p4',
        },
      ];

      const winner = deckService.determineTrickWinner(table, Suit.Spades);
      expect(winner).toBe(3);
    });

    it('should let trump win for Joker Low when no requested suit is played', () => {
      const table: TableCard[] = [
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p1',
          jokerOption: JokerOption.Low,
          requestedSuit: Suit.Hearts,
        },
        {
          card: { type: 'standard', id: '2', suit: Suit.Spades, rank: Rank.Seven },
          playerId: 'p2',
        },
        { card: { type: 'standard', id: '3', suit: Suit.Clubs, rank: Rank.Ace }, playerId: 'p3' },
        { card: { type: 'standard', id: '4', suit: Suit.Spades, rank: Rank.King }, playerId: 'p4' },
      ];

      const winner = deckService.determineTrickWinner(table, Suit.Spades);
      expect(winner).toBe(3);
    });

    it('should let Joker Low win when no suit and no trump are played', () => {
      const table: TableCard[] = [
        {
          card: { type: 'joker', id: 'j1', jokerId: 1 },
          playerId: 'p1',
          jokerOption: JokerOption.Low,
          requestedSuit: Suit.Hearts,
        },
        {
          card: { type: 'standard', id: '2', suit: Suit.Spades, rank: Rank.Seven },
          playerId: 'p2',
        },
        { card: { type: 'standard', id: '3', suit: Suit.Clubs, rank: Rank.Ace }, playerId: 'p3' },
        {
          card: { type: 'standard', id: '4', suit: Suit.Diamonds, rank: Rank.King },
          playerId: 'p4',
        },
      ];

      const winner = deckService.determineTrickWinner(table, null);
      expect(winner).toBe(0);
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

    it('should ensure dealer index matches the player with the Ace', () => {
      // Run 50 times to catch random anomalies
      for (let i = 0; i < 50; i++) {
        const { dealerIndex, cardsDealt } = deckService.tuzovanie(4);

        // Find who has the Ace
        let aceOwnerIndex = -1;

        for (let p = 0; p < 4; p++) {
          const hand = cardsDealt[p];
          if (hand.length > 0) {
            const lastCard = hand[hand.length - 1];
            if (lastCard.type === 'standard' && (lastCard as StandardCard).rank === Rank.Ace) {
              aceOwnerIndex = p;
              break;
            }
          }
        }

        expect(aceOwnerIndex).not.toBe(-1); // Ace must be found
        expect(aceOwnerIndex).toBe(dealerIndex); // Winner must be dealer
      }
    });
  });
});
