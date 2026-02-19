import {sqliteTable, text, integer} from 'drizzle-orm/sqlite-core';

export const reviews = sqliteTable('reviews', {
  /** Composite key: "{platform}:{appId}:{reviewId}" */
  id: text('id').primaryKey(),
  platform: text('platform').notNull(),
  appId: text('app_id').notNull(),
  appName: text('app_name').notNull(),
  reviewId: text('review_id').notNull(),
  authorName: text('author_name').default('Anonymous'),
  starRating: integer('star_rating').notNull(),
  originalText: text('original_text').notNull(),
  translatedText: text('translated_text'),
  reviewerLanguage: text('reviewer_language').default('en'),
  territory: text('territory'),
  generatedReply: text('generated_reply'),
  replyTranslated: text('reply_translated'),
  telegramMsgId: integer('telegram_msg_id'),
  telegramChatId: text('telegram_chat_id'),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export type ReviewRow = typeof reviews.$inferSelect;
export type NewReviewRow = typeof reviews.$inferInsert;
