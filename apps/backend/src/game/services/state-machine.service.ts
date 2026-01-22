import { Injectable } from '@nestjs/common';
import { GameState, GamePhase, GAME_CONSTANTS } from '@joker/shared';

export type GameEvent =
  | { type: 'GAME_START' }
  | { type: 'TRUMP_SELECTED' }
  | { type: 'ALL_BETS_PLACED' }
  | { type: 'CARD_PLAYED' }
  | { type: 'TRICK_COMPLETE' }
  | { type: 'ROUND_COMPLETE' }
  | { type: 'PULKA_COMPLETE' }
  | { type: 'GAME_FINISH' };

@Injectable()
export class StateMachineService {
  /**
   * Transition game state based on event
   */
  transition(state: GameState, event: GameEvent): GamePhase {
    const { phase } = state;

    switch (phase) {
      case GamePhase.Waiting:
        if (event.type === 'GAME_START') {
          // Check if this round needs trump selection (9-card rounds)
          if (this.needsTrumpSelection(state)) {
            return GamePhase.TrumpSelection;
          }
          return GamePhase.Betting;
        }
        break;

      case GamePhase.TrumpSelection:
        if (event.type === 'TRUMP_SELECTED') {
          return GamePhase.Betting;
        }
        break;

      case GamePhase.Betting:
        if (event.type === 'ALL_BETS_PLACED') {
          return GamePhase.Playing;
        }
        break;

      case GamePhase.Playing:
        if (event.type === 'CARD_PLAYED' && state.table.length === 4) {
          return GamePhase.TrickComplete;
        }
        break;

      case GamePhase.TrickComplete:
        if (event.type === 'TRICK_COMPLETE') {
          // Check if all cards played (round complete)
          if (this.isRoundComplete(state)) {
            return GamePhase.RoundComplete;
          }
          return GamePhase.Playing;
        }
        break;

      case GamePhase.RoundComplete:
        if (event.type === 'ROUND_COMPLETE') {
          // Check if pulka complete
          if (this.isPulkaComplete(state)) {
            return GamePhase.PulkaComplete;
          }
          // Next round
          if (this.needsTrumpSelection(state)) {
            return GamePhase.TrumpSelection;
          }
          return GamePhase.Betting;
        }
        break;

      case GamePhase.PulkaComplete:
        if (event.type === 'PULKA_COMPLETE') {
          // Check if game finished
          if (state.round >= GAME_CONSTANTS.TOTAL_ROUNDS) {
            return GamePhase.Finished;
          }
          // Next pulka - check if trump selection needed
          if (this.needsTrumpSelection(state)) {
            return GamePhase.TrumpSelection;
          }
          return GamePhase.Betting;
        }
        break;

      case GamePhase.Finished:
        // No transitions from Finished
        break;
    }

    return phase;
  }

  /**
   * Check if trump selection is needed for current round
   * Trump is selected by player for 9-card rounds (pulka 2 and 4)
   */
  needsTrumpSelection(state: GameState): boolean {
    return state.cardsPerPlayer === 9;
  }

  /**
   * Check if all cards have been played in current round
   */
  isRoundComplete(state: GameState): boolean {
    // All players should have empty hands
    return state.players.every((p) => p.hand.length === 0);
  }

  /**
   * Check if current pulka is complete
   */
  isPulkaComplete(state: GameState): boolean {
    const pulkaInfo = this.getPulkaInfo(state.round);
    const roundsInPulka = pulkaInfo.rounds;
    const lastRoundOfPulka = roundsInPulka[roundsInPulka.length - 1];

    return state.round === lastRoundOfPulka;
  }

  /**
   * Get pulka info for a given round number
   */
  getPulkaInfo(round: number): { pulka: number; rounds: number[]; cardsPerRound: number[] } {
    for (const pulka of GAME_CONSTANTS.PULKA_STRUCTURE) {
      if ((pulka.rounds as readonly number[]).includes(round)) {
        return {
          pulka: pulka.pulka,
          rounds: [...pulka.rounds],
          cardsPerRound: [...pulka.cardsPerRound],
        };
      }
    }
    throw new Error(`Invalid round number: ${round}`);
  }

  /**
   * Get cards per player for a given round
   */
  getCardsPerPlayer(round: number): number {
    const pulkaInfo = this.getPulkaInfo(round);
    const roundIndex = pulkaInfo.rounds.indexOf(round);
    return pulkaInfo.cardsPerRound[roundIndex];
  }

  /**
   * Get next player index (clockwise)
   */
  getNextPlayerIndex(currentIndex: number, playerCount: number = 4): number {
    return (currentIndex + 1) % playerCount;
  }

  /**
   * Get first player index for betting/playing (player after dealer)
   */
  getFirstPlayerIndex(dealerIndex: number, playerCount: number = 4): number {
    return (dealerIndex + 1) % playerCount;
  }

  /**
   * Get dealer index for next round
   */
  getNextDealerIndex(currentDealerIndex: number, playerCount: number = 4): number {
    return (currentDealerIndex + 1) % playerCount;
  }

  /**
   * Check if game is finished
   */
  isGameFinished(state: GameState): boolean {
    return state.phase === GamePhase.Finished;
  }

  /**
   * Validate phase transition
   */
  canTransition(currentPhase: GamePhase, event: GameEvent): boolean {
    const validTransitions: Record<GamePhase, string[]> = {
      [GamePhase.Waiting]: ['GAME_START'],
      [GamePhase.TrumpSelection]: ['TRUMP_SELECTED'],
      [GamePhase.Betting]: ['ALL_BETS_PLACED'],
      [GamePhase.Playing]: ['CARD_PLAYED'],
      [GamePhase.TrickComplete]: ['TRICK_COMPLETE'],
      [GamePhase.RoundComplete]: ['ROUND_COMPLETE'],
      [GamePhase.PulkaComplete]: ['PULKA_COMPLETE'],
      [GamePhase.Finished]: [],
    };

    return validTransitions[currentPhase].includes(event.type);
  }
}
