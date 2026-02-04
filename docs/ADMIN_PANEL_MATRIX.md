# Admin Panel Screens Matrix

**Based on**: TOR v1.3, TECH_SPEC v0.5  
**Reference UI**: [TailAdmin](https://tailadmin.com/)  
**Date**: 2026-02-04

---

## 1. Navigation Structure

```
📊 Dashboard
👥 Users
   ├── List
   └── Detail
💰 Transactions
   └── Moderation Queue
🎮 Tables
   ├── List
   ├── Detail
   └── God Mode (SUPERADMIN)
🏆 Tournaments
   ├── List
   ├── Detail
   └── Create/Edit
📋 Tasks
   ├── List
   └── Moderation
📢 Notifications
📜 Event Log
⚙️ Settings
👥 Affiliates
```

---

## 2. Screens Detail

### 2.1 Dashboard (`/admin`)

**Purpose**: Overview of platform health and KPIs.

| Widget | Data | Update |
|--------|------|--------|
| Online Users | Count of connected users | Real-time |
| Active Games | Tables in PLAYING status | Real-time |
| Revenue Today | Sum of House Edge today | 1 min |
| Pending Withdrawals | Count, Total Amount | 1 min |
| New Users (24h) | Registration count | Hourly |
| Revenue Chart | 7/30/90 days | On load |

---

### 2.2 Users List (`/admin/users`)

**Columns**:
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| ID | UUID (short) | ✅ | Text (Like) |
| TG ID | Number | ✅ | Text (Like) |
| Username | String | ✅ | Text (Like) |
| Balance (CJ) | Number | ✅ | Range |
| Rating | Number | ✅ | Range |
| Status | Enum | ✅ | Enum |
| Is Bot | Boolean | ✅ | Boolean |
| Referral Code | String | ✅ | Text (Like) |
| Created At | DateTime | ✅ | Date Range |

**Filters Logic**: AND/OR toggle for combining filters.

**Actions**:
- View Details
- Quick Ban/Unban
- Quick Balance Adjust

---

### 2.3 User Detail (`/admin/users/:id`)

**Sections**:

#### Info Block
- User ID, TG ID, Username
- Status badge (ACTIVE/BANNED)
- Is Bot flag
- Created/Updated dates

#### Balance Block
- Current Balance
- Total Deposits
- Total Withdrawals
- Net P&L
- **Action**: Adjust Balance (modal with amount + comment)

#### Profile Block
- Avatar (preview of 5 presets)
- Country (flag + dropdown)
- **Editable**: Nickname, Avatar, Country, Status

#### Referral Block
- Referral Code (copyable)
- Sponsor (editable dropdown search)
- Referrals Count
- Total Earnings from Referrals
- **Action**: Disable from affiliate program

#### Stats Block
- Rating
- Games Played (by type)
- Tournaments Played
- Places breakdown (1st/2nd/3rd/4th)

#### Online Block
- Current Table (if any) → link to Table Detail
- Current Tournament (if any) → link to Tournament Detail

#### Transactions Tab
- Embedded table with user's transactions
- Same columns as Transactions List
- Filtered by this user

#### Referrals Tab
- List of user's referrals
- Username, Balance, Total Games, Earnings Generated

---

### 2.4 Transactions (`/admin/transactions`)

**Columns**:
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| ID | UUID | ✅ | Text |
| Date | DateTime | ✅ | Date Range |
| User | Link | ✅ | User Search |
| Type | Enum | ✅ | Multi-select Enum |
| Amount | Number | ✅ | Range |
| Status | Enum | ✅ | Multi-select Enum |
| Reference | Link | ✅ | Table/Tournament ID |
| Comment | Text | ❌ | Text (Like) |

**Aggregation Bar**: Shows sum of filtered transactions.

**Quick Actions**:
- Approve Withdrawal (for PENDING + WITHDRAW)
- Reject Withdrawal (with reason modal)

---

### 2.5 Tables List (`/admin/tables`)

**Columns**:
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| ID | UUID | ✅ | Text |
| Type | Enum | ✅ | Enum |
| Entry Fee | Number | ✅ | Range |
| Players | Count/4 | ❌ | — |
| Status | Enum | ✅ | Enum |
| Round | Number | ✅ | Range |
| Tournament | Link | ✅ | Tournament ID |
| Created | DateTime | ✅ | Date Range |

**Actions**:
- View Detail
- God Mode (SUPERADMIN only)

---

### 2.6 Table Detail (`/admin/tables/:id`)

**Sections**:

#### Header
- Table ID, Type badge, Status badge
- Entry Fee, Prize Pool
- Tournament link (if applicable)

#### Players Block
- 4 player cards with:
  - Avatar, Username
  - Score, Bet, Tricks Taken
  - Connection status
  - Link to User Detail

#### Game State Block
- Current Round / 24
- Current Pulka
- Trump Suit (if any)
- Current Turn Player

#### Scoresheet
- 4-column table showing all rounds
- Bets, Taken, Scores, Spoiled/Premium markers

---

### 2.7 God Mode (`/admin/tables/:id/god`)

**⚠️ SUPERADMIN ONLY**

**Layout**: Full-screen game visualization

#### Top Bar
- Warning banner: "God Mode - All actions are logged"
- Table info, status

#### Main Area
- Visual representation of table
- All 4 hands visible (actual cards)
- Deck visible
- Current table cards

#### Actions Panel
- **Swap Cards**: Select player → select their card → select replacement
- **Shuffle Deck**: Randomize remaining deck
- **Enable Killer Mode**: Toggle killer AI for specific bot

#### Audit Log (bottom)
- Live feed of all actions in this session
- Auto-scroll

---

### 2.8 Tournaments List (`/admin/tournaments`)

**Columns**:
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| ID | UUID | ✅ | Text |
| Title | String | ✅ | Text (Like) |
| Status | Enum | ✅ | Enum |
| Grid Size | Number | ✅ | Enum (16/32/64) |
| Participants | Actual/Max | ✅ | Range |
| Entry Fee | Number | ✅ | Range |
| Prize Pool | Number | ✅ | Range |
| Start Time | DateTime | ✅ | Date Range |

**Actions**:
- View Detail
- Edit (if DRAFT/ANNOUNCED)
- Publish (if DRAFT)
- Cancel

---

### 2.9 Tournament Detail (`/admin/tournaments/:id`)

**Sections**:

#### Header
- Title, Status badge
- Entry Fee, Prize Pool, Grid Size
- Start Time, Registration Period

#### Config Block (editable if not STARTED)
- Prize Distribution (%)
- Turn Timeout
- Bot Fill Settings

#### Bracket Visualization
- Tree diagram of stages
- Completed tables show winner
- In-progress tables show scores
- Click table → go to Table Detail

#### Participants Tab
- List of all participants
- Status (REGISTERED/PLAYING/ELIMINATED/WINNER)
- Final Place, Prize Amount
- Actions: Remove (if not started), Replace with Bot

#### Tables Tab
- All tables in this tournament
- Grouped by stage
- Status, Players, Winner

#### Bot Management
- Current bots count
- Auto-fill schedule
- **Action**: Add Bots Now (with count input)

---

### 2.10 Tasks List (`/admin/tasks`)

**Columns**:
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| ID | UUID | ✅ | Text |
| Title | String | ✅ | Text (Like) |
| Status | Enum | ✅ | Enum |
| Reward | Number | ✅ | Range |
| Pending | Count | ✅ | Range |
| Start Date | DateTime | ✅ | Date Range |
| End Date | DateTime | ✅ | Date Range |

**Actions**:
- Create New
- Edit
- Publish (if DRAFT)
- Archive
- View Completions

---

### 2.11 Task Moderation (`/admin/tasks/:id/completions`)

**Columns**:
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| User | Link | ✅ | User Search |
| Submitted At | DateTime | ✅ | Date Range |
| Status | Enum | ✅ | Enum |
| Proof | View Button | ❌ | — |

**Bulk Actions**:
- Approve Selected
- Reject Selected (with reason)

---

### 2.12 Notifications (`/admin/notifications`)

**List View**:
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| ID | UUID | ✅ | Text |
| Type | Enum | ✅ | Enum |
| Title | String | ✅ | Text (Like) |
| Status | Enum | ✅ | Enum |
| Scheduled | DateTime | ✅ | Date Range |
| Recipients | Count | ✅ | Range |
| Delivered | Count | ❌ | — |

**Create/Edit Form**:
- Type (SYSTEM/MARKETING/TOURNAMENT)
- Title
- Body (rich text or markdown preview)
- Target: All / Tournament Participants / Custom User IDs
- Schedule: Now / Specific DateTime

**Actions**:
- Send Now
- Delete

---

### 2.13 Event Log (`/admin/events`)

**Columns**:
| Column | Type | Sortable | Filterable |
|--------|------|----------|------------|
| Timestamp | DateTime | ✅ | Date Range |
| Type | Enum | ✅ | Multi-select Enum |
| Severity | Enum | ✅ | Enum |
| Actor | Link | ✅ | User/Admin Search |
| Target | Link | ✅ | Entity Search |
| Details | Expandable | ❌ | Text (Like) |

**Quick Filters**:
- Critical Only
- God Mode Actions
- Financial Actions
- Last Hour / 24h / 7d

---

### 2.14 Global Settings (`/admin/settings`)

**Layout**: Key-Value editor with categories

**Categories**:
- **Tables**: Paid Tier 1/2/3, Free with Bots, Free PvP
- **Timeouts**: Bot Join, Reconnect, Turn
- **Economy**: House Edge % (default: 10%), Referral Bonus %
- **Tournaments**: No-Show Timeout, Reminders

**Each Setting**:
- Key (readonly)
- Current Value (JSON editor)
- Description
- Last Updated By, Updated At
- **Action**: Save (with confirmation)

---

### 2.15 Affiliates (`/admin/affiliates`)

**Dashboard View**:
- Total Referral Earnings (platform-wide)
- Top Referrers (table)
- Referral Trend Chart

**Top Referrers Table**:
| Column | Type | Sortable |
|--------|------|----------|
| User | Link | ✅ |
| Referrals Count | Number | ✅ |
| Total Earnings | Number | ✅ |
| Active Referrals | Number | ✅ |

---

## 3. Common UI Patterns

### 3.1 Multi-Sort
- Click column header → primary sort
- Shift+Click → add secondary sort
- Show sort indicators (1↑, 2↓)

### 3.2 Complex Filters
```
┌─────────────────────────────────────┐
│ Filters                    [Clear All] │
├─────────────────────────────────────┤
│ + Add Filter                         │
│                                      │
│ ┌─────────────────────────────────┐ │
│ │ Status = ACTIVE  [AND ▼]  [×]  │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Balance >= 1000   [AND ▼]  [×] │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Created > 2026-01-01  [×]      │ │
│ └─────────────────────────────────┘ │
│                                      │
│               [Apply Filters]        │
└─────────────────────────────────────┘
```

### 3.3 Pagination
- Page size selector: 10/25/50/100
- Previous/Next buttons
- Jump to page
- Total count display

### 3.4 Modals
- Confirmation for destructive actions
- Form modals for quick edits
- Full-screen modals for complex forms

---

## 4. Access Control

| Screen | ADMIN | SUPERADMIN |
|--------|-------|------------|
| Dashboard | ✅ | ✅ |
| Users | ✅ | ✅ |
| Transactions | ✅ | ✅ |
| Tables | ✅ | ✅ |
| **Tables God Mode** | ❌ | ✅ |
| Tournaments | ✅ | ✅ |
| Tasks | ✅ | ✅ |
| Notifications | ✅ | ✅ |
| Event Log | ✅ | ✅ |
| **Global Settings** | ✅ | ✅ |
| Affiliates | ✅ | ✅ |

---

> **Document Version**: 1.0  
> **Last Updated**: 2026-02-04
