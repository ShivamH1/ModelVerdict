import { ModelConfig, ChatMessage } from '@veritas/shared';
import { buildClient } from './client';

export interface GenerationResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  latencyMs: number;
  provider: 'openrouter' | 'huggingface' | 'custom';
}

interface GenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  customApiKey?: string;
  customBaseUrl?: string;
  customModelName?: string;
  responseFormat?: 'json_object' | 'text';
  onRetry?: (attempt: number, provider: string, error: any) => void;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateResponse(
  modelConfig: ModelConfig,
  userPrompt: string,
  history: ChatMessage[],
  options: GenerateOptions = {}
): Promise<GenerationResult> {
  const start = Date.now();
  let attempt = 1;
  const maxAttempts = 3;

  // Configuration resolution
  const provider = options.customBaseUrl ? 'custom' : modelConfig.provider;
  const targetModelId = options.customModelName || modelConfig.modelName;
  const apiKey = options.customApiKey || process.env[modelConfig.apiKeyEnv] || '';

  if (!apiKey) {
    throw new Error(`API key missing for environment variable: ${modelConfig.apiKeyEnv}`);
  }

  // Format messages
  const messages: any[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  history.forEach(msg => messages.push({ role: msg.role, content: msg.content }));
  messages.push({ role: 'user', content: userPrompt });

  // Retry Loop (OpenRouter)
  while (attempt <= maxAttempts) {
    try {
      const client = buildClient(provider as any, apiKey, options.customBaseUrl);
      
      const completion = await client.chat.completions.create({
        model: targetModelId,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        response_format: options.responseFormat ? { type: options.responseFormat } : undefined
      });

      return {
        content: completion.choices[0]?.message?.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
        },
        latencyMs: Date.now() - start,
        provider: provider as 'openrouter' | 'huggingface' | 'custom'
      };

    } catch (error: any) {
      const status = error.status || error.response?.status;
      const isRetryable = status === 429 || status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';

      if (!isRetryable || attempt === maxAttempts) {
        // Fallback to HuggingFace if primary fails and fallback exists
        if (modelConfig.fallbackModelId && provider !== 'custom' && !options.customModelName) {
          if (options.onRetry) options.onRetry(attempt, modelConfig.provider, error);
          break; // Break the while loop to proceed to fallback
        }
        throw error;
      }

      if (options.onRetry) options.onRetry(attempt, provider, error);
      
      // Exponential backoff: 1s, 2s, 4s...
      const delayMs = Math.pow(2, attempt - 1) * 1000;
      await sleep(delayMs);
      attempt++;
    }
  }

  // Fallback Execution (HuggingFace)
  if (modelConfig.fallbackModelId) {
    const hfToken = process.env.HUGGINGFACE_TOKEN;
    if (!hfToken) {
      throw new Error("HuggingFace fallback required but HUGGINGFACE_TOKEN is not set.");
    }

    try {
      const client = buildClient('huggingface', hfToken);
      const completion = await client.chat.completions.create({
        model: modelConfig.fallbackModelId,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
      });

      return {
        content: completion.choices[0]?.message?.content || '',
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
        },
        latencyMs: Date.now() - start,
        provider: 'huggingface'
      };
    } catch (hfError) {
      throw new Error(`Fallback failed: ${hfError instanceof Error ? hfError.message : 'Unknown error'}`);
    }
  }

  throw new Error("Max retries exceeded and no fallback model available.");
}
