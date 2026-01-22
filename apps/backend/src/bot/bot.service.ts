import { Injectable } from '@nestjs/common';
import { GameState, Suit } from '@joker/shared';
import { RandomValidMoveStrategy, BotMove } from './strategies/random-valid-move.strategy';

@Injectable()
export class BotService {
  constructor(private strategy: RandomValidMoveStrategy) {}

  /**
   * Сделать заказ за бота
   */
  makeBet(state: GameState, playerId: string): number {
    return this.strategy.makeBet(state, playerId);
  }

  /**
   * Сделать ход за бота
   */
  makeMove(state: GameState, playerId: string): BotMove {
    return this.strategy.makeMove(state, playerId);
  }

  /**
   * Выбрать козырь за бота
   */
  selectTrump(): Suit | null {
    return this.strategy.selectTrump();
  }
}
