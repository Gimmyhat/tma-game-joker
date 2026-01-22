import { Injectable } from '@nestjs/common';
import { GameState, Card, JokerOption, Rank, Suit } from '@joker/shared';
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
   * Выбрать козырь (случайно)
   */
  selectTrump(): Suit | null {
    const options = [Suit.Hearts, Suit.Diamonds, Suit.Clubs, Suit.Spades, null];
    return options[Math.floor(Math.random() * options.length)];
  }
}
