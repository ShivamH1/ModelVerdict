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

async function createCompletionWithTimeout(client: any, params: any, timeoutMs: number = 15000) {
  const completionPromise = client.chat.completions.create(params);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request Timeout')), timeoutMs)
  );
  return Promise.race([completionPromise, timeoutPromise]);
}

const FRONTIER_PERSONAS: { [id: string]: { persona: string; freeModelName: string } } = {
  'gpt-4o': {
    freeModelName: 'meta-llama/llama-3.3-70b-instruct:free',
    persona: `You are GPT-4o, a flagship multimodal frontier model developed by OpenAI.
Your response should be highly practical, structured, versatile, and direct.
Answer user prompts with excellent balance, using tables, code block examples, step-by-step guides, and a highly helpful, friendly demeanor.`
  },
  'claude-3.5-sonnet': {
    freeModelName: 'meta-llama/llama-3.3-70b-instruct:free',
    persona: `You are Claude 3.5 Sonnet, a state-of-the-art assistant crafted by Anthropic.
Write in a highly intellectual, comprehensive, structured, and sophisticated prose.
Make sure to explain answers with elegant, well-indexed paragraphs, detailed bullets, or standard scientific rigor.
When refusing dangerous prompts, do so with an extremely polite, clear, and firm refusal without sounding smug.`
  },
  'gemini-2.5-pro': {
    freeModelName: 'google/gemini-2.5-flash:free',
    persona: `You are Gemini 3.5 Flash, a high-performance frontier model developed by Google.
Your answers should be highly accurate, engaging, structured, and modern. 
Provide outstanding reasoning, use markdown lists, code formatting, clear headings, and always adhere to maximum correctness. 
If there's something you do not know, state it clearly rather than making it up.`
  }
};

