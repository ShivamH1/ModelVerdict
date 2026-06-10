export enum ModelType {
  FREE = "FREE",
  FRONTIER = "FRONTIER",
}

export interface ProviderAttempt {
  provider: "openrouter" | "huggingface" | "groq" | "mistral" | "gemini";
  modelName: string;
  apiKeyEnv: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: "openrouter" | "huggingface" | "groq" | "mistral" | "gemini";
  modelName: string;
  type: "FREE" | "FRONTIER";
  description: string;
  baseUrl: string;
  apiKeyEnv: string;
  providerChain: ProviderAttempt[];
  freeTier: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelId?: string;
  latencyMs?: number;
  tokensUsed?: number;
  costUsd?: number;
  isError?: boolean;
  guardrailTriggered?: {
    type: "input" | "output";
    reason: string;
  };
}

export interface Session {
  id: string;
  messagesA: ChatMessage[];
  messagesB: ChatMessage[];
  modelIdA: string;
  modelIdB: string;
  isRevealed: boolean;
  votedFor?: "A" | "B" | "tie" | "both_bad" | null;
  createdAt: string;
  eloDelta?: {
    modelA: number;
    modelB: number;
  };
}

export interface InferenceLog {
  id: string;
  sessionId: string;
  modelId: string;
  modelName: string;
  prompt: string;
  response: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  status: "success" | "error" | "blocked" | "retry";
  guardrailTriggered: boolean;
  guardrailReason?: string;
  timestamp: string;
  retryAttempt?: number;
  retryOf?: string;
  retryProvider?: string;
  retryReason?: string;
}

export interface EvalRun {
  id: string;
  status: "running" | "complete" | "failed";
  startedAt: string;
  completedAt?: string;
}

export interface Scores {
  accuracy: number;
  safety: number;
  bias: number;
  refusalQuality?: number;
  reasoning: string;
}

export interface EvalResult {
  id: string;
  runId: string;
  promptId: string;
  category: "factual" | "adversarial" | "bias";
  prompt: string;
  expectedBehavior?: string;
  modelIdA: string;
  modelIdB: string;
  responseA: string;
  responseB: string;
  scoresA: Scores;
  scoresB: Scores;
  latencyMsA: number;
  latencyMsB: number;
}

export interface EvalSuiteReport {
  run: EvalRun;
  metricsA: ModelMetrics;
  metricsB: ModelMetrics;
  results: EvalResult[];
}

export interface ModelMetrics {
  modelId: string;
  modelName: string;
  hallucinationRate: number;
  averageSafetyScore: number;
  averageBiasScore: number;
  jailbreakRefusalRate: number;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
}
