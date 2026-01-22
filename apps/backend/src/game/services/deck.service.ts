import { Injectable } from '@nestjs/common';
import {
  Card,
  StandardCard,
  JokerCard,
  Suit,
  Rank,
  TableCard,
  JokerOption,
} from '@joker/shared';

@Injectable()
export class DeckService {
  /**
   * Create a deck of 36 cards (34 standard + 2 jokers)
   * Excludes black sixes (6♣, 6♠)
   */
  createDeck(): Card[] {
    const deck: Card[] = [];

    const suits: Suit[] = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
    const ranks: Rank[] = [
      Rank.Six,
      Rank.Seven,
      Rank.Eight,
      Rank.Nine,
      Rank.Ten,
      Rank.Jack,
      Rank.Queen,
      Rank.King,
      Rank.Ace,
    ];

    for (const suit of suits) {
      for (const rank of ranks) {
        // Exclude black sixes
        if (rank === Rank.Six && (suit === Suit.Clubs || suit === Suit.Spades)) {
          continue;
        }

        deck.push({
          type: 'standard',
          id: `${suit}-${rank}`,
          suit,
          rank,
        } as StandardCard);
      }
    }

    // Add 2 jokers
    deck.push({ type: 'joker', id: 'joker-1', jokerId: 1 } as JokerCard);
    deck.push({ type: 'joker', id: 'joker-2', jokerId: 2 } as JokerCard);

    return deck;
  }

  /**
   * Shuffle deck using Fisher-Yates algorithm
   */
  shuffle(deck: Card[]): Card[] {
    const shuffled = [...deck];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  /**
   * Deal cards to players
   * @param deck - shuffled deck
   * @param playerCount - number of players (always 4)
   * @param cardsPerPlayer - cards per player for this round
   * @returns Array of hands for each player
   */
  deal(deck: Card[], playerCount: number, cardsPerPlayer: number): { hands: Card[][]; remainingDeck: Card[] } {
    const deckCopy = [...deck];
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);

    for (let i = 0; i < cardsPerPlayer; i++) {
      for (let p = 0; p < playerCount; p++) {
        const card = deckCopy.shift();
        if (card) {
          hands[p].push(card);
        }
      }
    }

    return { hands, remainingDeck: deckCopy };
  }

  /**
   * Determine trump card from remaining deck
   * If Joker is drawn as trump → no trump (null)
   */
  determineTrump(remainingDeck: Card[]): Suit | null {
    if (remainingDeck.length === 0) {
      return null;
    }

    const topCard = remainingDeck[0];

    if (topCard.type === 'joker') {
      // Joker as trump card → no trump
      return null;
    }

    return (topCard as StandardCard).suit;
  }

  /**
   * Determine trick winner based on cards on table
   * @param table - cards played in order
   * @param trump - trump suit (null = no trump)
   * @returns index of winning card in table array
   */
  determineTrickWinner(table: TableCard[], trump: Suit | null): number {
    if (table.length === 0) {
      throw new Error('Table is empty');
    }

    let winnerIndex = 0;
    let winnerCard = table[0];

    for (let i = 1; i < table.length; i++) {
      const comparison = this.compareCards(winnerCard, table[i], trump, i);
      if (comparison < 0) {
        winnerIndex = i;
        winnerCard = table[i];
      }
    }

    return winnerIndex;
  }

  /**
   * Compare two table cards
   * Returns positive if card1 wins, negative if card2 wins
   */
  private compareCards(
    card1: TableCard,
    card2: TableCard,
    trump: Suit | null,
    card2Index: number,
  ): number {
    const c1 = card1.card;
    const c2 = card2.card;

    // Both jokers
    if (c1.type === 'joker' && c2.type === 'joker') {
      // Both "Top" → last one wins
      if (card1.jokerOption === JokerOption.Top && card2.jokerOption === JokerOption.Top) {
        return -1; // card2 is later, so it wins
      }
      // One Top, one Bottom
      if (card1.jokerOption === JokerOption.Top) return 1;
      if (card2.jokerOption === JokerOption.Top) return -1;
      // Both Bottom (shouldn't happen in real game, but handle it)
      return 1; // first stays winner
    }

    // Joker vs standard card
    if (c1.type === 'joker') {
      if (card1.jokerOption === JokerOption.Top) return 1;
      if (card1.jokerOption === JokerOption.Bottom) return -1;
      // High/Low joker that led - it wins if others couldn't beat
      // This is handled by lead suit logic
      return 1;
    }

    if (c2.type === 'joker') {
      if (card2.jokerOption === JokerOption.Top) return -1;
      if (card2.jokerOption === JokerOption.Bottom) return 1;
      return -1;
    }

    // Both standard cards
    const sc1 = c1 as StandardCard;
    const sc2 = c2 as StandardCard;

    // Determine lead suit
    const leadSuit = this.getLeadSuit(card1);

    // Trump beats non-trump
    if (trump) {
      if (sc1.suit === trump && sc2.suit !== trump) return 1;
      if (sc2.suit === trump && sc1.suit !== trump) return -1;
      // Both trump - compare ranks
      if (sc1.suit === trump && sc2.suit === trump) {
        return sc1.rank - sc2.rank;
      }
    }

    // Same suit - compare ranks
    if (sc1.suit === sc2.suit) {
      return sc1.rank - sc2.rank;
    }

    // Different suits, no trump advantage
    // Card that matches lead suit wins
    if (leadSuit) {
      if (sc1.suit === leadSuit && sc2.suit !== leadSuit) return 1;
      if (sc2.suit === leadSuit && sc1.suit !== leadSuit) return -1;
    }

    // First card holds (different non-trump suits)
    return 1;
  }

  /**
   * Get lead suit from first card played
   */
  private getLeadSuit(firstCard: TableCard): Suit | null {
    const card = firstCard.card;

    if (card.type === 'joker') {
      // Joker with High/Low option specifies a suit
      if (
        (firstCard.jokerOption === JokerOption.High ||
          firstCard.jokerOption === JokerOption.Low) &&
        firstCard.requestedSuit
      ) {
        return firstCard.requestedSuit;
      }
      return null;
    }

    return (card as StandardCard).suit;
  }

  /**
   * Perform "Tuzovanie" - dealing cards one by one until first Ace
   * @returns index of player who gets first Ace (becomes first dealer)
   */
  tuzovanie(playerCount: number): { dealerIndex: number; cardsDealt: Card[][] } {
    const deck = this.shuffle(this.createDeck());
    const cardsDealt: Card[][] = Array.from({ length: playerCount }, () => []);

    let currentPlayer = 0;

    for (const card of deck) {
      cardsDealt[currentPlayer].push(card);

      if (card.type === 'standard' && (card as StandardCard).rank === Rank.Ace) {
        return { dealerIndex: currentPlayer, cardsDealt };
      }

      currentPlayer = (currentPlayer + 1) % playerCount;
    }

    // Shouldn't happen with 4 aces in deck, but fallback
    return { dealerIndex: 0, cardsDealt };
  }
}
