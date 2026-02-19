import type {Bot, Context} from 'grammy';
import {env, apps} from '../config.js';
import {logger} from '../utils/logger.js';
import {
  findReviewByTelegramMsg,
  findReviewById,
  updateReviewReply,
} from '../db/review.repository.js';
import {generateReply} from '../services/ai.service.js';
import {formatReviewMessage, buildReviewKeyboard} from './message-formatter.js';
import type {Platform} from '../types/index.js';

export function registerReplyHandler(bot: Bot): void {
  bot.on('message:text', async (ctx: Context) => {
    const replyTo = ctx.message?.reply_to_message;
    if (!replyTo) return;

    const chatId = ctx.chat?.id?.toString();
    if (chatId !== env.TELEGRAM_CHAT_ID) return;

    const review = findReviewByTelegramMsg(replyTo.message_id, chatId);
    if (!review) return;

    if (review.status === 'replied') {
      await ctx.reply('This review has already been replied to.', {
        reply_to_message_id: ctx.message?.message_id,
      });
      return;
    }

    const adjustmentComments = ctx.message!.text;
    const appConfig = apps.find(
      (a) => a.id === review.appId && a.platform === review.platform,
    );

    try {
      await ctx.reply('\u{1f504} Regenerating reply...', {
        reply_to_message_id: ctx.message?.message_id,
      });

      const result = await generateReply(
        {
          originalText: review.originalText,
          translatedText: review.translatedText,
          starRating: review.starRating,
          reviewerLanguage: review.reviewerLanguage ?? 'en',
          platform: review.platform as Platform,
          appName: review.appName,
          authorName: review.authorName ?? 'Anonymous',
        },
        appConfig?.replyContext ?? '',
        review.generatedReply ?? undefined,
        adjustmentComments,
      );

      updateReviewReply(review.id, result.reply, result.replyTranslated);

      const updatedReview = findReviewById(review.id);
      if (!updatedReview) return;

      const newText = formatReviewMessage(updatedReview);
      const keyboard = buildReviewKeyboard(review.id);

      await ctx.api.editMessageText(chatId, replyTo.message_id, newText, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });

      await ctx.reply('\u2705 Reply updated!', {
        reply_to_message_id: ctx.message?.message_id,
      });

      logger.info(
        {reviewId: review.id},
        'Regenerated reply with user comments',
      );
    } catch (error) {
      logger.error({error, reviewId: review.id}, 'Failed to regenerate reply');
      await ctx.reply(
        '\u274c Failed to regenerate reply. Check logs for details.',
        {reply_to_message_id: ctx.message?.message_id},
      );
    }
  });
}
