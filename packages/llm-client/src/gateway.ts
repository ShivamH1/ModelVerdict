import { ModelConfig, ChatMessage, ProviderAttempt } from '@veritas/shared';
import { buildClient } from './client';

export interface GenerationResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  latencyMs: number;
  provider: string;
  modelName: string;
}

export interface GatewayOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
  onProviderAttempt?: (provider: string, attempt: number) => void;
}

interface CircuitState {
  failures: number;
  lastFailedAt: number;
}

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 60_000;
const PROVIDER_TIMEOUT_MS = 20_000;
const TRANSIENT_RETRY_DELAY_MS = 500;

function isRateLimitError(err: any): boolean {
  const status = err.status || err.response?.status;
  return status === 429;
}

function isTransientError(err: any): boolean {
  const status = err.status || err.response?.status;
  return (
    (typeof status === 'number' && status >= 500) ||
    err.code === 'ECONNRESET' ||
    err.code === 'ETIMEDOUT' ||
    err.message === 'Request Timeout'
  );
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callWithTimeout(client: any, params: any): Promise<any> {
  const completionPromise = client.chat.completions.create(params);
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request Timeout')), PROVIDER_TIMEOUT_MS)
  );
  return Promise.race([completionPromise, timeoutPromise]);
}

export class LLMGateway {
  private circuits = new Map<string, CircuitState>();

  private isCircuitOpen(provider: string): boolean {
    const state = this.circuits.get(provider);
    if (!state) return false;
    if (state.failures < CIRCUIT_FAILURE_THRESHOLD) return false;
    const elapsed = Date.now() - state.lastFailedAt;
    if (elapsed > CIRCUIT_RESET_MS) {
      this.circuits.delete(provider);
      return false;
    }
    return true;
  }

  private recordFailure(provider: string): void {
    const state = this.circuits.get(provider) ?? { failures: 0, lastFailedAt: 0 };
    state.failures += 1;
    state.lastFailedAt = Date.now();
    this.circuits.set(provider, state);
  }

  private resetCircuit(provider: string): void {
    this.circuits.delete(provider);
  }

  async generate(
    config: ModelConfig,
    userPrompt: string,
    history: ChatMessage[],
    options: GatewayOptions = {}
  ): Promise<GenerationResult> {
    const start = Date.now();
    const chain = config.providerChain;

    const messages: any[] = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    history.forEach(msg => messages.push({ role: msg.role, content: msg.content }));
    messages.push({ role: 'user', content: userPrompt });

    const errors: string[] = [];

    for (let i = 0; i < chain.length; i++) {
      const attempt = chain[i];
      const isLast = i === chain.length - 1;

      if (this.isCircuitOpen(attempt.provider)) {
        console.log(`[Gateway] Circuit open for ${attempt.provider}, skipping.`);
        errors.push(`${attempt.provider}: circuit open`);
        if (isLast) break;
        continue;
      }

      const apiKey = process.env[attempt.apiKeyEnv];
      if (!apiKey) {
        console.log(`[Gateway] No API key for ${attempt.provider} (${attempt.apiKeyEnv}), skipping.`);
        errors.push(`${attempt.provider}: missing API key`);
        if (isLast) break;
        continue;
      }

      if (options.onProviderAttempt) {
        options.onProviderAttempt(attempt.provider, i + 1);
      }

      let providerAttempt = 0;
      const maxProviderAttempts = 2;

      while (providerAttempt < maxProviderAttempts) {
        try {
          console.log(`[Gateway] Trying ${attempt.provider}/${attempt.modelName} (chain ${i + 1}/${chain.length}, retry ${providerAttempt})`);
          const client = buildClient(attempt.provider as any, apiKey);

          const completion = await callWithTimeout(client, {
            model: attempt.modelName,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            response_format: options.responseFormat ? { type: options.responseFormat } : undefined,
          });

          this.resetCircuit(attempt.provider);
          console.log(`[Gateway] Success: ${attempt.provider}/${attempt.modelName}`);

          return {
            content: completion.choices[0]?.message?.content || '',
            usage: {
              promptTokens: completion.usage?.prompt_tokens || 0,
              completionTokens: completion.usage?.completion_tokens || 0,
            },
            latencyMs: Date.now() - start,
            provider: attempt.provider,
            modelName: attempt.modelName,
          };
        } catch (err: any) {
          console.error(`[Gateway] ${attempt.provider} attempt ${providerAttempt + 1} failed: ${err.message}`);

          if (isRateLimitError(err)) {
            // Rate limited — skip to next provider immediately, no retry
            this.recordFailure(attempt.provider);
            errors.push(`${attempt.provider}: rate limited (429)`);
            break;
          }

          if (isTransientError(err) && providerAttempt === 0) {
            // One retry for transient errors
            await sleep(TRANSIENT_RETRY_DELAY_MS);
            providerAttempt++;
            continue;
          }

          this.recordFailure(attempt.provider);
          errors.push(`${attempt.provider}: ${err.message}`);
          break;
        }
      }

      if (!isLast) {
        console.log(`[Gateway] Moving to next provider in chain.`);
      }
    }

    throw new Error(
      `All providers exhausted. Attempts: ${errors.join(' | ')}`
    );
  }
}

export const gateway = new LLMGateway();
