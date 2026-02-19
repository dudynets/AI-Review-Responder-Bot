import {logger} from '../utils/logger.js';
import type {PlatformAdapter} from './platform.interface.js';
import {Platform, type NormalizedReview} from '../types/index.js';

interface MockReviewSeed {
  authorName: string;
  starRating: number;
  originalText: string;
  reviewerLanguage: string;
  territory: string;
}

const MOCK_REVIEWS: MockReviewSeed[] = [
  {
    authorName: 'John Smith',
    starRating: 5,
    originalText:
      'Amazing app! Works perfectly and the UI is very intuitive. Highly recommend to everyone.',
    reviewerLanguage: 'en',
    territory: 'US',
  },
  {
    authorName: 'Hans Mueller',
    starRating: 2,
    originalText:
      'Die App stuerzt staendig ab wenn ich versuche mich einzuloggen. Sehr frustrierend, bitte beheben Sie das Problem.',
    reviewerLanguage: 'de',
    territory: 'DE',
  },
  {
    authorName: 'Yuki Tanaka',
    starRating: 4,
    originalText:
      '\u3068\u3066\u3082\u4fbf\u5229\u306a\u30a2\u30d7\u30ea\u3067\u3059\u304c\u3001\u30c0\u30fc\u30af\u30e2\u30fc\u30c9\u304c\u3042\u308c\u3070\u3082\u3063\u3068\u826f\u3044\u3068\u601d\u3044\u307e\u3059\u3002',
    reviewerLanguage: 'ja',
    territory: 'JP',
  },
  {
    authorName: 'Maria Garcia',
    starRating: 1,
    originalText:
      'La peor aplicacion que he usado. Se congela todo el tiempo y perdi todos mis datos. Quiero un reembolso.',
    reviewerLanguage: 'es',
    territory: 'ES',
  },
  {
    authorName: 'Pierre Dubois',
    starRating: 3,
    originalText:
      "L'application est correcte mais il manque beaucoup de fonctionnalites par rapport a la concurrence. Le design est agreable cependant.",
    reviewerLanguage: 'fr',
    territory: 'FR',
  },
];

export class MockAdapter implements PlatformAdapter {
  readonly platformName = 'Mock';

  async fetchUnrespondedReviews(
    appId: string,
    appName: string,
  ): Promise<NormalizedReview[]> {
    const shuffled = [...MOCK_REVIEWS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 1);

    const reviews: NormalizedReview[] = selected.map((seed, i) => ({
      reviewId: `mock-${Date.now()}-${i}`,
      platform: Platform.MOCK,
      appId,
      appName,
      authorName: seed.authorName,
      starRating: seed.starRating,
      originalText: seed.originalText,
      translatedText: null,
      reviewerLanguage: seed.reviewerLanguage,
      territory: seed.territory,
    }));

    logger.info(
      {appId, count: reviews.length},
      'Generated mock reviews for testing',
    );

    return reviews;
  }

  async replyToReview(
    appId: string,
    reviewId: string,
    replyText: string,
  ): Promise<void> {
    logger.info(
      {appId, reviewId, replyLength: replyText.length},
      'Mock reply submitted (no-op)',
    );
  }
}
