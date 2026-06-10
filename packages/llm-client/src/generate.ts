import { ModelConfig, ChatMessage } from '@veritas/shared';
import { buildClient } from './client';
import { gateway, GenerationResult, GatewayOptions } from './gateway';

export interface GenerateOptions extends GatewayOptions {
  customApiKey?: string;
  customBaseUrl?: string;
  customModelName?: string;
  onRetry?: (attempt: number, provider: string, error: any) => void;
}

export async function generateResponse(
  modelConfig: ModelConfig,
  userPrompt: string,
  history: ChatMessage[],
  options: GenerateOptions = {}
): Promise<GenerationResult> {
  // Custom endpoint override — bypass gateway entirely
  if (options.customBaseUrl || options.customModelName || options.customApiKey) {
    const apiKey = options.customApiKey || process.env[modelConfig.apiKeyEnv] || '';
    const client = buildClient('openrouter', apiKey, options.customBaseUrl);

    const messages: any[] = [];
    if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
    history.forEach(msg => messages.push({ role: msg.role, content: msg.content }));
    messages.push({ role: 'user', content: userPrompt });

    const start = Date.now();
    const completion = await client.chat.completions.create({
      model: options.customModelName || modelConfig.modelName,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
    });

    return {
      content: completion.choices[0]?.message?.content || '',
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
      },
      latencyMs: Date.now() - start,
      provider: 'custom',
      modelName: options.customModelName || modelConfig.modelName,
    };
  }

  return gateway.generate(modelConfig, userPrompt, history, {
    systemPrompt: options.systemPrompt,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    responseFormat: options.responseFormat,
    onProviderAttempt: options.onRetry
      ? (provider, attempt) => options.onRetry!(attempt, provider, null)
      : undefined,
  });
}
