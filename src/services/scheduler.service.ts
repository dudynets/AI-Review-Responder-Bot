import * as cron from 'node-cron';
import type {Bot} from 'grammy';
import {env} from '../config.js';
import {logger} from '../utils/logger.js';
import {processAllApps} from './review-processor.service.js';

let task: cron.ScheduledTask | null = null;

export function startScheduler(bot: Bot): void {
  const intervalMinutes = env.POLLING_INTERVAL_MINUTES;
  const cronExpression = `*/${intervalMinutes} * * * *`;

  task = cron.schedule(cronExpression, async () => {
    logger.info('Scheduled review check triggered');
    try {
      await processAllApps(bot);
    } catch (error) {
      logger.error({error}, 'Scheduled review check failed');
    }
  });

  logger.info(
    {intervalMinutes, cronExpression},
    'Review polling scheduler started',
  );
}

export function stopScheduler(): void {
  if (task) {
    task.stop();
    task = null;
    logger.info('Review polling scheduler stopped');
  }
}
