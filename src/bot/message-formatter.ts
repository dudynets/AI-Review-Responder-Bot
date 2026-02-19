import {InlineKeyboard} from 'grammy';
import type {ReviewRow} from '../db/schema.js';
import {preferredLanguageName} from '../config.js';

function renderStars(rating: number): string {
  return '⭐'.repeat(rating);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function platformLabel(platform: string): string {
  if (platform === 'google_play') return 'Google Play';
  if (platform === 'mock') return 'Mock Store';
  return 'App Store';
}

export function formatReviewMessage(review: ReviewRow): string {
  const stars = renderStars(review.starRating);
  const pLabel = platformLabel(review.platform);

  let msg = '';
  msg += `<b>${pLabel} | ${stars} (${review.starRating}/5)</b>\n`;
  msg += `<b>App:</b> ${escapeHtml(review.appName)}\n`;
  msg += `<b>By:</b> ${escapeHtml(review.authorName ?? 'Anonymous')}\n`;
  msg += `\n`;

  msg += `<b>Review:</b>\n`;
  msg += `<i>${escapeHtml(review.originalText)}</i>\n`;

  if (review.translatedText) {
    msg += `\n<b>Review in ${preferredLanguageName}:</b>\n`;
    msg += `<i>${escapeHtml(review.translatedText)}</i>\n`;
  }

  if (review.generatedReply) {
    msg += `\n${'-'.repeat(3)}\n\n`;
    msg += `<b>Reply:</b>\n`;
    msg += `<i>${escapeHtml(review.generatedReply)}</i>\n`;

    if (
      review.replyTranslated &&
      review.replyTranslated !== review.generatedReply
    ) {
      msg += `\n<b>Reply in ${preferredLanguageName}:</b>\n`;
      msg += `<i>${escapeHtml(review.replyTranslated)}</i>\n`;
    }
  }

  msg += `\nReply to this message with comments to adjust the reply.`;

  return msg;
}

export function formatRepliedMessage(review: ReviewRow): string {
  const stars = renderStars(review.starRating);
  const pLabel = platformLabel(review.platform);

  let msg = '';
  msg += `<b>${pLabel} | ${stars} (${review.starRating}/5)</b>\n`;
  msg += `<b>App:</b> ${escapeHtml(review.appName)}\n`;
  msg += `<b>By:</b> ${escapeHtml(review.authorName ?? 'Anonymous')}\n`;
  msg += `\n`;

  msg += `<b>Review:</b>\n`;
  msg += `<i>${escapeHtml(review.originalText)}</i>\n`;

  if (review.translatedText) {
    msg += `\n<b>Review in ${preferredLanguageName}:</b>\n`;
    msg += `<i>${escapeHtml(review.translatedText)}</i>\n`;
  }

  msg += `\n${'-'.repeat(3)}\n\n`;

  msg += `<b>Reply:</b>\n`;
  msg += `<i>${escapeHtml(review.generatedReply ?? '')}</i>\n`;

  if (
    review.replyTranslated &&
    review.replyTranslated !== review.generatedReply
  ) {
    msg += `\n<b>Reply in ${preferredLanguageName}:</b>\n`;
    msg += `<i>${escapeHtml(review.replyTranslated ?? '')}</i>\n`;
  }

  msg += `\n✅ Reply sent successfully!`;

  return msg;
}

export function buildReviewKeyboard(reviewDbId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text('✅ Send Reply', `reply:${reviewDbId}`)
    .text('❌ Skip', `skip:${reviewDbId}`);
}
