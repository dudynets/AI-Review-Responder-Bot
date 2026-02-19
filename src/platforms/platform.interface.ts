import type {NormalizedReview} from '../types/index.js';

export interface PlatformAdapter {
  readonly platformName: string;

  fetchUnrespondedReviews(
    appId: string,
    appName: string,
  ): Promise<NormalizedReview[]>;

  replyToReview(
    appId: string,
    reviewId: string,
    replyText: string,
  ): Promise<void>;
}
