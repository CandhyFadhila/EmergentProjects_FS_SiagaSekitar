# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive

FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn prisma generate
RUN yarn build

FROM node:22-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl && rm -rf /var/lib/apt/lists/* && groupadd --system --gid 1001 nextjs && useradd --system --uid 1001 --gid nextjs nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

FROM deps AS migrator
COPY prisma ./prisma
ENV NODE_ENV=production
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]
