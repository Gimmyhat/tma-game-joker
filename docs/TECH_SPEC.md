# Technical Specification (TECH_SPEC)
**Project**: TMA Joker Game  
**Based on**: TOR v1.3  
**Version**: 0.5  
**Date**: 2026-02-04

> Этот документ переводит требования TOR в технические контракты. Используется разработчиками для проектирования БД и API.

---

## 1. System Architecture

### 1.1 High-Level Scope
- **Frontend**: SPA (Vite + React) inside Telegram WebApp.
- **Admin Panel**: TailAdmin (React + Vite) — отдельное SPA.
- **Backend**: NestJS Monolith (Modular).
- **Transport**: Socket.io (Stateful Game) + REST API (Stateless/Admin).
- **Storage**:
  - **Redis**: Hot state (active games, queues, session cache).
  - **PostgreSQL**: Persistent data (users, history, ledger, settings).

### 1.2 Module Diagram

```mermaid
graph TB
    subgraph Frontend
        TMA[Telegram Mini App]
        Admin[Admin Panel]
    end
    
    subgraph Backend
        API[REST API]
        WS[WebSocket Gateway]
        GameEngine[Game Engine]
        Economy[Economy Service]
        Tournament[Tournament Service]
        Bot[Bot Service]
    end
    
    subgraph Storage
        Redis[(Redis)]
        PG[(PostgreSQL)]
    end
    
    TMA --> WS
    TMA --> API
    Admin --> API
    WS --> GameEngine
    GameEngine --> Redis
    GameEngine --> Bot
    API --> Economy
    API --> Tournament
    Economy --> PG
    Tournament --> PG
```

---

## 2. Database Schema (PostgreSQL)

### 2.1 Users & Auth
```sql
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'BANNED', 'SUSPENDED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tg_id BIGINT UNIQUE NOT NULL, -- Telegram User ID
  username VARCHAR(64),
  role user_role DEFAULT 'USER',
  status user_status DEFAULT 'ACTIVE',
  
  -- Economy
  balance_cj DECIMAL(14, 2) DEFAULT 0 CHECK (balance_cj >= 0),
  
  -- Profile
  avatar_id SMALLINT DEFAULT 1 CHECK (avatar_id BETWEEN 1 AND 5), -- 5 preset avatars
  country_code CHAR(2), -- ISO 3166-1 alpha-2
  
  -- Meta
  referrer_id UUID REFERENCES users(id),
  referral_code VARCHAR(16) UNIQUE,
  wallet_address VARCHAR(128), -- Mock wallet
  
  -- Settings
  settings JSONB DEFAULT '{
    "sound": {"music_volume": 0.8, "effects_volume": 1.0},
    "language": "ru",
    "chat_enabled": true
  }',
  
  -- Stats (denormalized for performance)
  stats JSONB DEFAULT '{
    "rating": 0,
    "wins": {"paid_tables": 0, "free_tables": 0, "paid_tournaments": 0, "free_tournaments": 0},
    "places": {"1st": 0, "2nd": 0, "3rd": 0, "4th": 0},
    "total_games": 0,
    "total_tournaments": 0
  }',
  
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_tg_id ON users(tg_id);
CREATE INDEX idx_users_referrer ON users(referrer_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);
```

### 2.2 Economy (Ledger)
```sql
CREATE TYPE tx_type AS ENUM (
  'DEPOSIT', 'WITHDRAW', 
  'BET_HOLD', 'BET_RELEASE', 'WIN_PAYOUT', 
  'REFERRAL_BONUS', 'REFUND', 'TASK_REWARD',
  'ADMIN_ADJUSTMENT'
);

CREATE TYPE tx_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  amount DECIMAL(14, 2) NOT NULL, -- Positive or Negative
  currency VARCHAR(3) DEFAULT 'CJ',
  balance_after DECIMAL(14, 2), -- Snapshot after transaction
  
  type tx_type NOT NULL,
  status tx_status DEFAULT 'PENDING',
  
  idempotency_key VARCHAR(64) UNIQUE, -- Client-side generated for safety
  
  -- Context
  reference_id UUID, -- TableID or TournamentID
  reference_type VARCHAR(20), -- 'TABLE', 'TOURNAMENT', 'TASK'
  
  -- Admin actions
  initiated_by UUID REFERENCES users(id), -- Admin who initiated (if applicable)
  comment TEXT,
  rejection_reason TEXT,
  
  meta JSONB, -- { "wallet": "...", "payment_method": "..." }
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX idx_transactions_user ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_status ON transactions(status) WHERE status = 'PENDING';
CREATE INDEX idx_transactions_type ON transactions(type);
```

