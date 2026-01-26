import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource, getModelByName } from '@adminjs/prisma';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import componentLoader, { Components } from './component-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register Prisma adapter
AdminJS.registerAdapter({ Database, Resource });

const prisma = new PrismaClient();

const PORT = process.env.ADMIN_PORT || 3001;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@joker.game';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'change-this-in-production-please';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ADMIN_COOKIE_SECURE = process.env.ADMIN_COOKIE_SECURE !== 'false';

interface AdminRecordResponse {
  record?: {
    params: Record<string, unknown>;
  };
}

interface GameLogEntry {
  a: string;
  p: string;
  t: number;
  d?: Record<string, unknown>;
}

interface AnalysisCard {
  cardId: string;
  cardType: string | null;
  suit: string | null;
  rank: string | null;
  jokerOption: string | null;
  requestedSuit: string | null;
}

interface AnalysisTrick {
  index: number;
  leaderId: string | null;
  winnerId: string | null;
  winnerTricks: number | null;
  cards: Array<{ playerId: string; card: AnalysisCard; at: number }>;
  handsBefore?: Record<string, AnalysisCard[]>;
  handsAfter?: Record<string, AnalysisCard[]>;
}

interface AnalysisRound {
  round: number;
  pulka: number;
  cardsPerPlayer: number | null;
  dealerId: string | null;
  trump: string | null;
  bets: Record<string, number>;
  tricks: AnalysisTrick[];
  scores: Record<string, number> | null;
}

interface AnalysisEvent {
  index: number;
  action: string;
  playerId: string;
  timestamp: number;
  round: number;
  pulka: number;
  trickIndex: number | null;
  data: Record<string, unknown> | null;
}

const cloneHands = (hands: Record<string, AnalysisCard[]>): Record<string, AnalysisCard[]> =>
  JSON.parse(JSON.stringify(hands));

