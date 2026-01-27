import { Injectable } from '@nestjs/common';
import {
  GameState,
  JokerOption,
  Rank,
  Suit,
  TrumpDecision,
  TrumpDecisionType,
  StandardCard,
} from '@joker/shared';
import { MoveValidator } from '../../game/validators/move.validator';
import { BetValidator } from '../../game/validators/bet.validator';

export interface BotMove {
  cardId: string;
  jokerOption?: JokerOption;
  requestedSuit?: Suit;
}

@Injectable()
export class RandomValidMoveStrategy {
  constructor(
    private moveValidator: MoveValidator,
    private betValidator: BetValidator,
  ) {}

  /**
   * Сделать заказ (простая эвристика)
   */
  makeBet(state: GameState, playerId: string): number {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const trump = state.trump;

    // Посчитать "сильные" карты
    let strongCards = 0;

    player.hand.forEach((card) => {
      if (card.type === 'joker') {
        strongCards += 1; // Джокер = гарантированная взятка
      } else if (trump && card.suit === trump && card.rank >= Rank.Jack) {
        strongCards += 0.8; // Козырные фигуры
      } else if (card.rank >= Rank.King) {
        strongCards += 0.5; // Тузы и короли
      }
    });

    // Округлить
    let bet = Math.floor(strongCards);

    // Проверить валидность (правило "вынужденного")
    const currentBets = state.players.map((p) => p.bet);
    const isValid = this.betValidator.validate(
      currentBets,
      bet,
      player.hand.length,
      state.players.indexOf(player),
      state.dealerIndex,
    );

    if (!isValid.valid) {
      // Скорректировать заказ
      bet = bet > 0 ? bet - 1 : bet + 1;
    }

    return Math.max(0, bet);
  }

  /**
   * Сделать ход (случайная валидная карта)
   */
  makeMove(state: GameState, playerId: string): BotMove {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found');

    // Получить список валидных карт
    const validCards = player.hand.filter((card) => {
      const result = this.moveValidator.validate(player.hand, card, state.table, state.trump);
      return result.valid;
    });

    // Если нет валидных карт (ошибка в логике)
    if (validCards.length === 0) {
      // Fallback: return first card (will fail validation but prevents crash)
      return { cardId: player.hand[0]?.id || '' };
    }

    // Выбрать случайную
    const randomCard = validCards[Math.floor(Math.random() * validCards.length)];

    // Если это Джокер → выбрать опцию
    let jokerOption: JokerOption | undefined;
    let requestedSuit: Suit | undefined;

    if (randomCard.type === 'joker') {
      if (state.table.length === 0) {
        // Ходим первыми → выбрать High/Low
        jokerOption = Math.random() > 0.5 ? JokerOption.High : JokerOption.Low;
        // Choose random suit
        const suits = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades];
        requestedSuit = suits[Math.floor(Math.random() * suits.length)];
      } else {
        // Ходим не первыми → выбрать Top/Bottom
        // Если нужна взятка → Top, иначе Bottom
        const tricksNeeded = (player.bet || 0) - player.tricks;
        const needsTrick = tricksNeeded > 0;
        jokerOption = needsTrick ? JokerOption.Top : JokerOption.Bottom;
      }
    }

    return {
      cardId: randomCard.id,
      jokerOption,
      requestedSuit,
    };
  }

  /**
   * Выбрать козырь (случайно) - legacy method
   */
  selectTrump(): Suit | null {
    const options = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades, null];
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Выбрать козырь с полным решением (Suit/NoTrump/Redeal)
   * Эвристика по первым 3 картам руки
   */
  selectTrumpDecision(state: GameState, playerId: string): TrumpDecision {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) throw new Error('Player not found');

    const trumpSelection = state.trumpSelection;
    const hand = player.hand; // Only first 3 cards during partial deal

    // Count cards by suit and calculate suit strength
    const suitStrength: Record<Suit, number> = {
      [Suit.Hearts]: 0,
      [Suit.Diamonds]: 0,
      [Suit.Clubs]: 0,
      [Suit.Spades]: 0,
    };

    let hasJoker = false;
    let totalStrength = 0;

    for (const card of hand) {
      if (card.type === 'joker') {
        hasJoker = true;
        totalStrength += 2; // Joker is very strong
      } else {
        const stdCard = card as StandardCard;
        // Weight: Ace=3, King=2, Queen=1.5, Jack=1, 10=0.8, others=0.3
        let weight = 0.3;
        if (stdCard.rank === Rank.Ace) weight = 3;
        else if (stdCard.rank === Rank.King) weight = 2;
        else if (stdCard.rank === Rank.Queen) weight = 1.5;
        else if (stdCard.rank === Rank.Jack) weight = 1;
        else if (stdCard.rank === Rank.Ten) weight = 0.8;

        suitStrength[stdCard.suit] += weight;
        totalStrength += weight;
      }
    }

    // Find best suit
    let bestSuit: Suit = Suit.Hearts;
    let bestScore = 0;
    for (const suit of [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades]) {
      if (suitStrength[suit] > bestScore) {
        bestScore = suitStrength[suit];
        bestSuit = suit;
      }
    }

    // Decision thresholds
    const STRONG_THRESHOLD = 2.5; // Strong hand for choosing suit
    const WEAK_THRESHOLD = 1.0; // Weak hand for redeal consideration

    // If we have a strong suit, choose it
    if (bestScore >= STRONG_THRESHOLD) {
      return { type: TrumpDecisionType.Suit, suit: bestSuit };
    }

    // If hand is very weak and redeal is allowed, consider redeal
    if (
      totalStrength < WEAK_THRESHOLD &&
      trumpSelection?.allowed.redeal &&
      trumpSelection.redealCount < trumpSelection.maxRedeals
    ) {
      // 50% chance to redeal with weak hand
      if (Math.random() < 0.5) {
        return { type: TrumpDecisionType.Redeal };
      }
    }

    // If we have a joker, no trump might be good
    if (hasJoker && trumpSelection?.allowed.noTrump) {
      // 30% chance for no trump with joker
      if (Math.random() < 0.3) {
        return { type: TrumpDecisionType.NoTrump };
      }
    }

    // Default: choose best suit or no trump randomly
    if (bestScore > 0) {
      return { type: TrumpDecisionType.Suit, suit: bestSuit };
    }

    return { type: TrumpDecisionType.NoTrump };
  }
}
