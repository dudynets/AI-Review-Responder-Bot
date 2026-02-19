import type {Bot, Context} from 'grammy';
import {logger} from '../utils/logger.js';
import {
  findReviewById,
  markReviewReplied,
  markReviewSkipped,
} from '../db/review.repository.js';
import {formatRepliedMessage} from './message-formatter.js';
import {GooglePlayAdapter} from '../platforms/google-play.adapter.js';
import {AppStoreAdapter} from '../platforms/app-store.adapter.js';
import {MockAdapter} from '../platforms/mock.adapter.js';
import type {PlatformAdapter} from '../platforms/platform.interface.js';
import type {Platform} from '../types/index.js';

const adapters: Record<Platform, PlatformAdapter> = {
  google_play: new GooglePlayAdapter(),
  app_store: new AppStoreAdapter(),
  mock: new MockAdapter(),
};

export function registerCallbacks(bot: Bot): void {
  bot.callbackQuery(/^reply:(.+)$/, async (ctx: Context) => {
    const reviewDbId = ctx.match?.[1];
    if (!reviewDbId) return;

    try {
      const review = findReviewById(reviewDbId);
      if (!review) {
        await ctx.answerCallbackQuery({
          text: 'Review not found in database.',
        });
        return;
      }

      if (review.status === 'replied') {
        await ctx.answerCallbackQuery({
          text: 'Already replied to this review.',
        });
        return;
      }

      if (!review.generatedReply) {
        await ctx.answerCallbackQuery({
          text: 'No generated reply available.',
        });
        return;
      }

      const adapter = adapters[review.platform as Platform];
      await adapter.replyToReview(
        review.appId,
        review.reviewId,
        review.generatedReply,
      );

      markReviewReplied(reviewDbId);

      const updatedReview = findReviewById(reviewDbId);
      if (updatedReview) {
        const newText = formatRepliedMessage(updatedReview);
        await ctx.editMessageText(newText, {
          parse_mode: 'HTML',
          reply_markup: undefined,
        });
      }

      await ctx.answerCallbackQuery({text: 'Reply sent!'});
      logger.info(
        {reviewDbId, platform: review.platform},
        'Reply submitted to store',
      );
    } catch (error) {
      logger.error({error, reviewDbId}, 'Failed to submit reply');
      await ctx.answerCallbackQuery({
        text: 'Failed to send reply. Check logs.',
        show_alert: true,
      });
    }
  });

  bot.callbackQuery(/^skip:(.+)$/, async (ctx: Context) => {
    const reviewDbId = ctx.match?.[1];
    if (!reviewDbId) return;

    try {
      const review = findReviewById(reviewDbId);
      if (!review) {
        await ctx.answerCallbackQuery({text: 'Review not found.'});
        return;
      }

      markReviewSkipped(reviewDbId);

      await ctx.editMessageText(
        ctx.callbackQuery?.message?.text
          ? ctx.callbackQuery.message.text + '\n\n\u23ed Skipped.'
          : '\u23ed Skipped.',
        {reply_markup: undefined},
      );

      await ctx.answerCallbackQuery({text: 'Review skipped.'});
    } catch (error) {
      logger.error({error, reviewDbId}, 'Failed to skip review');
      await ctx.answerCallbackQuery({
        text: 'Error skipping review.',
        show_alert: true,
      });
    }
  });
}
