FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app

# Copy only admin package files
COPY apps/admin/package.json ./package.json
COPY apps/admin/prisma ./prisma
COPY apps/admin/src ./src
COPY apps/admin/tsconfig.json ./tsconfig.json

# Install deps directly (not in workspace mode)
RUN pnpm install

# Generate Prisma client
RUN pnpm exec prisma generate

# Build TypeScript
RUN pnpm exec tsc

FROM base AS deploy
WORKDIR /app

# Copy everything from build
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3001
CMD ["node", "dist/index.js"]