### 2.3 Tables (Game Sessions)
```sql
CREATE TYPE table_type AS ENUM ('TRAINING', 'FREE', 'PAID');
CREATE TYPE table_status AS ENUM ('WAITING', 'PLAYING', 'FINISHED', 'CANCELLED');

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type table_type NOT NULL,
  
  -- Config (snapshot from global_settings at creation)
  config JSONB NOT NULL, -- { "bet": 500, "prize_pool": 1800, "house_edge": 0.1, "turn_timeout": 30 }
  
  status table_status DEFAULT 'WAITING',
  
  -- Tournament reference
  tournament_id UUID REFERENCES tournaments(id),
  tournament_stage INT,
  
  -- Players (denormalized for quick access)
  players JSONB, -- [{ "user_id": "...", "seat": 1, "is_bot": false }]
  
  -- Game state
  current_round INT DEFAULT 0,
  
  -- Snapshot of the game result for history
  result_snapshot JSONB, -- { "winner_id": "...", "scores": [...], "places": [...] }
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX idx_tables_status ON tables(status);
CREATE INDEX idx_tables_tournament ON tables(tournament_id);
```

### 2.4 Tournaments
```sql
CREATE TYPE tournament_status AS ENUM (
  'DRAFT', 'ANNOUNCED', 'REGISTRATION', 'STARTED', 'FINISHED', 'CANCELLED', 'ARCHIVED'
);

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(128),
  
  -- Config
  config JSONB NOT NULL, -- See JSONB schemas below
  
  status tournament_status DEFAULT 'DRAFT',
  
  -- Timing
  registration_start TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  
  -- Bot fill schedule
  bot_fill_config JSONB, -- { "start_time": "...", "end_time": "...", "max_bots": 8, "interval_ms": 30000 }
  
  -- Internal state
  current_stage INT DEFAULT 0,
  bracket_state JSONB, -- Tree representation
  
  -- Results
  prize_pool_actual DECIMAL(14, 2) DEFAULT 0,
  revenue DECIMAL(14, 2) DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  status VARCHAR(20) DEFAULT 'REGISTERED', -- 'REGISTERED', 'PLAYING', 'ELIMINATED', 'WINNER'
  final_place INT,
  prize_amount DECIMAL(14, 2),
  
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  eliminated_at TIMESTAMPTZ,
  
  UNIQUE(tournament_id, user_id)
);

CREATE INDEX idx_tournament_status ON tournaments(status);
CREATE INDEX idx_participant_tournament ON tournament_participants(tournament_id);
```

### 2.5 Tasks (Задания)
```sql
CREATE TYPE task_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE task_completion_status AS ENUM ('PENDING', 'REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(128) NOT NULL,
  short_description TEXT,
  long_description TEXT,
  
  reward_amount DECIMAL(14, 2) NOT NULL,
  reward_currency VARCHAR(3) DEFAULT 'CJ',
  
  status task_status DEFAULT 'DRAFT',
  
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  
  auto_verify BOOLEAN DEFAULT FALSE, -- Auto-verification or manual moderation
  verification_type VARCHAR(20), -- 'TELEGRAM_SUBSCRIPTION', 'MANUAL', etc.
  verification_config JSONB, -- { "channel_id": "...", "required_action": "subscribe" }
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  status task_completion_status DEFAULT 'PENDING',
  
  proof_data JSONB, -- User-submitted proof if needed
  
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id), -- Admin who reviewed
  
  rejection_reason TEXT,
  transaction_id UUID REFERENCES transactions(id), -- Reward transaction
  
  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_task_completions_status ON task_completions(status) WHERE status IN ('PENDING', 'REVIEW');
```

