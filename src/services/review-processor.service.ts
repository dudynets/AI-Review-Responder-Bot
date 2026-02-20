import type {Bot} from 'grammy';
import {
  env,
  apps,
  isGooglePlayConfigured,
  isAppStoreConfigured,
} from '../config.js';
import {logger} from '../utils/logger.js';
import {Platform, type NormalizedReview} from '../types/index.js';
import type {PlatformAdapter} from '../platforms/platform.interface.js';
import {GooglePlayAdapter} from '../platforms/google-play.adapter.js';
import {AppStoreAdapter} from '../platforms/app-store.adapter.js';
import {MockAdapter} from '../platforms/mock.adapter.js';
import {generateReply, translateText} from './ai.service.js';
import {
  makeReviewId,
  reviewExists,
  insertReview,
  findReviewById,
  updateReviewTelegramMsg,
} from '../db/review.repository.js';
import {
  formatReviewMessage,
  buildReviewKeyboard,
} from '../bot/message-formatter.js';

const adapters: Record<Platform, PlatformAdapter> = {
  google_play: new GooglePlayAdapter(),
  app_store: new AppStoreAdapter(),
  mock: new MockAdapter(),
};

export async function processAllApps(bot: Bot): Promise<number> {
  logger.info('Starting review check for all apps');
  let newCount = 0;

  for (const app of apps) {
    try {
      if (app.platform === Platform.GOOGLE_PLAY && !isGooglePlayConfigured()) {
        logger.warn(
          {app: app.name},
          'Skipping Google Play app - service account not configured',
        );
        continue;
      }

      if (app.platform === Platform.APP_STORE && !isAppStoreConfigured()) {
        logger.warn(
          {app: app.name},
          'Skipping App Store app - API key not configured',
        );
        continue;
      }

      newCount += await processApp(
        bot,
        app.platform,
        app.id,
        app.name,
        app.replyContext,
      );
    } catch (error) {
      logger.error(
        {error, app: app.name, platform: app.platform},
        'Error processing app reviews',
      );
    }
  }

  logger.info({newCount}, 'Review check complete');
  return newCount;
}

async function processApp(
  bot: Bot,
  platform: Platform,
  appId: string,
  appName: string,
  appContext: string,
): Promise<number> {
  const adapter = adapters[platform];
  const reviews = await adapter.fetchUnrespondedReviews(appId, appName);
  let newCount = 0;

  for (const review of reviews) {
    const dbId = makeReviewId(platform, appId, review.reviewId);
    if (reviewExists(dbId)) continue;

    try {
      await processReview(bot, review, dbId, appContext);
      newCount++;
    } catch (error) {
      logger.error(
        {error, reviewId: review.reviewId, appName},
        'Error processing individual review',
      );
    }

    // Throttle to avoid Telegram rate limits (1 msg/sec per chat).
    await sleep(1200);
  }

  if (newCount > 0) {
    logger.info({appName, platform, newCount}, 'Processed new reviews');
  }

  return newCount;
}

async function processReview(
  bot: Bot,
  review: NormalizedReview,
  dbId: string,
  appContext: string,
): Promise<void> {
  const translatedText = await translateText(
    review.originalText,
    review.reviewerLanguage,
  );

  const aiReply = await generateReply(
    {
      originalText: review.originalText,
      translatedText,
      starRating: review.starRating,
      reviewerLanguage: review.reviewerLanguage,
      platform: review.platform,
      appName: review.appName,
      authorName: review.authorName,
    },
    appContext,
  );

  insertReview({
    id: dbId,
    platform: review.platform,
    appId: review.appId,
    appName: review.appName,
    reviewId: review.reviewId,
    authorName: review.authorName,
    starRating: review.starRating,
    originalText: review.originalText,
    translatedText,
    reviewerLanguage: review.reviewerLanguage,
    territory: review.territory,
    generatedReply: aiReply.reply,
    replyTranslated: aiReply.replyTranslated,
    status: 'pending',
  });

  const storedReview = findReviewById(dbId);
  if (!storedReview) {
    throw new Error(`Failed to read back review ${dbId} after insert`);
  }

  const messageText = formatReviewMessage(storedReview);
  const keyboard = buildReviewKeyboard(dbId);

  const sent = await bot.api.sendMessage(env.TELEGRAM_CHAT_ID, messageText, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  });

  updateReviewTelegramMsg(dbId, sent.message_id, env.TELEGRAM_CHAT_ID);

  logger.info(
    {
      reviewId: review.reviewId,
      platform: review.platform,
      stars: review.starRating,
    },
    'Sent review notification to Telegram',
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
