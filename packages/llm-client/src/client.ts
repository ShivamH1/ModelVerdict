import OpenAI from 'openai';
import https from 'https';

const clientCache = new Map<string, OpenAI>();
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 32,
  keepAliveMsecs: 60000,
});

export function buildClient(provider: 'openrouter' | 'huggingface' | 'gemini', apiKey: string, customBaseUrl?: string) {
  const baseUrls = {
    openrouter: 'https://openrouter.ai/api/v1',
    huggingface: 'https://api-inference.huggingface.co/v1',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  };

  const baseURL = customBaseUrl || baseUrls[provider];
  const cacheKey = `${provider}:${apiKey}:${baseURL}`;

  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const client = new OpenAI({ 
    apiKey, 
    baseURL,
    timeout: 15000,
    httpAgent: keepAliveAgent,
    defaultHeaders: provider === 'openrouter' ? {
      'HTTP-Referer': 'https://veritas-arena.com',
      'X-Title': 'Veritas Arena',
    } : undefined
  });

  clientCache.set(cacheKey, client);
  return client;
}

