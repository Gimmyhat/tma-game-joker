FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/
COPY apps/frontend/package.json ./apps/frontend/

# Install all dependencies (workspace mode) to allow building with tsconfig paths
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
# Ensure nested node_modules are present if any (usually pnpm hoists to root)
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/apps/backend/node_modules ./apps/backend/node_modules

# 1. Build shared library (generates dist)
RUN pnpm --filter @joker/shared build

# 1.5. Generate Prisma Client (CRITICAL for types)
# We must run this before building the backend so the types exist
# Downgraded to Prisma 6.x for stability - 2026-01-25
WORKDIR /app/apps/backend
RUN npx prisma generate
WORKDIR /app

# 2. Build backend (using workspace context, so tsconfig paths work fine)
RUN pnpm --filter @joker/backend build

# 3. Create isolated production node_modules using deploy
RUN pnpm --filter @joker/backend deploy --prod /app/pruned

# 4. CRITICAL FIX: The deployed node_modules will contain the raw source of @joker/shared.
# We must replace it with the BUILT version (dist) so Node.js can execute it.
# We verify destination exists, then copy dist and package.json
RUN mkdir -p /app/pruned/node_modules/@joker/shared && \
    cp -r packages/shared/dist /app/pruned/node_modules/@joker/shared/ && \
    cp packages/shared/package.json /app/pruned/node_modules/@joker/shared/

# Also copy generated Prisma Client to production node_modules
# Prisma generates client into node_modules/@prisma/client by default
# Since 'deploy --prod' creates a fresh node_modules, we need to copy the client over
# However, usually 'prisma generate' in postinstall script handles this.
# But in Docker, we want to be safe.
# Actually, 'pnpm deploy' might skip postinstall for dev deps.
# Let's ensure the Prisma engine/client is present in production image.
# We will regenerate it in the final stage or copy it.
# COPY --from=build /app/apps/backend/node_modules/.prisma /app/pruned/node_modules/.prisma
# COPY --from=build /app/apps/backend/node_modules/@prisma/client /app/pruned/node_modules/@prisma/client
# The safest way is to generate it again in the deploy stage OR copy it from build.

FROM base AS deploy
WORKDIR /app

# Copy production node_modules (patched with built shared lib)
COPY --from=build /app/pruned/node_modules ./node_modules

# Copy Prisma schema for client generation
COPY --from=build /app/apps/backend/prisma ./prisma

# Install prisma CLI in production for generate, then remove it
RUN npm install -g prisma@6.19.2 && \
    prisma generate && \
    npm uninstall -g prisma

# Copy built backend app
# Since pnpm runs 'nest build' inside apps/backend directory, output is in apps/backend/dist
COPY --from=build /app/apps/backend/dist ./dist

COPY --from=build /app/apps/backend/package.json ./package.json

EXPOSE 3000
# Update entrypoint to match NestJS build output structure
# When running from root, 'nest build' outputs to dist/
# In monorepo with shared libs, tsc preserves directory structure:
# dist/apps/backend/src/main.js
CMD [ "node", "dist/apps/backend/src/main" ]
