import { Injectable } from '@nestjs/common';
import {
  Card,
  Suit,
  TableCard,
  JokerOption,
  ValidationResult,
  SharedMoveValidator,
} from '@joker/shared';

@Injectable()
export class MoveValidator {
  /**
   * Validate if player can play the given card
   */
  validate(
    hand: Card[],
    cardToPlay: Card,
    table: TableCard[],
    trump: Suit | null,
  ): ValidationResult {
    return SharedMoveValidator.validate(hand, cardToPlay, table, trump);
  }

  /**
   * Validate Joker options when playing a Joker
   */
  validateJokerPlay(
    table: TableCard[],
    jokerOption: JokerOption,
    requestedSuit?: Suit,
  ): ValidationResult {
    return SharedMoveValidator.validateJokerPlay(table, jokerOption, requestedSuit);
  }

  /**
   * Validate response to Joker High (Internal helper exposed for tests)
   */
  validateResponseToJokerHigh(
    hand: Card[],
    cardToPlay: Card,
    requestedSuit: Suit,
    trump: Suit | null,
  ): ValidationResult {
    return SharedMoveValidator.validateResponseToJokerHigh(hand, cardToPlay, requestedSuit, trump);
  }

  /**
   * Get valid cards that can be played given current table state
   */
  getValidCards(hand: Card[], table: TableCard[], trump: Suit | null): Card[] {
    return SharedMoveValidator.getValidCards(hand, table, trump);
  }
}
