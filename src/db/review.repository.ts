import {eq, and} from 'drizzle-orm';
import {db} from './connection.js';
import {reviews, type ReviewRow, type NewReviewRow} from './schema.js';

export function makeReviewId(
  platform: string,
  appId: string,
  reviewId: string,
): string {
  return `${platform}:${appId}:${reviewId}`;
}

export function findReviewById(id: string): ReviewRow | undefined {
  return db.select().from(reviews).where(eq(reviews.id, id)).get();
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

export function reviewExists(id: string): boolean {
  return findReviewById(id) !== undefined;
}

export function insertReview(data: NewReviewRow): void {
  db.insert(reviews).values(data).run();
}

export function updateReviewReply(
  id: string,
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
  id: string,
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

export function markReviewReplied(id: string): void {
  db.update(reviews)
    .set({
      status: 'replied',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reviews.id, id))
    .run();
}

export function markReviewSkipped(id: string): void {
  db.update(reviews)
    .set({
      status: 'skipped',
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reviews.id, id))
    .run();
}
