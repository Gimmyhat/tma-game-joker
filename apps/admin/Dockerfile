FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/

# Install all dependencies (needed for build)
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/admin/node_modules ./apps/admin/node_modules

# Generate Prisma client
WORKDIR /app/apps/admin
RUN pnpm exec prisma generate

# Build TypeScript
RUN pnpm exec tsc

# Create production deployment bundle
WORKDIR /app
RUN pnpm --filter @joker/admin deploy --prod /app/pruned

FROM base AS deploy
WORKDIR /app

# Copy production bundle
COPY --from=build /app/pruned ./

# Copy built dist (not included in deploy)
COPY --from=build /app/apps/admin/dist ./dist

# Copy prisma schema
COPY --from=build /app/apps/admin/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/index.js"]
