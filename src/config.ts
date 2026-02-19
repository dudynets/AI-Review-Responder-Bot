import {readFileSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {z} from 'zod';
import type {AppConfig} from './types/index.js';

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_CHAT_ID: z.string().min(1, 'TELEGRAM_CHAT_ID is required'),

  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-5.2'),
  OPENAI_REASONING_EFFORT: z
    .enum(['none', 'low', 'medium', 'high', 'xhigh', ''])
    .default('')
    .transform((v) => (v === '' ? undefined : v)),
  OPENAI_VERBOSITY: z
    .enum(['low', 'medium', 'high', ''])
    .default('')
    .transform((v) => (v === '' ? undefined : v)),

  GOOGLE_PLAY_KEY_FILE: z
    .string()
    .default('./credentials/service-account.json'),

  APP_STORE_KEY_ID: z.string().default(''),
  APP_STORE_ISSUER_ID: z.string().default(''),
  APP_STORE_PRIVATE_KEY_FILE: z.string().default('./credentials/AuthKey.p8'),

  POLLING_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),

  DATABASE_PATH: z.string().default('./data/reviews.db'),

  PREFERRED_LANGUAGE: z.string().default('en'),

  LOG_LEVEL: z.string().default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

const appConfigSchema = z.array(
  z.object({
    name: z.string().min(1),
    platform: z.enum(['google_play', 'app_store', 'mock']),
    id: z.string().min(1),
    replyContext: z.string().default(''),
  }),
);

function loadEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${formatted}`);
  }
  return result.data;
}

/**
 * If `replyContext` looks like a file path (ends with .md/.txt or starts
 * with ./ or /), read the file contents. Otherwise return as-is.
 */
function resolveReplyContext(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;

  const looksLikeFile =
    trimmed.endsWith('.md') ||
    trimmed.endsWith('.txt') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('/');

  if (!looksLikeFile) return trimmed;

  const filePath = resolve(trimmed);
  if (!existsSync(filePath)) {
    throw new Error(
      `replyContext points to a file that does not exist: ${filePath}`,
    );
  }

  return readFileSync(filePath, 'utf-8').trim();
}

function loadApps(): AppConfig[] {
  const configPath = resolve('config/apps.json');
  if (!existsSync(configPath)) {
    throw new Error(
      `App configuration file not found at ${configPath}. ` +
        `Copy config/apps.example.json to config/apps.json and fill in your app details.`,
    );
  }

  const raw = readFileSync(configPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);
  const result = appConfigSchema.safeParse(parsed);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid apps.json configuration:\n${formatted}`);
  }

  if (result.data.length === 0) {
    throw new Error('apps.json must contain at least one app configuration.');
  }

  return result.data.map((app) => ({
    ...app,
    replyContext: resolveReplyContext(app.replyContext),
  }));
}

export const env = loadEnv();
export const apps = loadApps();

export const preferredLanguageName = (() => {
  const dn = new Intl.DisplayNames(['en'], {type: 'language'});
  return dn.of(env.PREFERRED_LANGUAGE) ?? env.PREFERRED_LANGUAGE;
})();

export function isGooglePlayConfigured(): boolean {
  return existsSync(resolve(env.GOOGLE_PLAY_KEY_FILE));
}

export function isAppStoreConfigured(): boolean {
  return (
    env.APP_STORE_KEY_ID.length > 0 &&
    env.APP_STORE_ISSUER_ID.length > 0 &&
    existsSync(resolve(env.APP_STORE_PRIVATE_KEY_FILE))
  );
}
