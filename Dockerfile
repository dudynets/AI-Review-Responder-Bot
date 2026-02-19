FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
COPY drizzle.config.ts ./

# ── Production stage ────────────────────────────────────────────────────────

FROM oven/bun:1-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# The container expects these to be mounted at runtime:
#   /app/config/apps.json          – app configuration
#   /app/credentials/              – service account / p8 keys
#   /app/data/                     – SQLite database (persistent volume)
#   /app/.env                      – environment variables (or use env flags)

VOLUME ["/app/data"]

CMD ["bun", "src/index.ts"]
