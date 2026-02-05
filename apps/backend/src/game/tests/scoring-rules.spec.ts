import { Test, TestingModule } from '@nestjs/testing';
import { ScoringService } from '../services/scoring.service';
import { Player, RoundHistory, Suit } from '@joker/shared';

describe('Scoring Rules Verification (Popular Variant)', () => {
  let service: ScoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScoringService],
    }).compile();

    service = module.get<ScoringService>(ScoringService);
  });

  // Helper to create a dummy player
  const createPlayer = (id: string, name: string): Player => ({
    id,
    name,
    isBot: false,
    controlledByBot: false,
    connected: true,
    hand: [],
    bet: null,
    tricks: 0,
    roundScores: [],
    pulkaScores: [],
    totalScore: 0,
    spoiled: false,
    hadJokerInRounds: [],
    jokerCountPerRound: [],
  });

  // Helper to create a mock history for a Pulka
  // We only need scores to determine "SelfMax" and "NeighborMax"
  const createPulkaHistory = (
    playerIds: string[],
    roundScoresMap: Record<string, number>[],
  ): RoundHistory[] => {
    return roundScoresMap.map((scores, index) => ({
      round: index + 1,
      pulka: 1,
      cardsPerPlayer: 9, // precise value doesn't matter for this test
      trump: Suit.Hearts,
      bets: {},
      tricks: {},
      scores, // Key part: The scores for each player in this round
      tableHistory: [],
      jokerCounts: {},
    }));
  };

  describe('Premium Logic (The Chain Rule)', () => {
    it('should correctly handle the 1-2-3-4 adjancency chain from the rules', () => {
      // Setup players
      const p1 = createPlayer('p1', 'Player 1');
      const p2 = createPlayer('p2', 'Player 2');
      const p3 = createPlayer('p3', 'Player 3');
      const p4 = createPlayer('p4', 'Player 4');
      const players = [p1, p2, p3, p4]; // Order matters: 1 -> 2 -> 3 -> 4 -> 1

      // Setup "Clean" status (who qualifies for premium calculation)
      // Scenario from rules:
      // P1: Clean (On Premium)
      // P2: Clean (On Premium)
      // P3: Clean (On Premium)
      // P4: Dirty (Not on Premium)
      p1.spoiled = false;
      p2.spoiled = false;
      p3.spoiled = false;
      p4.spoiled = true;

      // Setup Max Scores (SelfMax)
      // Let's give them distinct max scores to verify amounts
      // P1 Max: 450
      // P2 Max: 500
      // P3 Max: 200
      // P4 Max: 100 (irrelevant as he is dirty, but checking robustness)
      const history = createPulkaHistory(
        ['p1', 'p2', 'p3', 'p4'],
        [
          { p1: 100, p2: 100, p3: 50, p4: 50 },
          { p1: 450, p2: 200, p3: 100, p4: 10 }, // Maxes here
          { p1: 100, p2: 500, p3: 200, p4: 0 },
          // Last round ignored by rules, so ensuring these are not picked
          { p1: 999, p2: 999, p3: 999, p4: 999 },
        ],
      );

      // We need to slice the history to simulate "excluding last round" inside the service?
      // Actually service takes full history but slices internals.
      // Wait, let's verify service logic.
      // Service `calculatePulkaPremiumsAdvanced` takes `pulkaHistory`.
      // Inside: `const roundsExceptLast = pulkaHistory.slice(0, -1);`
      // So we must provide at least 2 rounds if we want roundsExceptLast to be non-empty.
      // We provided 4 rounds. 0,1,2 will be considered. 3 is last.

      const result = service.calculatePulkaPremiumsAdvanced(players, history);
      const scores = result.playerScores;

      // === Expected Outcome based on Rules ===
      // Cycle: P1 -> P2 -> P3 -> P4 -> P1

      // 1. Player 1 (Clean)
      //    - Prev (P4) is Dirty -> P4 does not subtract -> P1 RECEIVES SelfMax (+450)
      //    - Next (P2) is Clean -> P1 CANNOT subtract -> P2 is protected
      //    Result: +450

      // 2. Player 2 (Clean)
      //    - Prev (P1) is Clean -> P1 "tried" to subtract -> P2 PROTECTED (Receives 0)
      //    - Next (P3) is Clean -> P2 CANNOT subtract -> P3 is protected
      //    Result: 0

      // 3. Player 3 (Clean)
      //    - Prev (P2) is Clean -> P2 "tried" to subtract -> P3 PROTECTED (Receives 0)
      //    - Next (P4) is Dirty -> P3 SUBTRACTS from P4 -> P4 gets -P4Max (NeighborMax)
      //      Wait, rule says "spisivaet s soseda ego max", meaning subtracts Neighbor's Max?
      //      Let's re-read rule in service `calculatePulkaPremiumsAdvanced`:
      //      "Player 1... gets +self_max... NEIGHBOR... gets -neighbor_max (THEIR OWN highest)"
      //      Yes. So P3 causes P4 to lose P4's max.
      //      BUT P4 max must be calculated from "roundsExceptLast".
      //      P4 scores: 50, 10, 0. Max is 50.
      //    Result: P3 gets 0 (protected), causes P4 -50?
      //    WAIT. Does P3 get anything?
      //    Rule: "3-y Ne poluchaet... I 3-y spisivaet s 4-go" -> 3rd one DOES subtract from 4th.
      //    Does 3rd get his own plus?
      //    "2-y Ne poluchaet... I ne spisivaet...".
      //    "3-y Ne poluchaet (because 2 tried)... I 3-y spisivaet s 4-go".
      //    So P3 change is 0.

      // 4. Player 4 (Dirty)
      //    - Dirty -> Cannot receive.
      //    - Dirty -> Cannot subtract.
      //    - Is target of P3? Yes.
      //    Result: -50 (P4's max).

      console.log('Test Results:', JSON.stringify(result, null, 2));

      expect(scores['p1']).toBe(450); // Receives own max
      expect(scores['p2']).toBe(0); // Protected by P1, Protected from P1
      expect(scores['p3']).toBe(0); // Protected by P2, attacks P4
      expect(scores['p4']).toBe(-50); // Attacked by P3. P4 max is 50.
    });

    it('should handle Simple Premium (One Clean Player)', () => {
      const p1 = createPlayer('p1', 'Player 1'); // Clean
      const p2 = createPlayer('p2', 'Player 2'); // Dirty
      const p3 = createPlayer('p3', 'Player 3'); // Dirty
      const p4 = createPlayer('p4', 'Player 4'); // Dirty
      p1.spoiled = false;
      p2.spoiled = true;
      p3.spoiled = true;
      p4.spoiled = true;

      const players = [p1, p2, p3, p4];
      const history = createPulkaHistory(
        ['p1', 'p2', 'p3', 'p4'],
        [
          { p1: 100, p2: 100, p3: 100, p4: 100 }, // Max 100
          { p1: 50, p2: 50, p3: 50, p4: 50 },
        ], // 2 rounds. 2nd is last. Max calc from 1st round only.
      );

      const result = service.calculatePulkaPremiumsAdvanced(players, history);
      const scores = result.playerScores;

      // P1 (Clean):
      // - Prev (P4) Dirty -> Receives SelfMax (+100)
      // - Next (P2) Dirty -> Subtracts from P2 (-P2Max = -100)

      expect(scores['p1']).toBe(100);
      expect(scores['p2']).toBe(-100);
      expect(scores['p3']).toBe(0);
      expect(scores['p4']).toBe(0);
    });

    it('should handle All Clean (Complete Circle)', () => {
      const p1 = createPlayer('p1', 'P1');
      const p2 = createPlayer('p2', 'P2');
      const p3 = createPlayer('p3', 'P3');
      const p4 = createPlayer('p4', 'P4');
      [p1, p2, p3, p4].forEach((p) => {
        p.spoiled = false;
      });

      const players = [p1, p2, p3, p4];
      // Max score for everyone is 100
      const history = createPulkaHistory(
        players.map((p) => p.id),
        [
          { p1: 100, p2: 100, p3: 100, p4: 100 },
          { p1: 0, p2: 0, p3: 0, p4: 0 },
        ],
      );

      const result = service.calculatePulkaPremiumsAdvanced(players, history);

      // P1: Prev(P4) Clean -> P1 Protected (Receives 0). Next(P2) Clean -> P1 Blocked (Subtracts 0).
      // Everyone blocks everyone. All 0.
      Object.values(result.playerScores).forEach((score) => {
        expect(score).toBe(0);
      });
    });
  });

  describe('Basic Round Scoring', () => {
    it('should calculate points correctly', () => {
      // Took Own
      // Bet 2, Tricks 2 -> 50*2 + 50 = 150
      expect(service.calculateRoundScore(2, 2, 9).score).toBe(150);

      // Took All
      // Bet 3, Tricks 3, Round 3 -> 100*3 = 300
      expect(service.calculateRoundScore(3, 3, 3).score).toBe(300);

      // Pass (0) = Took Own
      // Bet 0, Tricks 0 -> 50*0 + 50 = 50
      expect(service.calculateRoundScore(0, 0, 9).score).toBe(50);

      // Miss (Under)
      // Bet 2, Tricks 1 -> 10*1 = 10
      expect(service.calculateRoundScore(2, 1, 9).score).toBe(10);

      // Miss (Over)
      // Bet 2, Tricks 3 -> 10*3 = 30
      expect(service.calculateRoundScore(2, 3, 9).score).toBe(30);

      // Shtanga
      // Bet 1, Tricks 0 -> -200
      expect(service.calculateRoundScore(1, 0, 9).score).toBe(-200);
      // Bet 5, Tricks 0 -> -200
      expect(service.calculateRoundScore(5, 0, 9).score).toBe(-200);
    });
  });
});
