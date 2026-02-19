import {Bot} from 'grammy';
import {env} from '../config.js';
import {logger} from '../utils/logger.js';

export const bot = new Bot(env.TELEGRAM_BOT_TOKEN);

bot.catch((err) => {
  logger.error({error: err.error, ctx: err.ctx?.update}, 'Bot error');
});
