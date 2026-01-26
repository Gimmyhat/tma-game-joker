FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/

# Install ALL dependencies (including devDependencies for AdminJS bundling)
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

FROM base AS deploy
WORKDIR /app

# Copy built dist
COPY --from=build /app/apps/admin/dist ./dist

# Copy prisma schema
COPY --from=build /app/apps/admin/prisma ./prisma

# Copy package.json for node to resolve type:module
COPY --from=build /app/apps/admin/package.json ./package.json

# Copy FULL node_modules (AdminJS needs all deps including devDeps for bundling)
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/index.js"]