### 2.6 Notifications (Уведомления)
```sql
CREATE TYPE notification_type AS ENUM ('SYSTEM', 'MARKETING', 'TOURNAMENT');
CREATE TYPE notification_status AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  
  title VARCHAR(256),
  body TEXT NOT NULL,
  
  status notification_status DEFAULT 'DRAFT',
  
  -- Targeting
  target_filter JSONB DEFAULT '{"all": true}', -- or {"tournament_id": "..."}, {"user_ids": [...]}
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ, -- NULL = manual send
  sent_at TIMESTAMPTZ,
  
  -- Stats
  total_recipients INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  delivery_status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED', 'READ'
  
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  error_message TEXT,
  
  UNIQUE(notification_id, user_id)
);

CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at) WHERE status = 'SCHEDULED';
```

### 2.7 Event Log (Журнал событий)
```sql
CREATE TYPE event_type AS ENUM (
  -- User events
  'USER_REGISTERED', 'USER_UPDATED', 'USER_BANNED', 'USER_UNBANNED',
  -- Table events
  'TABLE_CREATED', 'TABLE_STARTED', 'TABLE_FINISHED', 'TABLE_CANCELLED',
  'PLAYER_JOINED', 'PLAYER_LEFT', 'PLAYER_REPLACED_BY_BOT', 'PLAYER_RECONNECTED',
  -- Tournament events
  'TOURNAMENT_CREATED', 'TOURNAMENT_PUBLISHED', 'TOURNAMENT_STARTED', 
  'TOURNAMENT_STAGE_STARTED', 'TOURNAMENT_FINISHED', 'TOURNAMENT_CANCELLED',
  -- Economy events
  'TRANSACTION_CREATED', 'WITHDRAWAL_APPROVED', 'WITHDRAWAL_REJECTED',
  'BALANCE_ADJUSTED',
  -- Admin events
  'GOD_MODE_CARD_SWAP', 'GOD_MODE_DECK_SHUFFLE', 'GOD_MODE_KILLER_ENABLED',
  'SETTINGS_UPDATED', 'ADMIN_ACTION'
);

CREATE TABLE event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_type event_type NOT NULL,
  severity VARCHAR(10) DEFAULT 'INFO', -- 'INFO', 'WARNING', 'CRITICAL'
  
  -- Actor
  actor_id UUID REFERENCES users(id),
  actor_type VARCHAR(20), -- 'USER', 'BOT', 'ADMIN', 'SUPERADMIN', 'SYSTEM'
  
  -- Target
  target_id UUID,
  target_type VARCHAR(20), -- 'USER', 'TABLE', 'TOURNAMENT', 'TRANSACTION', 'TASK'
  
  -- Context
  context_table_id UUID,
  context_tournament_id UUID,
  
  -- Details
  details JSONB NOT NULL DEFAULT '{}',
  
  -- IP/Session for audit
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_event_log_type ON event_log(event_type);
CREATE INDEX idx_event_log_actor ON event_log(actor_id);
CREATE INDEX idx_event_log_target ON event_log(target_id, target_type);
CREATE INDEX idx_event_log_created ON event_log(created_at DESC);
CREATE INDEX idx_event_log_severity ON event_log(severity) WHERE severity IN ('WARNING', 'CRITICAL');
```

### 2.8 Global Settings (Глобальные настройки)
```sql
CREATE TABLE global_settings (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  
  -- Audit
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default values
INSERT INTO global_settings (key, value, description) VALUES
  ('paid_table_tier_1', '{"entry_fee": 500, "prize_pool": 1800, "house_edge": 0.10, "turn_timeout": 30, "max_bots": 2}', 'Платный стол Тип 1'),
  ('paid_table_tier_2', '{"entry_fee": 1000, "prize_pool": 3600, "house_edge": 0.10, "turn_timeout": 30, "max_bots": 2}', 'Платный стол Тип 2'),
  ('paid_table_tier_3', '{"entry_fee": 1500, "prize_pool": 5400, "house_edge": 0.10, "turn_timeout": 30, "max_bots": 2}', 'Платный стол Тип 3'),
  ('free_table_with_bots', '{"turn_timeout": 30}', 'Обучающий стол (с ботами)'),
  ('free_table_pvp', '{"turn_timeout": 30}', 'Бесплатный стол (PvP)'),
  ('bot_join_timeout_seconds', '60', 'Время до подсадки бота за стол'),
  ('reconnect_timeout_seconds', '30', 'Время на переподключение'),
  ('referral_bonus_percent', '10', '% от House Edge для реферера'),
  ('tournament_no_show_timeout_seconds', '30', 'Время ожидания игрока на турнирный матч'),
  ('tournament_reminders', '{"days_before": [1], "minutes_before": [30, 5]}', 'Напоминания о турнире');
```

