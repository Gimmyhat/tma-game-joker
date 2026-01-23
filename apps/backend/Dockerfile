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

# Build shared package first if needed, then backend
RUN pnpm --filter @joker/backend build
RUN pnpm prune --prod

# DEBUG: List build output structure to fix path issue
RUN echo "Checking build output locations:" && \
    ls -la /app/apps/backend/ && \
    (ls -la /app/apps/backend/dist || echo "No dist in app dir") && \
    (ls -la /app/dist || echo "No dist in root")

FROM base AS deploy
WORKDIR /app
# Try to find where main.js is. 
# If previous build passed COPY, then /app/apps/backend/dist existed.
# Maybe main.js is in a subdirectory?
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/backend/package.json ./apps/backend/package.json

EXPOSE 3000
# Add ls -R to see what we actually copied
CMD ["sh", "-c", "ls -R /app/dist && node dist/main"]
