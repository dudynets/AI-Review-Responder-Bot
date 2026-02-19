export const Platform = {
  GOOGLE_PLAY: 'google_play',
  APP_STORE: 'app_store',
  MOCK: 'mock',
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

export const ReviewStatus = {
  PENDING: 'pending',
  REPLIED: 'replied',
  SKIPPED: 'skipped',
} as const;

export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export interface NormalizedReview {
  reviewId: string;
  platform: Platform;
  /** Package name (Google Play) or numeric app ID (App Store). */
  appId: string;
  appName: string;
  authorName: string;
  starRating: number;
  originalText: string;
  /** Null when the review is already in the preferred language. */
  translatedText: string | null;
  /** BCP-47 language code (e.g. "de", "ja"), or "auto" when unknown. */
  reviewerLanguage: string;
  territory: string | null;
}

export interface StoredReview extends NormalizedReview {
  /** Composite key: "{platform}:{appId}:{reviewId}" */
  id: string;
  generatedReply: string | null;
  replyTranslated: string | null;
  telegramMsgId: number | null;
  telegramChatId: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AppConfig {
  name: string;
  platform: Platform;
  /** Package name (Google Play) or numeric app ID (App Store). */
  id: string;
  replyContext: string;
}

export interface GeneratedReply {
  /** Reply in the reviewer's language (sent to the store). */
  reply: string;
  /** Translation in the bot operator's preferred language. */
  replyTranslated: string;
}
