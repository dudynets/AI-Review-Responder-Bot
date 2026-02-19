import OpenAI from 'openai';
import {env, preferredLanguageName} from '../config.js';
import {logger} from '../utils/logger.js';
import type {GeneratedReply, Platform} from '../types/index.js';

const CHAR_LIMITS: Record<Platform, number> = {
  google_play: 350,
  app_store: 5970,
  mock: 350,
};

const client = new OpenAI({apiKey: env.OPENAI_API_KEY});

export async function generateReply(
  review: {
    originalText: string;
    translatedText: string | null;
    starRating: number;
    reviewerLanguage: string;
    platform: Platform;
    appName: string;
    authorName: string;
  },
  appContext: string,
  previousReply?: string,
  adjustmentComments?: string,
): Promise<GeneratedReply> {
  const charLimit = CHAR_LIMITS[review.platform];

  const systemPrompt = buildSystemPrompt(
    review.appName,
    appContext,
    review.platform,
    charLimit,
  );

  const userPrompt = buildUserPrompt(review, previousReply, adjustmentComments);

  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    ...(env.OPENAI_REASONING_EFFORT && {
      reasoning_effort: env.OPENAI_REASONING_EFFORT,
    }),
    ...(env.OPENAI_VERBOSITY && {verbosity: env.OPENAI_VERBOSITY}),
    response_format: {type: 'json_object'},
    messages: [
      {role: 'system', content: systemPrompt},
      {role: 'user', content: userPrompt},
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response');
  }

  const parsed = JSON.parse(content) as {
    reply: string;
    replyTranslated: string;
  };

  parsed.reply = parsed.reply.slice(0, charLimit);

  logger.info(
    {
      reviewerLang: review.reviewerLanguage,
      replyLength: parsed.reply.length,
      charLimit,
    },
    'Generated AI reply',
  );

  return {
    reply: parsed.reply,
    replyTranslated: parsed.replyTranslated,
  };
}

export async function translateText(
  text: string,
  fromLang: string,
): Promise<string | null> {
  if (fromLang === env.PREFERRED_LANGUAGE) return null;

  const response = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    ...(env.OPENAI_REASONING_EFFORT && {
      reasoning_effort: env.OPENAI_REASONING_EFFORT,
    }),
    ...(env.OPENAI_VERBOSITY && {verbosity: env.OPENAI_VERBOSITY}),
    messages: [
      {
        role: 'system',
        content:
          `You are a precise translator. Translate the following text to ${preferredLanguageName}. ` +
          `If the text is already in ${preferredLanguageName}, return it unchanged. ` +
          'Return ONLY the translated text, nothing else.',
      },
      {role: 'user', content: text},
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? null;
}

const PLATFORM_LABELS: Record<Platform, string> = {
  google_play: 'Google Play Store',
  app_store: 'Apple App Store',
  mock: 'Mock Store',
};

function buildSystemPrompt(
  appName: string,
  appContext: string,
  platform: Platform,
  charLimit: number,
): string {
  return `You are a professional app developer replying to user reviews on the ${PLATFORM_LABELS[platform]}.

App: ${appName}
${appContext ? `Context: ${appContext}` : ''}

RULES:
1. Reply in the SAME LANGUAGE as the original review.
2. Be professional, empathetic, and constructive.
3. Address specific concerns mentioned in the review.
4. For positive reviews: thank the user sincerely without being sycophantic.
5. For negative reviews: apologize for the bad experience, acknowledge the issue, and mention that feedback is being considered.
6. Do NOT promise specific features or timelines.
7. Keep the reply under ${charLimit} characters (this is a hard platform limit).
8. Do NOT include any greeting like "Dear user" - be concise and direct.

OUTPUT FORMAT:
Respond with a JSON object containing exactly two fields:
{
  "reply": "The reply in the reviewer's language",
  "replyTranslated": "The ${preferredLanguageName} translation of the reply (if the reply is already in ${preferredLanguageName}, set this to the same value as reply)"
}`;
}

function buildUserPrompt(
  review: {
    originalText: string;
    translatedText: string | null;
    starRating: number;
    reviewerLanguage: string;
    authorName: string;
  },
  previousReply?: string,
  adjustmentComments?: string,
): string {
  let prompt = `Review (${review.starRating}/5 stars) by ${review.authorName}:
Language: ${review.reviewerLanguage === 'auto' ? 'auto-detect from review text' : review.reviewerLanguage}

Original text:
"${review.originalText}"`;

  if (review.translatedText) {
    prompt += `\n\n${preferredLanguageName} translation:\n"${review.translatedText}"`;
  }

  if (previousReply && adjustmentComments) {
    prompt += `\n\n--- REVISION REQUEST ---
Previous reply:
"${previousReply}"

Adjustment comments from the developer:
"${adjustmentComments}"

Please generate a revised reply incorporating these comments while following all the rules above.`;
  }

  return prompt;
}
