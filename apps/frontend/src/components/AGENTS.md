# FRONTEND COMPONENTS

React components for Joker card game UI - Telegram Mini App optimized.

## OVERVIEW

16 components: cards, modals, game table, player info. Zustand-connected, socket-driven updates.

## STRUCTURE

```
components/
├── Card.tsx              # Single card with flip animation
├── Hand.tsx              # Player's hand layout
├── Table.tsx             # Central game area (trick cards)
├── PlayerInfo.tsx        # Avatar, name, bet, tricks
├── BetModal.tsx          # Bet selection UI
├── JokerOptionModal.tsx  # Joker action picker
├── TrumpSelector.tsx     # Trump suit selection
├── GameOverModal.tsx     # Final scores display
├── LeaveGameModal.tsx    # Exit confirmation
├── LobbyTable.tsx        # Pre-game waiting room
├── SuitIcon.tsx          # Suit symbol renderer
├── LanguageSwitcher.tsx  # i18n toggle
├── DevLogPanel.tsx       # Debug logs (dev mode)
├── GameProgressPanel.tsx # Round/pulka progress
├── ScoringInfoModal.tsx  # Scoring rules help
└── game/
    ├── PulkaResultsModal.tsx  # Pulka completion summary
    └── index.ts               # Barrel export
```

## CONVENTIONS

- **Dumb components**: Props or zustand selectors, no direct socket access
- **Modals**: Self-contained with open/close state from parent
- **Animations**: framer-motion for cards and transitions
- **Styling**: TailwindCSS classes, mobile-first

## ANTI-PATTERNS

- **NEVER** call `emit*` functions directly - lift to screen or store
- **NEVER** access `gameStore` state outside selectors
- **NEVER** hardcode colors - use Tailwind theme or CSS variables