---

## 3. Communication Contracts

### 3.1 WebSocket Events (Namespace: `/game`)

**Client -> Server**

| Event | Payload | Description |
|-------|---------|-------------|
| `join_table` | `{ tableId?: string, type?: TableType }` | Join specific table or matchmaking |
| `make_bet` | `{ amount: number }` | **Phase: Betting**. Declare tricks count |
| `make_turn` | `{ card: string, jokerOption?: JokerOption, suit?: Suit }` | **Phase: Playing**. Play a card |
| `select_trump` | `{ suit: Suit \| null }` | **Phase: Trump Selection**. Choose trump or no-trump |
| `send_emoji` | `{ emoji: string }` | Chat preset message |
| `leave_table` | `{}` | Leave current table |

**Server -> Client**

| Event | Payload | Description |
|-------|---------|-------------|
| `game_state` | `GameState` | Full snapshot (on reconnect/start) |
| `player_joined` | `{ seatId, userId, name, isBot }` | New player joined |
| `betting_started` | `{ roundLength, dealerId }` | Betting phase begins |
| `bet_made` | `{ seatId, amount }` | Player made a bet |
| `turn_update` | `{ seatId, card, jokerOption?, nextSeatId }` | Card played |
| `trick_taken` | `{ winnerId, cards }` | Trick resolved |
| `round_result` | `{ scores, tricks, pulka }` | End of round |
| `game_finished` | `{ places, prizes, scoresheet }` | Game ended |
| `player_disconnected` | `{ seatId, gracePeriod }` | Player lost connection |
| `player_replaced` | `{ seatId, botId }` | Bot replaced player |
| `timer_update` | `{ seatId, secondsLeft }` | Turn timer |
| `error` | `{ code, message }` | Error notification |

### 3.2 Game State Object
```typescript
interface GameState {
  tableId: string;
  type: 'TRAINING' | 'FREE' | 'PAID';
  config: TableConfig;
  
  phase: 'WAITING' | 'TUZOVANIE' | 'TRUMP_SELECTION' | 'BETTING' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_RESULT';
  
  players: PlayerState[];
  
  // Current round
  roundNumber: number;
  roundLength: number;
  trumpCard: string | null;
  trumpSuit: Suit | null;
  dealerSeatId: number;
  
  // Current trick
  currentTurnSeatId: number;
  tableCards: { seatId: number; card: string; jokerOption?: JokerOption }[];
  leadSuit: Suit | null;
  
  // Timer
  turnTimeLeft: number;
  
  // Scoresheet
  pulkaNumber: number; // 1-4
  scoresheet: ScoresheetEntry[][];
}

interface PlayerState {
  seatId: number;
  oderId: string;
  name: string;
  avatarId: number;
  countryCode: string;
  isBot: boolean;
  isConnected: boolean;
  
  // Hidden from other players
  cards?: string[]; // Only for current player
  
  // Visible to all
  cardCount: number;
  bet: number | null;
  tricksTaken: number;
  score: number;
  isSpoiled: boolean; // "Испортился"
  hasJoker: boolean; // For scoresheet marker
}
```

### 3.3 Admin REST API

#### Authentication
```
POST /api/admin/auth/login
Body: { username: string, password: string }
Response: { token: string, user: AdminUser }

POST /api/admin/auth/logout
Header: Authorization: Bearer <token>
```

#### Users
```
GET    /api/admin/users                    # List with filters & pagination
GET    /api/admin/users/:id                # User detail
PATCH  /api/admin/users/:id                # Update user (nickname, avatar, status, etc.)
POST   /api/admin/users/:id/adjust-balance # Manual balance adjustment
GET    /api/admin/users/:id/transactions   # User's transaction history
GET    /api/admin/users/:id/referrals      # User's referrals
PATCH  /api/admin/users/:id/sponsor        # Change sponsor
```

