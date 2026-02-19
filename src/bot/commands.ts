import type {Bot, Context} from 'grammy';
import {env} from '../config.js';
import {logger} from '../utils/logger.js';

export function registerCommands(bot: Bot, checkFn: () => Promise<void>): void {
  bot.command('start', async (ctx: Context) => {
    if (!isAuthorized(ctx)) return;

    await ctx.reply(
      '<b>AI Review Responder Bot</b>\n\n' +
        "I fetch reviews from Google Play and App Store that don't have a developer response, " +
        'generate AI-powered replies, and let you send them with one tap.\n\n' +
        '<b>Commands:</b>\n' +
        '/check \u2014 Check for new reviews now\n' +
        '/help \u2014 Show this help message\n\n' +
        '<b>How to use:</b>\n' +
        "1. I'll send you new reviews as they come in.\n" +
        '2. Tap <b>Send Reply</b> to submit the AI reply to the store.\n' +
        '3. Reply to any review message with comments to adjust the AI reply.\n' +
        "4. Tap <b>Skip</b> if you don't want to reply.",
      {parse_mode: 'HTML'},
    );
  });

  bot.command('help', async (ctx: Context) => {
    if (!isAuthorized(ctx)) return;

    await ctx.reply(
      '<b>Commands:</b>\n' +
        '/check \u2014 Check for new reviews now\n' +
        '/help \u2014 Show this message\n\n' +
        '<b>Adjusting replies:</b>\n' +
        'Reply to any review message with your comments (e.g. "make it shorter", ' +
        '"mention we\'re working on a fix") and I\'ll regenerate the reply.\n\n' +
        '<b>Polling:</b>\n' +
        `Reviews are automatically checked every ${env.POLLING_INTERVAL_MINUTES} minutes.`,
      {parse_mode: 'HTML'},
    );
  });

  bot.command('check', async (ctx: Context) => {
    if (!isAuthorized(ctx)) return;

    await ctx.reply('\u{1f50d} Checking for new reviews...');
    try {
      await checkFn();
      await ctx.reply('\u2705 Review check complete.');
    } catch (error) {
      logger.error({error}, 'Error during manual review check');
      await ctx.reply(
        '\u274c Error checking reviews. Check the logs for details.',
      );
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