const buildGameAnalysis = (
  players: Record<string, unknown>[],
  gameLog: Record<string, unknown>[],
): {
  players: Record<string, unknown>[];
  rounds: AnalysisRound[];
  events: AnalysisEvent[];
  eventTypes: string[];
  hasHands: boolean;
} => {
  const playersById = new Map(
    players.map((player) => [String(player.id), player] as [string, Record<string, unknown>]),
  );

  const roundsByKey = new Map<string, AnalysisRound>();
  const eventTypes = new Set<string>();

  let currentRound = 1;
  let currentPulka = 1;
  let currentTrump: string | null = null;
  let currentCardsPerPlayer: number | null = null;
  let currentDealerId: string | null = null;
  let currentHands: Record<string, AnalysisCard[]> | null = null;
  let currentTrick: AnalysisTrick | null = null;
  const events: AnalysisEvent[] = [];
  let eventIndex = 0;

  const ensureRound = (): AnalysisRound => {
    const key = `${currentPulka}-${currentRound}`;
    if (!roundsByKey.has(key)) {
      roundsByKey.set(key, {
        round: currentRound,
        pulka: currentPulka,
        cardsPerPlayer: currentCardsPerPlayer,
        dealerId: currentDealerId,
        trump: currentTrump,
        bets: {},
        tricks: [],
        scores: null,
      });
    }

    const round = roundsByKey.get(key)!;
    if (round.trump === null) round.trump = currentTrump;
    if (round.cardsPerPlayer === null) round.cardsPerPlayer = currentCardsPerPlayer;
    if (round.dealerId === null) round.dealerId = currentDealerId;
    return round;
  };

  for (const raw of gameLog) {
    const entry = raw as unknown as GameLogEntry;
    eventTypes.add(entry.a);

    const pushEvent = (trickIndex: number | null) => {
      events.push({
        index: eventIndex++,
        action: entry.a,
        playerId: entry.p,
        timestamp: entry.t,
        round: currentRound,
        pulka: currentPulka,
        trickIndex,
        data: entry.d ?? null,
      });
    };

    if (entry.a === 'GAME_START') {
      const data = entry.d ?? {};
      currentRound = Number(data.round ?? 1);
      currentPulka = Number(data.pulka ?? 1);
      currentTrump = (data.trump as string | null) ?? null;
      ensureRound();
      pushEvent(null);
      continue;
    }

    if (entry.a === 'ROUND_START') {
      const data = entry.d ?? {};
      currentRound = Number(data.round ?? currentRound);
      currentPulka = Number(data.pulka ?? currentPulka);
      currentCardsPerPlayer = Number(data.cardsPerPlayer ?? currentCardsPerPlayer);
      currentDealerId = (data.dealerId as string | null) ?? null;
      currentTrump = (data.trump as string | null) ?? currentTrump;

      const round = ensureRound();
      round.cardsPerPlayer = currentCardsPerPlayer;
      round.dealerId = currentDealerId;
      round.trump = currentTrump;

      const handsData = data.hands as Array<{ playerId: string; hand: AnalysisCard[] }> | undefined;
      if (handsData && Array.isArray(handsData)) {
        currentHands = {};
        for (const handEntry of handsData) {
          if (handEntry && handEntry.playerId) {
            currentHands[handEntry.playerId] = (handEntry.hand ?? []).map((card) => ({
              ...card,
              cardType: card.cardType ? card.cardType.toUpperCase() : null,
            }));
          }
        }
      }

      pushEvent(null);

      continue;
    }

    if (entry.a === 'TRUMP') {
      currentTrump = (entry.d?.trump as string | null) ?? currentTrump;
      ensureRound().trump = currentTrump;
      pushEvent(null);
      continue;
    }

    const round = ensureRound();

    if (entry.a === 'BET') {
      const amount = Number(entry.d?.amount ?? 0);
      round.bets[entry.p] = amount;
      pushEvent(null);
      continue;
    }

    if (entry.a === 'CARD') {
      if (!currentTrick) {
        currentTrick = {
          index: round.tricks.length + 1,
          leaderId: entry.p,
          winnerId: null,
          winnerTricks: null,
          cards: [],
          handsBefore: currentHands ? cloneHands(currentHands) : undefined,
        };
        round.tricks.push(currentTrick);
      }

      const rawCardType = typeof entry.d?.cardType === 'string' ? entry.d?.cardType : null;
      const card: AnalysisCard = {
        cardId: String(entry.d?.cardId ?? ''),
        cardType: rawCardType ? rawCardType.toUpperCase() : null,
        suit: (entry.d?.suit as string | null) ?? null,
        rank: (entry.d?.rank as string | null) ?? null,
        jokerOption: (entry.d?.jokerOption as string | null) ?? null,
        requestedSuit: (entry.d?.requestedSuit as string | null) ?? null,
      };

      currentTrick.cards.push({ playerId: entry.p, card, at: entry.t });

      if (currentHands && currentHands[entry.p]) {
        currentHands[entry.p] = currentHands[entry.p].filter((c) => c.cardId !== card.cardId);
      }

      pushEvent(currentTrick.index);

      continue;
    }

    if (entry.a === 'TRICK_WINNER') {
      if (currentTrick) {
        currentTrick.winnerId = entry.p;
        currentTrick.winnerTricks = Number(entry.d?.tricks ?? 0);
        if (currentHands) {
          currentTrick.handsAfter = cloneHands(currentHands);
        }
        pushEvent(currentTrick.index);
      }
      currentTrick = null;
      continue;
    }

    if (entry.a === 'ROUND_COMPLETE') {
      round.scores = (entry.d?.scores as Record<string, number>) ?? null;
      pushEvent(null);
      continue;
    }

    if (entry.a === 'PULKA_COMPLETE') {
      currentPulka = currentPulka + 1;
      pushEvent(null);
      continue;
    }
  }

  return {
    players: [...playersById.values()],
    rounds: [...roundsByKey.values()].sort((a, b) => a.round - b.round),
    events,
    eventTypes: [...eventTypes.values()].sort(),
    hasHands: Boolean(currentHands),
  };
};

