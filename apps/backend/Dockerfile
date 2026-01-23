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

FROM base AS deploy
WORKDIR /app

# Copy production node_modules (patched with built shared lib)
COPY --from=build /app/pruned/node_modules ./node_modules

# Copy built backend app
# Since pnpm runs 'nest build' inside apps/backend directory, output is in apps/backend/dist
COPY --from=build /app/apps/backend/dist ./dist

COPY --from=build /app/apps/backend/package.json ./package.json

EXPOSE 3000
CMD [ "node", "dist/apps/backend/src/main" ]