#### Transactions
```
GET    /api/admin/transactions             # List with filters
GET    /api/admin/transactions/:id         # Transaction detail
POST   /api/admin/transactions/:id/approve # Approve withdrawal
POST   /api/admin/transactions/:id/reject  # Reject withdrawal
GET    /api/admin/transactions/stats       # Aggregated stats
```

#### Tables
```
GET    /api/admin/tables                   # List with filters
GET    /api/admin/tables/:id               # Table detail
GET    /api/admin/tables/:id/god-mode      # Full game state (SUPERADMIN only)
POST   /api/admin/tables/:id/swap-cards    # Card swap (SUPERADMIN only)
POST   /api/admin/tables/:id/shuffle       # Shuffle deck (SUPERADMIN only)
POST   /api/admin/tables/:id/killer-mode   # Enable killer bot (SUPERADMIN only)
```

#### Tournaments
```
GET    /api/admin/tournaments              # List with filters
POST   /api/admin/tournaments              # Create tournament
GET    /api/admin/tournaments/:id          # Tournament detail
PATCH  /api/admin/tournaments/:id          # Update tournament
DELETE /api/admin/tournaments/:id          # Cancel tournament
POST   /api/admin/tournaments/:id/publish  # Publish tournament
POST   /api/admin/tournaments/:id/add-bots # Manually add bots
GET    /api/admin/tournaments/:id/tables   # Tournament tables
GET    /api/admin/tournaments/:id/participants # Participants list
```

#### Tasks
```
GET    /api/admin/tasks                    # List tasks
POST   /api/admin/tasks                    # Create task
GET    /api/admin/tasks/:id                # Task detail
PATCH  /api/admin/tasks/:id                # Update task
DELETE /api/admin/tasks/:id                # Delete task
GET    /api/admin/tasks/:id/completions    # Completions for moderation
POST   /api/admin/tasks/:id/completions/:cid/approve
POST   /api/admin/tasks/:id/completions/:cid/reject
```

#### Notifications
```
GET    /api/admin/notifications            # List notifications
POST   /api/admin/notifications            # Create notification
GET    /api/admin/notifications/:id        # Notification detail
PATCH  /api/admin/notifications/:id        # Update notification
DELETE /api/admin/notifications/:id        # Delete notification
POST   /api/admin/notifications/:id/send   # Send now
```

#### Event Log
```
GET    /api/admin/events                   # List with filters
GET    /api/admin/events/:id               # Event detail
```

#### Settings
```
GET    /api/admin/settings                 # All settings
GET    /api/admin/settings/:key            # Single setting
PATCH  /api/admin/settings/:key            # Update setting (SUPERADMIN only)
GET    /api/admin/settings/:key/history    # Setting change history
```

#### Analytics (Dashboard)
```
GET    /api/admin/analytics/overview       # KPIs: DAU, revenue, active games
GET    /api/admin/analytics/revenue        # Revenue breakdown by source
GET    /api/admin/analytics/users          # User growth, retention
GET    /api/admin/analytics/games          # Games stats
```

---

## 4. State Machines

### 4.1 Game Lifecycle
```mermaid
stateDiagram-v2
    [*] --> WAITING: Table Created
    WAITING --> TUZOVANIE: 4 Players
    TUZOVANIE --> TRUMP_SELECTION: Dealer Selected (Pulka 2,4 only)
    TUZOVANIE --> BETTING: Dealer Selected (Pulka 1,3)
    TRUMP_SELECTION --> BETTING: Trump Selected
    BETTING --> PLAYING: All Bets Made
    PLAYING --> ROUND_RESULT: Round Complete
    ROUND_RESULT --> BETTING: Next Round
    ROUND_RESULT --> PULKA_RESULT: Pulka Complete
    PULKA_RESULT --> BETTING: Next Pulka
    PULKA_RESULT --> GAME_RESULT: Game Complete (24 rounds)
    GAME_RESULT --> [*]
```

### 4.2 Tournament Lifecycle
```mermaid
stateDiagram-v2
    [*] --> DRAFT: Created
    DRAFT --> ANNOUNCED: Published
    ANNOUNCED --> REGISTRATION: Registration Opens
    REGISTRATION --> STARTED: Start Time Reached
    REGISTRATION --> CANCELLED: Not Enough Players
    STARTED --> FINISHED: Final Winner
    STARTED --> CANCELLED: Manual Cancel
    FINISHED --> ARCHIVED: After N days
    [*] --> CANCELLED
```

