import {InlineKeyboard} from 'grammy';
import type {ReviewRow} from '../db/schema.js';
import {preferredLanguageName} from '../config.js';

function renderStars(rating: number): string {
  return '⭐'.repeat(rating);
}

export function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function blockquote(text: string): string {
  return text
    .split('\n')
    .map((line) => `>${line}`)
    .join('\n');
}

function platformLabel(platform: string): string {
  if (platform === 'google_play') return 'Google Play';
  if (platform === 'mock') return 'Mock Store';
  return 'App Store';
}

type MessageStatus = 'pending' | 'replied' | 'skipped';

function formatMessage(review: ReviewRow, status: MessageStatus): string {
  const stars = renderStars(review.starRating);
  const pLabel = platformLabel(review.platform);
  const e = escapeMarkdownV2;

  let msg = '';
  msg += `*${e(`${pLabel} | ${stars} (${review.starRating}/5)`)}*\n`;
  msg += `*App:* ${e(review.appName)}\n`;
  msg += `*By:* ${e(review.authorName ?? 'Anonymous')}\n`;

  msg += `\n*Review:*\n`;
  msg += `${blockquote(e(review.originalText.trim()))}\n`;

  if (review.translatedText) {
    msg += `\n\n*${e(`Review in ${preferredLanguageName}:`)}*\n`;
    msg += `${blockquote(e((review.translatedText ?? '').trim()))}\n`;
  }

  if (status === 'replied' || review.generatedReply) {
    msg += `\n\n*Reply:*\n`;
    msg += `${blockquote(e((review.generatedReply ?? '').trim()))}\n`;

    if (
      review.replyTranslated &&
      review.replyTranslated !== review.generatedReply
    ) {
      msg += `\n\n*${e(`Reply in ${preferredLanguageName}:`)}*\n`;
      msg += `${blockquote(e((review.replyTranslated ?? '').trim()))}\n`;
    }
  }

  switch (status) {
    case 'replied':
      msg += `\n\n${e('✅ Reply sent successfully!')}`;
      break;
    case 'skipped':
      msg += `\n\n${e('❌ Skipped')}`;
      break;
    default:
      msg += `\n\n${e('Reply to this message with comments to adjust the reply.')}`;
      break;
  }

  return msg;
}

export function formatReviewMessage(review: ReviewRow): string {
  return formatMessage(review, 'pending');
}

export function formatRepliedMessage(review: ReviewRow): string {
  return formatMessage(review, 'replied');
}

export function formatSkippedMessage(review: ReviewRow): string {
  return formatMessage(review, 'skipped');
}

export function buildReviewKeyboard(reviewDbId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text(
      {
        text: 'Skip',
        style: 'danger',
      },
      `skip:${reviewDbId}`,
    )
    .text(
      {
        text: 'Send Reply',
        style: 'success',
      },
      `reply:${reviewDbId}`,
    );
}
