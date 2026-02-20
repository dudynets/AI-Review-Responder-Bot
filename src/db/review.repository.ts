import {eq, and} from 'drizzle-orm';
import {db} from './connection.js';
import {reviews, type ReviewRow, type NewReviewRow} from './schema.js';

export function makeCompositeKey(
  platform: string,
  appId: string,
  reviewId: string,
): string {
  return `${platform}:${appId}:${reviewId}`;
}

export function findReviewById(id: number): ReviewRow | undefined {
  return db.select().from(reviews).where(eq(reviews.id, id)).get();
}

export function findReviewByCompositeKey(
  compositeKey: string,
): ReviewRow | undefined {
  return db
    .select()
    .from(reviews)
    .where(eq(reviews.compositeKey, compositeKey))
    .get();
}

export function findReviewByTelegramMsg(
  msgId: number,
  chatId: string,
): ReviewRow | undefined {
  return db
    .select()
    .from(reviews)
    .where(
      and(eq(reviews.telegramMsgId, msgId), eq(reviews.telegramChatId, chatId)),
    )
    .get();
}

export function reviewExists(compositeKey: string): boolean {
  return findReviewByCompositeKey(compositeKey) !== undefined;
}

export function insertReview(data: NewReviewRow): ReviewRow {
  return db.insert(reviews).values(data).returning().get();
}

export function updateReviewReply(
  id: number,
  generatedReply: string,
  replyTranslated: string,
): void {
  db.update(reviews)
    .set({
      generatedReply,
      replyTranslated,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reviews.id, id))
    .run();
}

export function updateReviewTelegramMsg(
  id: number,
  telegramMsgId: number,
  telegramChatId: string,
): void {
  db.update(reviews)
    .set({
      telegramMsgId,
      telegramChatId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reviews.id, id))
    .run();
}

export function markReviewReplied(id: number): void {
  db.update(reviews)
    .set({
      status: 'replied',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reviews.id, id))
    .run();
}

export function markReviewSkipped(id: number): void {
  db.update(reviews)
    .set({
      status: 'skipped',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reviews.id, id))
    .run();
}
