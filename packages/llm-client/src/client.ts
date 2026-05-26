import OpenAI from 'openai';

export function buildClient(provider: 'openrouter' | 'huggingface', apiKey: string, customBaseUrl?: string) {
  const baseUrls = {
    openrouter: 'https://openrouter.ai/api/v1',
    huggingface: 'https://api-inference.huggingface.co/v1',
  };

  return new OpenAI({ 
    apiKey, 
    baseURL: customBaseUrl || baseUrls[provider],
    defaultHeaders: provider === 'openrouter' ? {
      'HTTP-Referer': 'https://veritas-arena.com',
      'X-Title': 'Veritas Arena',
    } : undefined
  });
}