### 4.3 Transaction Lifecycle
```mermaid
stateDiagram-v2
    [*] --> PENDING: Created
    PENDING --> SUCCESS: Processed OK
    PENDING --> FAILED: Processing Error
    PENDING --> CANCELLED: User/Admin Cancelled
    
    note right of PENDING: Withdrawals require\nAdmin approval
```

### 4.4 Bot Logic (Rule-based)

#### Standard Bot (Filler)
```typescript
function standardBotBet(hand: Card[], roundLength: number): number {
  const highCards = hand.filter(c => c.rank >= 'J' || c.isJoker);
  const trumpCards = hand.filter(c => c.suit === trumpSuit);
  const baseBet = Math.floor(highCards.length * 0.7 + trumpCards.length * 0.3);
  return Math.min(baseBet, roundLength);
}

function standardBotTurn(hand: Card[], table: TableCard[], rules: Rules): Card {
  const validCards = hand.filter(c => rules.isValidPlay(c, hand, table));
  return validCards[Math.floor(Math.random() * validCards.length)];
}
```

#### Killer Bot (Competitive)
```typescript
function killerBotBet(hand: Card[], roundLength: number, otherBets: number[]): number {
  const strength = calculateHandStrength(hand, trumpSuit);
  const sumOthers = otherBets.reduce((a, b) => a + b, 0);
  
  // Try to avoid "spoiling" if possible
  let bet = Math.round(strength * roundLength);
  if (sumOthers + bet === roundLength) {
    bet = bet > 0 ? bet - 1 : bet + 1;
  }
  return Math.max(0, Math.min(bet, roundLength));
}

function killerBotTurn(hand: Card[], table: TableCard[], gameState: GameState): Card {
  const validCards = hand.filter(c => rules.isValidPlay(c, hand, table));
  
  // Minimax-lite: evaluate each option
  const scored = validCards.map(card => ({
    card,
    score: evaluatePlay(card, table, gameState)
  }));
  
  scored.sort((a, b) => b.score - a.score);
  return scored[0].card;
}

function evaluatePlay(card: Card, table: TableCard[], state: GameState): number {
  let score = 0;
  
  // Would this card win the trick?
  const wouldWin = simulateTrickWinner(card, table) === 'self';
  
  if (state.myTricksTaken < state.myBet && wouldWin) {
    score += 100; // Need to take more tricks
  } else if (state.myTricksTaken >= state.myBet && !wouldWin) {
    score += 50; // Avoid taking extra tricks
  }
  
  // Prefer to keep high cards for later
  if (!wouldWin) {
    score += (14 - card.rankValue); // Lower cards are better to discard
  }
  
  return score;
}
```

---

## 5. Security & RBAC

### 5.1 Role Permissions Matrix

| Function | User | Admin | Super-Admin |
|----------|------|-------|-------------|
| Play Game | ✅ | ✅ | ✅ |
| View Own Profile | ✅ | ✅ | ✅ |
| View Own Transactions | ✅ | ✅ | ✅ |
| Access Admin Panel | ❌ | ✅ | ✅ |
| View All Users | ❌ | ✅ | ✅ |
| Edit Users | ❌ | ✅ | ✅ |
| Adjust Balance | ❌ | ✅ | ✅ |
| Manage Tournaments | ❌ | ✅ | ✅ |
| Manage Tasks | ❌ | ✅ | ✅ |
| Send Notifications | ❌ | ✅ | ✅ |
| Moderate Withdrawals | ❌ | ✅ | ✅ |
| View Event Log | ❌ | ✅ | ✅ |
| **God Mode (View Cards)** | ❌ | ❌ | ✅ (Logged) |
| **God Mode (Swap Cards)** | ❌ | ❌ | ✅ (Logged) |
| **Edit Global Settings** | ❌ | ✅ | ✅ |
| Manage Admins | ❌ | ❌ | ✅ |

### 5.2 Audit Log Requirements

**MUST Log (CRITICAL severity):**
- Manual Balance Adjustment
- Withdrawal Approval/Rejection
- Tournament Cancellation
- God Mode Actions (any)
- Global Settings Changes
- User Ban/Unban
- Admin Role Changes

