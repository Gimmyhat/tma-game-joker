import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { Database, Resource, getModelByName } from '@adminjs/prisma';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import componentLoader from './component-loader.js';

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
    // Only include componentLoader in development - production uses prebundled assets
    ...(!IS_PRODUCTION && { componentLoader }),
    branding: {
      companyName: 'Joker Game Admin',
      logo: false,
      withMadeWithLove: false,
    },
    resources: [
      {
        resource: {
          model: getModelByName('FinishedGame'),
          client: prisma,
        },
        options: {
          navigation: {
            name: 'Game Analysis',
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
                const record = response.record;
                if (!record) return response;

                const playersArray = buildArrayFromParams(record.params, 'players');
                const gameLogArray = buildArrayFromParams(record.params, 'gameLog');

                record.params.playersJson = JSON.stringify(playersArray, null, 2);
                record.params.gameLogJson = JSON.stringify(gameLogArray, null, 2);

                return response;
              },
            },
          },
          // List view columns
          listProperties: ['id', 'startedAt', 'finishedAt', 'winnerId', 'createdAt'],
          // Show view properties
          showProperties: [
            'id',
            'startedAt',
            'finishedAt',
            'winnerId',
            'playersJson',
            'gameLogJson',
            'createdAt',
          ],
          properties: {
            id: {
              isTitle: true,
              position: 1,
            },
            startedAt: {
              type: 'datetime',
              position: 2,
            },
            finishedAt: {
              type: 'datetime',
              position: 3,
            },
            winnerId: {
              position: 4,
            },
            players: {
              type: 'mixed',
              isArray: true,
              position: 5,
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
              position: 6,
              isVisible: {
                list: false,
                show: false,
                edit: false,
                filter: false,
              },
            },
            playersJson: {
              type: 'textarea',
              position: 5,
              isVisible: {
                list: false,
                show: true,
                edit: false,
                filter: false,
              },
            },
            gameLogJson: {
              type: 'textarea',
              position: 6,
              isVisible: {
                list: false,
                show: true,
                edit: false,
                filter: false,
              },
            },
            createdAt: {
              type: 'datetime',
              position: 7,
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
