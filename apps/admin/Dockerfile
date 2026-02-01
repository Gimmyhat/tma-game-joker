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
COPY apps/admin/package.json ./apps/admin/

# Install dependencies using the root lockfile (respects overrides!)
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/apps/admin/node_modules ./apps/admin/node_modules

# Generate Prisma Client for Admin
WORKDIR /app/apps/admin
# Use pnpm exec to ensure we use the workspace dependency
RUN pnpm exec prisma generate

# Build Admin (TSC + Bundle)
# This uses the root pnpm configuration, so tiptap overrides work
RUN pnpm run build

# Create a pruned production deployment
WORKDIR /app
RUN pnpm --filter @joker/admin deploy --prod /app/pruned

FROM base AS deploy
WORKDIR /app

# Copy production node_modules from pruned
COPY --from=build /app/pruned/node_modules ./node_modules
COPY --from=build /app/pruned/package.json ./package.json

# Copy built assets
COPY --from=build /app/apps/admin/dist ./dist
COPY --from=build /app/apps/admin/public ./public
COPY --from=build /app/apps/admin/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