**Format:**
```json
{
  "id": "uuid",
  "event_type": "GOD_MODE_CARD_SWAP",
  "severity": "CRITICAL",
  "actor_id": "admin-uuid",
  "actor_type": "SUPERADMIN",
  "target_id": "table-uuid",
  "target_type": "TABLE",
  "details": {
    "action": "swap_cards",
    "player_seat": 2,
    "old_card": "Ah",
    "new_card": "6s"
  },
  "ip_address": "192.168.1.1",
  "created_at": "2026-02-04T14:00:00Z"
}
```

---

## 6. JSONB Schemas Reference

### 6.1 User Settings
```json
{
  "sound": {
    "music_volume": 0.8,
    "effects_volume": 1.0
  },
  "language": "ru",
  "chat_enabled": true
}
```

### 6.2 User Stats
```json
{
  "rating": 156,
  "wins": {
    "paid_tables": 10,
    "free_tables": 25,
    "paid_tournaments": 2,
    "free_tournaments": 5
  },
  "places": {
    "1st": 17,
    "2nd": 12,
    "3rd": 8,
    "4th": 5
  },
  "total_games": 42,
  "total_tournaments": 7
}
```

### 6.3 Table Config
```json
{
  "entry_fee": 500,
  "prize_pool": 1800,
  "house_edge": 0.10,
  "turn_timeout": 30,
  "max_bots": 2
}
```

### 6.4 Tournament Config
```json
{
  "entry_fee": 1000,
  "grid_size": 16,
  "prize_places": 4,
  "prize_distribution": [50, 30, 15, 5],
  "turn_timeout": 20,
  "house_edge": 0.10
}
```

### 6.5 Scoresheet Entry
```json
{
  "round": 5,
  "roundLength": 5,
  "bet": 3,
  "taken": 3,
  "score": 200,
  "hasJoker": true,
  "isSpoiled": false,
  "isPremium": false,
  "premiumBonus": 0,
  "premiumPenalty": 0
}
```

---

## 7. Admin Panel Screens Matrix

| # | Screen | Route | Key Features |
|---|--------|-------|--------------|
| 1 | Dashboard | `/admin` | KPIs, online users, active games, revenue chart |
| 2 | Users List | `/admin/users` | Table with multi-sort, complex filters, pagination |
| 3 | User Detail | `/admin/users/:id` | Full user info, stats, transactions, referrals |
| 4 | Transactions | `/admin/transactions` | All transactions, withdrawal moderation queue |
| 5 | Tables List | `/admin/tables` | Active/finished tables, filters by type/status |
| 6 | Table Detail | `/admin/tables/:id` | View table state, players, scoresheet |
| 7 | God Mode | `/admin/tables/:id/god` | **SUPERADMIN only**. Full deck view, card swap, shuffle |
| 8 | Tournaments List | `/admin/tournaments` | All tournaments with status filters |
| 9 | Tournament Detail | `/admin/tournaments/:id` | Bracket, participants, bot management |
| 10 | Tournament Create/Edit | `/admin/tournaments/new` | Form with config options |
| 11 | Tasks List | `/admin/tasks` | Task management |
| 12 | Task Moderation | `/admin/tasks/:id/completions` | Approve/reject completions |
| 13 | Notifications | `/admin/notifications` | Create, schedule, send notifications |
| 14 | Event Log | `/admin/events` | Searchable audit log |
| 15 | Global Settings | `/admin/settings` | Platform configuration (**SUPERADMIN**) |
| 16 | Affiliate Stats | `/admin/affiliates` | Referral program overview |

---

## 8. Deployment Notes

### 8.1 Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/joker

# Redis
REDIS_URL=redis://localhost:6379

# Telegram
TELEGRAM_BOT_TOKEN=xxx
TELEGRAM_WEBHOOK_SECRET=xxx

# Auth
JWT_SECRET=xxx
ADMIN_JWT_SECRET=xxx

# Security
SKIP_AUTH=false
CORS_ORIGIN=https://t.me

# Feature Flags
ENABLE_GOD_MODE=true
ENABLE_KILLER_BOTS=true
```

### 8.2 Migrations
All schema changes should use versioned migrations via Prisma or TypeORM.

---

> **Document Version**: 0.5  
> **Last Updated**: 2026-02-04  
> **Status**: Ready for Phase 2 Development
