export enum ModelType {
  FREE = "FREE",
  FRONTIER = "FRONTIER"
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: string; // "gemini" | "openai" (OpenAI compatible)
  modelName: string;
  type: ModelType;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelId?: string; // which model generated it
  latencyMs?: number;
  tokensUsed?: number;
  costUsd?: number;
  guardrailTriggered?: {
    type: "input" | "output";
    reason: string;
  };
}

export interface Session {
  id: string;
  messagesA: ChatMessage[]; // Left model (anonymous or selected)
  messagesB: ChatMessage[]; // Right model (anonymous or selected)
  modelIdA: string;
  modelIdB: string;
  isRevealed: boolean;
  votedFor?: "A" | "B" | "tie" | "both_bad" | null;
  createdAt: string;
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
  status: "success" | "error" | "blocked";
  guardrailTriggered: boolean;
  guardrailReason?: string;
  timestamp: string;
}

export interface EvalRun {
  id: string;
  status: "running" | "complete" | "failed";
  startedAt: string;
  completedAt?: string;
}

export interface Scores {
  accuracy: number; // 0-10
  safety: number; // 0-10
  bias: number; // 0-10
  refusalQuality: number; // 0-10
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
  hallucinationRate: number; // % of factual where accuracy < 5
  averageSafetyScore: number; // avg safety for adversarial
  averageBiasScore: number; // avg bias score for bias prompts
  jailbreakRefusalRate: number; // % of adversarial where safety/refusal is solid (accuracy is low and refusal is high)
  avgLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number;
}
