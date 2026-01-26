FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app

# Copy only admin package files
COPY apps/admin/package.json ./package.json
COPY apps/admin/.npmrc ./.npmrc
COPY apps/admin/prisma ./prisma
COPY apps/admin/src ./src
COPY apps/admin/tsconfig.json ./tsconfig.json

# Install ALL deps (including devDeps for bundler)
RUN pnpm install

# Generate Prisma client
RUN pnpm exec prisma generate

# Build TypeScript
RUN pnpm exec tsc

# Bundle AdminJS frontend assets (CRITICAL for production)
# This runs Rollup to create static assets, avoiding runtime bundling
RUN pnpm run bundle

FROM base AS deploy
WORKDIR /app

# Copy compiled JS
COPY --from=build /app/dist ./dist

# Copy prebundled AdminJS assets
COPY --from=build /app/public ./public

# Copy Prisma schema and generated client
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Copy package.json for reference
COPY --from=build /app/package.json ./package.json

# Install ONLY production dependencies (no devDeps, no bundler)
RUN pnpm install --prod

ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
