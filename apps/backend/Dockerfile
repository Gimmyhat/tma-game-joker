FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies
WORKDIR /app
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/backend/package.json ./apps/backend/

# Install dependencies needed for build
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/apps/backend/node_modules ./apps/backend/node_modules

# Build shared package first if needed
# We don't build in root anymore, we use pnpm deploy to isolate

# Create a deployed directory with all dependencies (including dev)
RUN pnpm --filter @joker/backend deploy /app/pruned

WORKDIR /app/pruned
# Build the backend inside the isolated directory
RUN pnpm run build
# Remove dev dependencies to keep image small
RUN pnpm prune --prod

FROM base AS deploy
WORKDIR /app
# Copy the completely self-contained application
COPY --from=build /app/pruned ./

EXPOSE 3000
# Check structure for debugging if needed, but standard nest build goes to dist/main
CMD [ "node", "dist/main" ]
