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

// Resolve public dir for prebundled assets
const publicDir = IS_PRODUCTION
  ? path.join(__dirname, '..', 'public')
  : path.join(process.cwd(), 'public');

async function start() {
  const adminJs = new AdminJS({
    rootPath: '/admin',
    // Use prebundled assets in production (built during Docker build)
    // In development, AdminJS bundles on-the-fly
    ...(IS_PRODUCTION && { assetsCDN: '/public' }),
    componentLoader,
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
          },
          // List view columns
          listProperties: ['id', 'startedAt', 'finishedAt', 'winnerId', 'createdAt'],
          // Show view properties
          showProperties: [
            'id',
            'startedAt',
            'finishedAt',
            'winnerId',
            'players',
            'gameLog',
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
            },
            gameLog: {
              type: 'mixed',
              isArray: true,
              position: 6,
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

  // Serve prebundled AdminJS assets in production
  if (IS_PRODUCTION) {
    app.use('/public', express.static(publicDir));
    console.log(`📁 Serving static assets from ${publicDir}`);
  }

  // Session configuration
  const sessionOptions: session.SessionOptions = {
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION,
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