const buildArrayFromParams = (
  params: Record<string, unknown>,
  prefix: string,
): Record<string, unknown>[] => {
  const items: Record<number, Record<string, unknown>> = {};
  const prefixWithDot = `${prefix}.`;

  const setNestedValue = (target: Record<string, unknown>, path: string[], value: unknown) => {
    if (path.length === 0) return;

    let current: Record<string, unknown> = target;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (current[key] === undefined || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[path[path.length - 1]] = value;
  };

  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith(prefixWithDot)) continue;

    const rest = key.slice(prefixWithDot.length);
    const [indexStr, ...pathParts] = rest.split('.');
    const index = Number(indexStr);

    if (!Number.isFinite(index)) continue;

    if (!items[index]) {
      items[index] = {};
    }

    if (pathParts.length === 0) {
      items[index] = value as Record<string, unknown>;
    } else {
      setNestedValue(items[index], pathParts, value);
    }
  }

  return Object.keys(items)
    .map((key) => Number(key))
    .sort((a, b) => a - b)
    .map((key) => items[key]);
};

// Resolve public dir for prebundled assets
const publicDir = IS_PRODUCTION
  ? path.join(__dirname, '..', 'public')
  : path.join(process.cwd(), 'public');

async function start() {
  // In production with ADMIN_JS_SKIP_BUNDLE=true, we don't need assetsCDN
  // AdminJS will serve assets from /admin/frontend/assets/ and we override those routes
  const adminJs = new AdminJS({
    rootPath: '/admin',
    componentLoader,
    branding: {
      companyName: 'Joker Game Admin',
      logo: false,
      withMadeWithLove: false,
    },
    resources: [
      {
        resource: {
          model: getModelByName('Game'),
          client: prisma,
        },
        options: {
          navigation: {
            name: 'Games',
            icon: 'Activity',
          },
          // READ-ONLY: Disable all write operations for data integrity
          actions: {
            new: { isAccessible: false, isVisible: false },
            edit: { isAccessible: false, isVisible: false },
            delete: { isAccessible: false, isVisible: false },
            bulkDelete: { isAccessible: false, isVisible: false },
            show: {
              after: async (response: AdminRecordResponse) => {
                try {
                  const record = response.record;
                  if (!record) return response;

                  // DEBUG: Show available keys in winnerId field to debug fetching issues
                  const debugKeys = Object.keys(record.params).filter((k) => !k.includes('.'));
                  record.params.winnerId = `DEBUG KEYS: ${debugKeys.join(', ')}`;

                  // Helper to extract JSON data whether it's flattened or not
                  const extractJson = (key: string) => {
                    // 1. Try direct access (if not flattened)
                    if (record.params[key] && typeof record.params[key] === 'object') {
                      return record.params[key] as Record<string, unknown>[];
                    }
                    // 2. Try parsing if it's a string
                    if (typeof record.params[key] === 'string') {
                      try {
                        return JSON.parse(record.params[key] as string);
                      } catch (e) {
                        // ignore
                      }
                    }
                    // 3. Try building from flattened params
                    return buildArrayFromParams(record.params, key);
                  };

                  const playersArray = extractJson('players');
                  const gameLogArray = extractJson('gameLog');

                  // Safety check
                  if (!Array.isArray(playersArray) || !Array.isArray(gameLogArray)) {
                    const safePlayers = Array.isArray(playersArray) ? playersArray : [];
                    const safeLog = Array.isArray(gameLogArray) ? gameLogArray : [];

                    record.params.playersJson = JSON.stringify(safePlayers, null, 2);
                    record.params.gameLogJson = JSON.stringify(safeLog, null, 2);
                    record.params.analysisJson = JSON.stringify(
                      buildGameAnalysis(safePlayers, safeLog),
                      null,
                      2,
                    );
                    return response;
                  }

                  const analysis = buildGameAnalysis(playersArray, gameLogArray);

                  record.params.playersJson = JSON.stringify(playersArray, null, 2);
                  record.params.gameLogJson = JSON.stringify(gameLogArray, null, 2);
                  record.params.analysisJson = JSON.stringify(analysis, null, 2);

                  return response;
                } catch (error) {
                  // DEBUG: Show error in winnerId
                  if (response.record) {
                    response.record.params.winnerId = `ERROR: ${(error as Error).message} | Stack: ${(error as Error).stack?.split('\n')[1] || 'no stack'}`;
                  }
                  return response;
                }
              },
            },
          },
          // List view columns
          listProperties: ['id', 'status', 'startedAt', 'finishedAt', 'winnerId', 'createdAt'],
          // Show view properties
          showProperties: [
            'id',
            'status',
            'startedAt',
            'finishedAt',
            'winnerId',
            'analysisJson',
            'createdAt',
          ],
          properties: {
            id: {
              isTitle: true,
              position: 1,
            },
            status: {
              position: 2,
            },
            startedAt: {
              type: 'datetime',
              position: 3,
            },
            finishedAt: {
              type: 'datetime',
              position: 4,
            },
            winnerId: {
              position: 5,
            },
            players: {
              type: 'mixed',
              isArray: true,
              position: 6,
              isVisible: {
                list: false,
                show: false,
                edit: false,
                filter: false,
              },
            },
            gameLog: {
              type: 'mixed',
              isArray: true,
              position: 7,
              isVisible: {
                list: false,
                show: false,
                edit: false,
                filter: false,
              },
            },
            playersJson: {
              type: 'textarea',
              position: 6,
              isVisible: {
                list: false,
                show: false,
                edit: false,
                filter: false,
              },
            },
            gameLogJson: {
              type: 'textarea',
              position: 7,
              isVisible: {
                list: false,
                show: false,
                edit: false,
                filter: false,
              },
            },
            analysisJson: {
              components: {
                show: Components.GameAnalysis,
              },
              position: 8,
              isVisible: {
                list: false,
                show: true,
                edit: false,
                filter: false,
              },
            },
            createdAt: {
              type: 'datetime',
              position: 9,
            },
          },
        },
      },
    ],
  });

  const app = express();

  // In production, serve prebundled AdminJS assets
  // AdminJS expects assets at /admin/frontend/assets/
  if (IS_PRODUCTION) {
    app.use('/admin/frontend/assets', express.static(publicDir));
    console.log(`📁 Serving static assets from ${publicDir}`);
  }

  // Session configuration
  const sessionOptions: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION && ADMIN_COOKIE_SECURE,
    },
  };

  // Build router with or without authentication
  let adminRouter;
  if (ADMIN_PASSWORD) {
    adminRouter = AdminJSExpress.buildAuthenticatedRouter(
      adminJs,
      {
        authenticate: async (email: string, password: string) => {
          if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            return { email, id: 'admin' };
          }
          return null;
        },
        cookieName: 'adminjs',
        cookiePassword: SESSION_SECRET,
      },
      null,
      sessionOptions,
    );
    console.log('🔒 Admin authentication enabled');
  } else {
    adminRouter = AdminJSExpress.buildRouter(adminJs);
    console.log('⚠️  Admin running WITHOUT authentication (dev mode)');
  }

  app.use(adminJs.options.rootPath, adminRouter);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.listen(PORT, () => {
    console.log(`🎮 Joker Admin Panel running at http://localhost:${PORT}/admin`);
    console.log(`📊 Read-only mode enabled - no data modification allowed`);
  });
}

start().catch((error) => {
  console.error('Failed to start admin:', error);
  process.exit(1);
});