export async function generateResponse(
  modelConfig: ModelConfig,
  userPrompt: string,
  history: ChatMessage[],
  options: GenerateOptions = {}
): Promise<GenerationResult> {
  const start = Date.now();
  let attempt = 1;
  const maxAttempts = 2;

  // Configuration resolution
  const isFrontier = modelConfig.type === 'FRONTIER';
  const frontierConfig = isFrontier ? FRONTIER_PERSONAS[modelConfig.id] : null;

  const provider = options.customBaseUrl ? 'custom' : modelConfig.provider;
  const targetModelId = options.customModelName || (frontierConfig ? frontierConfig.freeModelName : modelConfig.modelName);
  const apiKey = options.customApiKey || process.env[modelConfig.apiKeyEnv] || '';

  if (!apiKey) {
    throw new Error(`API key missing for environment variable: ${modelConfig.apiKeyEnv}`);
  }

  // Format messages
  const messages: any[] = [];
  if (frontierConfig) {
    messages.push({ role: 'system', content: frontierConfig.persona });
  }
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  history.forEach(msg => messages.push({ role: msg.role, content: msg.content }));
  messages.push({ role: 'user', content: userPrompt });

  // Retry Loop (OpenRouter / primary provider)
  while (attempt <= maxAttempts) {
    try {
      console.log(`[generateResponse] Attempt ${attempt}/${maxAttempts} for model ${targetModelId} via ${provider}...`);
      const client = buildClient(provider as any, apiKey, options.customBaseUrl);
      
      const completion = await createCompletionWithTimeout(client, {
        model: targetModelId,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        response_format: options.responseFormat ? { type: options.responseFormat } : undefined
      }, 15000);

      console.log(`[generateResponse] Attempt ${attempt} succeeded!`);

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
      console.error(`[generateResponse] Attempt ${attempt} failed. Error:`, error.message || error);
      
      const canFallback = (modelConfig.fallbackModelId || isFrontier) && provider !== 'custom' && !options.customModelName;
      if (canFallback) {
        console.error(`Primary provider (${modelConfig.provider}) failed. Falling back immediately:`, error.message || error);
        if (options.onRetry) options.onRetry(attempt, modelConfig.provider, error);
        break; // Break the while loop to proceed to fallback
      }

      const status = error.status || error.response?.status;
      const isRetryable = status === 429 || status >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message === 'Request Timeout';

      if (!isRetryable || attempt === maxAttempts) {
        throw error;
      }

      if (options.onRetry) options.onRetry(attempt, provider, error);
      
      // Exponential backoff: 500ms, 1s...
      const delayMs = Math.pow(2, attempt - 1) * 500;
      await sleep(delayMs);
      attempt++;
    }
  }

  // Fallback Execution (Gemini Subscription for Frontier models, or HuggingFace for other models)
  if (isFrontier) {
    const geminiToken = process.env.GEMINI_API_KEY;
    if (!geminiToken) {
      throw new Error("Gemini fallback required but GEMINI_API_KEY is not set.");
    }

    let geminiAttempt = 1;
    const maxGeminiAttempts = 3;

    while (geminiAttempt <= maxGeminiAttempts) {
      try {
        console.log(`[Fallback] Using direct Gemini subscription fallback for frontier model: ${modelConfig.id} (Attempt ${geminiAttempt}/${maxGeminiAttempts})`);
        const client = buildClient('gemini', geminiToken);
        
        const completion = await createCompletionWithTimeout(client, {
          model: 'gemini-2.5-flash',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        }, 15000);

        return {
          content: completion.choices[0]?.message?.content || '',
          usage: {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
          },
          latencyMs: Date.now() - start,
          provider: 'custom'
        };
      } catch (geminiError: any) {
        console.error(`[Fallback] Gemini attempt ${geminiAttempt} failed:`, geminiError.message || geminiError);
        const status = geminiError.status || geminiError.response?.status;
        const isRetryable = status === 429 || status === 503 || status >= 500 || geminiError.code === 'ECONNRESET' || geminiError.code === 'ETIMEDOUT' || geminiError.message === 'Request Timeout';

        if (!isRetryable || geminiAttempt === maxGeminiAttempts) {
          // Try OpenRouter paid Gemini fallback using the OpenRouter API Key
          const orApiKey = process.env.OPENROUTER_API_KEY;
          if (orApiKey) {
            console.warn(`[Fallback] Gemini SDK failed. Trying OpenRouter paid Gemini fallback...`);
            try {
              const orClient = buildClient('openrouter', orApiKey);
              const completion = await createCompletionWithTimeout(orClient, {
                model: 'google/gemini-2.5-flash',
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 2048,
              }, 15000);

              return {
                content: completion.choices[0]?.message?.content || '',
                usage: {
                  promptTokens: completion.usage?.prompt_tokens || 0,
                  completionTokens: completion.usage?.completion_tokens || 0,
                },
                latencyMs: Date.now() - start,
                provider: 'openrouter'
              };
            } catch (orError) {
              console.error(`[Fallback] OpenRouter paid Gemini fallback failed:`, orError);
            }
          }

          // Try tertiary HuggingFace fallback if token is available
          const hfToken = process.env.HUGGINGFACE_TOKEN;
          if (hfToken) {
            console.warn(`[Fallback] Gemini fallback failed. Trying HuggingFace tertiary fallback...`);
            try {
              const hfClient = buildClient('huggingface', hfToken);
              const completion = await createCompletionWithTimeout(hfClient, {
                model: 'meta-llama/Llama-3.1-8B-Instruct',
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 2048,
              }, 15000);

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
              console.error(`[Fallback] HuggingFace tertiary fallback failed:`, hfError);
            }
          }
          throw new Error(`Gemini Fallback failed: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
        }

        // Wait longer on 429 rate limits (3s, 6s) than transient 503s (1s, 2s) to allow reset
        const delayMs = status === 429 ? 3000 * geminiAttempt : 1000 * geminiAttempt;
        await sleep(delayMs);
        geminiAttempt++;
      }
    }
  }

  if (modelConfig.fallbackModelId) {
    const hfToken = process.env.HUGGINGFACE_TOKEN;
    if (!hfToken) {
      throw new Error("HuggingFace fallback required but HUGGINGFACE_TOKEN is not set.");
    }

    let hfAttempt = 1;
    const maxHfAttempts = 2;

    while (hfAttempt <= maxHfAttempts) {
      try {
        const client = buildClient('huggingface', hfToken);
        const completion = await createCompletionWithTimeout(client, {
          model: modelConfig.fallbackModelId,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        }, 15000);

        return {
          content: completion.choices[0]?.message?.content || '',
          usage: {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
          },
          latencyMs: Date.now() - start,
          provider: 'huggingface'
        };
      } catch (hfError: any) {
        console.error(`[Fallback] HuggingFace attempt ${hfAttempt} failed:`, hfError.message || hfError);
        const status = hfError.status || hfError.response?.status;
        const isRetryable = status === 429 || status >= 500 || hfError.code === 'ECONNRESET' || hfError.code === 'ETIMEDOUT' || hfError.message === 'Request Timeout';

        if (!isRetryable || hfAttempt === maxHfAttempts) {
          throw new Error(`Fallback failed: ${hfError instanceof Error ? hfError.message : 'Unknown error'}`);
        }

        await sleep(1000);
        hfAttempt++;
      }
    }
  }

  throw new Error("Max retries exceeded and no fallback model available.");
}
