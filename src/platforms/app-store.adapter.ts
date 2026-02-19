import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import jwt from 'jsonwebtoken';
import {env} from '../config.js';
import {logger} from '../utils/logger.js';
import type {PlatformAdapter} from './platform.interface.js';
import {Platform, type NormalizedReview} from '../types/index.js';

interface ASCReview {
  type: 'customerReviews';
  id: string;
  attributes: {
    rating: number;
    title: string | null;
    body: string;
    reviewerNickname: string;
    createdDate: string;
    territory: string;
  };
}

interface ASCReviewsResponse {
  data: ASCReview[];
  links?: {next?: string};
}

export class AppStoreAdapter implements PlatformAdapter {
  readonly platformName = 'App Store';
  private privateKey: string | null = null;

  private static readonly BASE_URL = 'https://api.appstoreconnect.apple.com';

  private getPrivateKey(): string {
    if (this.privateKey) return this.privateKey;
    const keyPath = resolve(env.APP_STORE_PRIVATE_KEY_FILE);
    this.privateKey = readFileSync(keyPath, 'utf-8');
    return this.privateKey;
  }

  private generateToken(): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: env.APP_STORE_ISSUER_ID,
      iat: now,
      exp: now + 20 * 60,
      aud: 'appstoreconnect-v1',
    };

    return jwt.sign(payload, this.getPrivateKey(), {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: env.APP_STORE_KEY_ID,
        typ: 'JWT',
      },
    });
  }

  private async request<T>(url: string, init?: RequestInit): Promise<T> {
    const token = this.generateToken();
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`App Store Connect API error ${res.status}: ${body}`);
    }

    return res.json() as Promise<T>;
  }

  async fetchUnrespondedReviews(
    appId: string,
    appName: string,
  ): Promise<NormalizedReview[]> {
    const unresponded: NormalizedReview[] = [];

    let url: string | null =
      `${AppStoreAdapter.BASE_URL}/v1/apps/${appId}/customerReviews` +
      `?exists[publishedResponse]=false` +
      `&sort=-createdDate` +
      `&limit=50` +
      `&fields[customerReviews]=rating,title,body,reviewerNickname,createdDate,territory`;

    while (url) {
      const res: ASCReviewsResponse =
        await this.request<ASCReviewsResponse>(url);

      for (const review of res.data) {
        unresponded.push(this.normalize(review, appId, appName));
      }

      url = res.links?.next ?? null;

      // Cap at 200 reviews per run to avoid runaway pagination on first use.
      if (unresponded.length >= 200) break;
    }

    logger.info(
      {appId, count: unresponded.length},
      'Fetched unresponded App Store reviews',
    );

    return unresponded;
  }

  async replyToReview(
    _appId: string,
    reviewId: string,
    replyText: string,
  ): Promise<void> {
    const trimmed = replyText.slice(0, 5970);

    const body = {
      data: {
        type: 'customerReviewResponses',
        attributes: {
          responseBody: trimmed,
        },
        relationships: {
          review: {
            data: {
              type: 'customerReviews',
              id: reviewId,
            },
          },
        },
      },
    };

    await this.request<unknown>(
      `${AppStoreAdapter.BASE_URL}/v1/customerReviewResponses`,
      {method: 'POST', body: JSON.stringify(body)},
    );

    logger.info({reviewId}, 'Replied to App Store review');
  }

  private normalize(
    review: ASCReview,
    appId: string,
    appName: string,
  ): NormalizedReview {
    const attrs = review.attributes;
    const fullText = attrs.title ? `${attrs.title}\n${attrs.body}` : attrs.body;

    return {
      reviewId: review.id,
      platform: Platform.APP_STORE,
      appId,
      appName,
      authorName: attrs.reviewerNickname ?? 'Anonymous',
      starRating: attrs.rating,
      originalText: fullText,
      translatedText: null,
      reviewerLanguage: 'auto',
      territory: attrs.territory ?? 'USA',
    };
  }
}
