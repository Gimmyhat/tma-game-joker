import { Injectable } from '@nestjs/common';
import { GameState, Suit, TrumpDecision } from '@joker/shared';
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
   * Выбрать козырь за бота (legacy)
   */
  selectTrump(): Suit | null {
    return this.strategy.selectTrump();
  }

  /**
   * Выбрать козырь с полным решением (новая механика с partial deal)
   */
  selectTrumpDecision(state: GameState, playerId: string): TrumpDecision {
    return this.strategy.selectTrumpDecision(state, playerId);
  }
}
