import { Injectable } from '@nestjs/common';
import { Card, StandardCard, JokerCard, Suit, Rank, TableCard, TrickLogic } from '@joker/shared';

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
  deal(
    deck: Card[],
    playerCount: number,
    cardsPerPlayer: number,
  ): { hands: Card[][]; remainingDeck: Card[] } {
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
   * Determine trump card from remaining deck, returning both the card and its suit
   * If Joker is drawn as trump → no trump suit (null), but card is returned
   */
  determineTrumpWithCard(remainingDeck: Card[]): { trump: Suit | null; trumpCard: Card | null } {
    if (remainingDeck.length === 0) {
      return { trump: null, trumpCard: null };
    }

    const topCard = remainingDeck[0];

    if (topCard.type === 'joker') {
      // Joker as trump card → no trump, but we still have the card
      return { trump: null, trumpCard: topCard };
    }

    return { trump: (topCard as StandardCard).suit, trumpCard: topCard };
  }

  /**
   * Determine trick winner based on cards on table
   * @param table - cards played in order
   * @param trump - trump suit (null = no trump)
   * @returns index of winning card in table array
   */
  determineTrickWinner(table: TableCard[], trump: Suit | null): number {
    return TrickLogic.determineTrickWinner(table, trump);
  }

  /**
   * Get lead suit from first card played
   */
  private getLeadSuit(firstCard: TableCard): Suit | null {
    return TrickLogic.getLeadSuit(firstCard);
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
