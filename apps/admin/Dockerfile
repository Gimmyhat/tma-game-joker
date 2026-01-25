FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @joker/admin

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

# Copy built app
COPY --from=build /app/apps/admin/dist ./dist
COPY --from=build /app/apps/admin/prisma ./prisma
COPY --from=build /app/apps/admin/package.json ./package.json

# Copy node_modules from build
COPY --from=build /app/node_modules ./node_modules

# Generate Prisma client in production
RUN npm install -g prisma@6.19.2 && prisma generate

EXPOSE 3001
CMD ["node", "dist/index.js"]
