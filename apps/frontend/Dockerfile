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
COPY apps/frontend/package.json ./apps/frontend/

RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=dependencies /app/apps/frontend/node_modules ./apps/frontend/node_modules

# Build frontend
RUN pnpm --filter @joker/frontend build

FROM nginx:alpine AS deploy
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Add healthcheck for reliability
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
