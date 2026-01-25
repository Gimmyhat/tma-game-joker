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

# Generate Prisma client FIRST
WORKDIR /app/apps/admin
RUN pnpm exec prisma generate

# Build TypeScript
RUN pnpm exec tsc

# Create production deployment bundle
WORKDIR /app
RUN pnpm --filter @joker/admin deploy --prod /app/pruned

# Copy generated Prisma client to pruned node_modules
# pnpm deploy doesn't include generated files, so we copy them manually
RUN cp -r /app/node_modules/.pnpm/@prisma+client*/node_modules/.prisma /app/pruned/node_modules/.prisma 2>/dev/null || \
    cp -r /app/node_modules/.prisma /app/pruned/node_modules/.prisma 2>/dev/null || true

FROM base AS deploy
WORKDIR /app

# Copy production bundle (includes node_modules with Prisma client)
COPY --from=build /app/pruned ./

# Copy built dist
COPY --from=build /app/apps/admin/dist ./dist

# Copy prisma schema
COPY --from=build /app/apps/admin/prisma ./prisma

# Generate Prisma client in deploy stage to ensure it's properly initialized
RUN npm install -g prisma@6.19.2 && prisma generate && npm uninstall -g prisma

EXPOSE 3001
CMD ["node", "dist/index.js"]
