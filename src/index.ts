import {bot} from './bot/bot.js';
import {registerCommands} from './bot/commands.js';
import {registerCallbacks} from './bot/callbacks.js';
import {registerReplyHandler} from './bot/reply-handler.js';
import {startScheduler, stopScheduler} from './services/scheduler.service.js';
import {processAllApps} from './services/review-processor.service.js';
import {logger} from './utils/logger.js';

// Side-effect import: initializes the database.
import './db/connection.js';

const checkFn = () => processAllApps(bot);

registerCommands(bot, checkFn);
registerCallbacks(bot);
registerReplyHandler(bot);

async function main(): Promise<void> {
  logger.info('Starting AI Review Responder Bot...');

  bot.start({
    onStart: (botInfo) => {
      logger.info({username: botInfo.username}, 'Telegram bot started');
    },
  });

  startScheduler(bot);

  logger.info('Running initial review check...');
  try {
    await processAllApps(bot);
  } catch (error) {
    logger.error({error}, 'Initial review check failed (non-fatal)');
  }
}

function shutdown(signal: string): void {
  logger.info({signal}, 'Shutting down...');
  stopScheduler();
  bot.stop();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({reason}, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({error}, 'Uncaught exception');
  shutdown('uncaughtException');
});

main().catch((error) => {
  logger.error({error}, 'Fatal startup error');
  process.exit(1);
});
