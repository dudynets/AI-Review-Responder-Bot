import type {Bot, Context} from 'grammy';
import {env} from '../config.js';
import {logger} from '../utils/logger.js';

export function registerCommands(
  bot: Bot,
  checkFn: () => Promise<number>,
): void {
  bot.command('start', async (ctx: Context) => {
    if (!isAuthorized(ctx)) return;

    await ctx.reply(
      '*AI Review Responder Bot*\n\n' +
        "I fetch reviews from Google Play and App Store that don't have a developer response, " +
        'generate AI\\-powered replies, and let you send them with one tap\\.\n\n' +
        '*Commands:*\n' +
        '/check \\- Check for new reviews now\n' +
        '/help \\- Show this help message\n\n' +
        '*How to use:*\n' +
        "1\\. I'll send you new reviews as they come in\\.\n" +
        '2\\. Tap *Send Reply* to submit the AI reply to the store\\.\n' +
        '3\\. Reply to any review message with comments to adjust the AI reply\\.\n' +
        "4\\. Tap *Skip* if you don't want to reply\\.",
      {parse_mode: 'MarkdownV2'},
    );
  });

  bot.command('help', async (ctx: Context) => {
    if (!isAuthorized(ctx)) return;

    await ctx.reply(
      '*Commands:*\n' +
        '/check \\- Check for new reviews now\n' +
        '/help \\- Show this message\n\n' +
        '*Adjusting replies:*\n' +
        'Reply to any review message with your comments \\(e\\.g\\. "make it shorter", ' +
        '"mention we\'re working on a fix"\\) and I\'ll regenerate the reply\\.\n\n' +
        '*Polling:*\n' +
        `Reviews are automatically checked every ${env.POLLING_INTERVAL_MINUTES} minutes\\.`,
      {parse_mode: 'MarkdownV2'},
    );
  });

  bot.command('check', async (ctx: Context) => {
    if (!isAuthorized(ctx)) return;

    await ctx.reply('🔍 Checking for new reviews...');
    try {
      const count = await checkFn();

      if (count > 0) {
        await ctx.reply(
          `✅ Found ${count} new ${count === 1 ? 'review' : 'reviews'}`,
        );
      } else {
        await ctx.reply('No new reviews found');
      }
    } catch (error) {
      logger.error({error}, 'Error during manual review check');
      await ctx.reply('❌ Error checking reviews. Check the logs for details');
    }
  });
}

function isAuthorized(ctx: Context): boolean {
  const chatId = ctx.chat?.id?.toString();
  if (chatId !== env.TELEGRAM_CHAT_ID) {
    logger.warn(
      {chatId, expected: env.TELEGRAM_CHAT_ID},
      'Unauthorized access attempt',
    );
    return false;
  }
  return true;
}
