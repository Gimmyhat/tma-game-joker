# GAME ENGINE

Backend game logic module - authoritative source for all card game mechanics.

## OVERVIEW

State machine orchestrating Joker card game: trump selection, betting, playing, scoring across 4 pulkas (24 rounds).

## STRUCTURE

```
game/
├── services/
│   ├── game-engine.service.ts   # Main orchestrator
│   ├── state-machine.service.ts # Phase transitions
│   ├── deck.service.ts          # Shuffle, deal, trick winner
│   └── scoring.service.ts       # Points, premiums, shtanga
├── validators/
│   ├── move.validator.ts        # Card play rules
│   └── bet.validator.ts         # Bet constraints
└── tests/                       # Unit tests per service
```

## WHERE TO LOOK

| Task                 | File                     | Notes                               |
| -------------------- | ------------------------ | ----------------------------------- |
| Add game action      | game-engine.service.ts   | Entry point for state mutations     |
| Phase transitions    | state-machine.service.ts | `canTransition()`, `getNextPhase()` |
| Card play validation | move.validator.ts        | Lead suit, trump, joker rules       |
| Trick winner logic   | deck.service.ts          | `determineTrickWinner()`            |
| Scoring calculation  | scoring.service.ts       | Premiums, shtanga penalties         |

## CONVENTIONS

- **Functional state**: `(currentState, action) => newState` - never mutate
- **Validators first**: All rules in validators, engine just orchestrates
- **Throw on invalid**: Validators throw descriptive errors, gateway catches
- **Tests beside code**: Each service has `tests/<service>.spec.ts`

## ANTI-PATTERNS

- **NEVER** mutate `GameState` directly - always return new state
- **NEVER** put game rules in gateway - belongs in validators
- **NEVER** skip validation - even for bots

## PHASE FLOW

```
Waiting → TrumpSelection → Betting → Playing ↔ TrickComplete
                                         ↓
                               RoundComplete → PulkaComplete → Finished
```
