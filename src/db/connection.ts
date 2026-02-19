import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import Database from 'better-sqlite3';
import {drizzle} from 'drizzle-orm/better-sqlite3';
import {env} from '../config.js';
import * as schema from './schema.js';
import {logger} from '../utils/logger.js';

const dbPath = resolve(env.DATABASE_PATH);
mkdirSync(dirname(dbPath), {recursive: true});

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, {schema});

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id              TEXT PRIMARY KEY,
    platform        TEXT NOT NULL,
    app_id          TEXT NOT NULL,
    app_name        TEXT NOT NULL,
    review_id       TEXT NOT NULL,
    author_name     TEXT DEFAULT 'Anonymous',
    star_rating     INTEGER NOT NULL,
    original_text   TEXT NOT NULL,
    translated_text TEXT,
    reviewer_language TEXT DEFAULT 'en',
    territory       TEXT,
    generated_reply TEXT,
    reply_translated TEXT,
    telegram_msg_id INTEGER,
    telegram_chat_id TEXT,
    status          TEXT NOT NULL DEFAULT 'pending',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
  CREATE INDEX IF NOT EXISTS idx_reviews_platform_app ON reviews(platform, app_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_telegram_msg ON reviews(telegram_msg_id, telegram_chat_id);
`);

logger.info({path: dbPath}, 'Database initialized');
