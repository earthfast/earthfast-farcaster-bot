import OpenAI from 'openai';
import { OPENROUTER_API_KEY } from './config';

if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not defined');
}

// AI MODEL to use for prompt generation
export const AI_MODEL = 'openai/gpt-4o-2024-11-20';

// Initialize OpenRouter client
export const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_API_KEY,
    defaultHeaders: {
      'X-Title': 'PagePlex',
    },
});

