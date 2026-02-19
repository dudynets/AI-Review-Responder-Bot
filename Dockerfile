# ── Install dependencies and rebuild native modules ──────────────────────────

FROM imbios/bun-node:1-22-debian AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production && npm rebuild better-sqlite3

# ── Production stage ─────────────────────────────────────────────────────────

FROM node:22-slim

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json ./
COPY src ./src

# The container expects these to be mounted at runtime:
#   /app/config/apps.json      – app configuration
#   /app/credentials/          – service account / p8 key files
#   /app/data/                 – SQLite database (persistent volume)

VOLUME ["/app/data"]

CMD ["node", "--import", "tsx", "src/index.ts"]
