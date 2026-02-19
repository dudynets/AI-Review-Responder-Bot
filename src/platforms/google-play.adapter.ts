import {resolve} from 'node:path';
import {google, type androidpublisher_v3} from 'googleapis';
import {env} from '../config.js';
import {logger} from '../utils/logger.js';
import type {PlatformAdapter} from './platform.interface.js';
import {Platform, type NormalizedReview} from '../types/index.js';

type ReviewResource = androidpublisher_v3.Schema$Review;
type Comment = androidpublisher_v3.Schema$Comment;

export class GooglePlayAdapter implements PlatformAdapter {
  readonly platformName = 'Google Play';
  private api: androidpublisher_v3.Androidpublisher | null = null;

  private async getApi(): Promise<androidpublisher_v3.Androidpublisher> {
    if (this.api) return this.api;

    const keyFilePath = resolve(env.GOOGLE_PLAY_KEY_FILE);
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    this.api = google.androidpublisher({version: 'v3', auth});
    logger.info('Google Play API client initialized');
    return this.api;
  }

  async fetchUnrespondedReviews(
    appId: string,
    appName: string,
  ): Promise<NormalizedReview[]> {
    const api = await this.getApi();
    const unresponded: NormalizedReview[] = [];
    let nextPageToken: string | undefined;

    do {
      const res = await api.reviews.list({
        packageName: appId,
        maxResults: 100,
        token: nextPageToken,
      });

      const reviews = res.data.reviews ?? [];

      for (const review of reviews) {
        if (this.hasDeveloperReply(review)) continue;

        const normalized = this.normalize(review, appId, appName);
        if (normalized) unresponded.push(normalized);
      }

      nextPageToken = res.data.tokenPagination?.nextPageToken ?? undefined;
    } while (nextPageToken);

    logger.info(
      {appId, count: unresponded.length},
      'Fetched unresponded Google Play reviews',
    );

    return unresponded;
  }

  async replyToReview(
    appId: string,
    reviewId: string,
    replyText: string,
  ): Promise<void> {
    const api = await this.getApi();
    const trimmed = replyText.slice(0, 350);

    await api.reviews.reply({
      packageName: appId,
      reviewId,
      requestBody: {replyText: trimmed},
    });

    logger.info({appId, reviewId}, 'Replied to Google Play review');
  }

  private hasDeveloperReply(review: ReviewResource): boolean {
    const comments: Comment[] = review.comments ?? [];
    return comments.some((c) => c.developerComment != null);
  }

  private normalize(
    review: ReviewResource,
    appId: string,
    appName: string,
  ): NormalizedReview | null {
    const userComment = review.comments?.[0]?.userComment;
    if (!userComment) return null;

    return {
      reviewId: review.reviewId ?? '',
      platform: Platform.GOOGLE_PLAY,
      appId,
      appName,
      authorName: review.authorName ?? 'Anonymous',
      starRating: userComment.starRating ?? 0,
      originalText: userComment.text ?? '',
      translatedText: null,
      reviewerLanguage: userComment.reviewerLanguage ?? 'auto',
      territory: null,
    };
  }
}
