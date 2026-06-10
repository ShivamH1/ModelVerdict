import { ModelConfig } from "./types";

const GEMINI_FALLBACK = {
  provider: "gemini" as const,
  modelName: "gemini-2.5-flash",
  apiKeyEnv: "GEMINI_API_KEY",
};

export const MODEL_CATALOG: ModelConfig[] = [
  // === FREE TIER ===
  {
    id: "llama-3.1-8b",
    name: "Llama 3.1 (8B)",
    provider: "groq",
    modelName: "llama-3.1-8b-instant",
    type: "FREE",
    description: "Meta's efficient open-source instruct model.",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    freeTier: true,
    providerChain: [
      { provider: "groq", modelName: "llama-3.1-8b-instant", apiKeyEnv: "GROQ_API_KEY" },
      { provider: "openrouter", modelName: "meta-llama/llama-3.1-8b-instruct:free", apiKeyEnv: "OPENROUTER_API_KEY" },
      { provider: "huggingface", modelName: "meta-llama/Llama-3.1-8B-Instruct", apiKeyEnv: "HUGGINGFACE_TOKEN" },
      GEMINI_FALLBACK,
    ],
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 (70B)",
    provider: "groq",
    modelName: "llama-3.3-70b-versatile",
    type: "FREE",
    description: "Meta's powerful 70B open-source model, strong at reasoning.",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
    freeTier: true,
    providerChain: [
      { provider: "groq", modelName: "llama-3.3-70b-versatile", apiKeyEnv: "GROQ_API_KEY" },
      { provider: "openrouter", modelName: "meta-llama/llama-3.3-70b-instruct:free", apiKeyEnv: "OPENROUTER_API_KEY" },
      GEMINI_FALLBACK,
    ],
  },
  {
    id: "mistral-7b",
    name: "Mistral 7B",
    provider: "mistral",
    modelName: "open-mistral-7b",
    type: "FREE",
    description: "Fast and capable open model by Mistral AI.",
    baseUrl: "https://api.mistral.ai/v1",
    apiKeyEnv: "MISTRAL_API_KEY",
    freeTier: true,
    providerChain: [
      { provider: "mistral", modelName: "open-mistral-7b", apiKeyEnv: "MISTRAL_API_KEY" },
      { provider: "openrouter", modelName: "mistralai/mistral-7b-instruct:free", apiKeyEnv: "OPENROUTER_API_KEY" },
      { provider: "huggingface", modelName: "mistralai/Mistral-7B-Instruct-v0.3", apiKeyEnv: "HUGGINGFACE_TOKEN" },
      GEMINI_FALLBACK,
    ],
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "openrouter",
    modelName: "deepseek/deepseek-chat",
    type: "FREE",
    description: "High-performance open-weight model by DeepSeek.",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    freeTier: true,
    providerChain: [
      { provider: "openrouter", modelName: "deepseek/deepseek-chat", apiKeyEnv: "OPENROUTER_API_KEY" },
      { provider: "huggingface", modelName: "deepseek-ai/DeepSeek-V3", apiKeyEnv: "HUGGINGFACE_TOKEN" },
      GEMINI_FALLBACK,
    ],
  },
  {
    id: "qwen-2.5-72b",
    name: "Qwen 2.5 (72B)",
    provider: "openrouter",
    modelName: "qwen/qwen-2.5-72b-instruct",
    type: "FREE",
    description: "Alibaba's large open-weight model, strong at reasoning.",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKeyEnv: "OPENROUTER_API_KEY",
    freeTier: true,
    providerChain: [
      { provider: "openrouter", modelName: "qwen/qwen-2.5-72b-instruct", apiKeyEnv: "OPENROUTER_API_KEY" },
      { provider: "huggingface", modelName: "Qwen/Qwen2.5-72B-Instruct", apiKeyEnv: "HUGGINGFACE_TOKEN" },
      GEMINI_FALLBACK,
    ],
  },

  // === FRONTIER TIER (Gemini — paid, direct API) ===
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    modelName: "gemini-2.5-flash",
    type: "FRONTIER",
    description: "Google's fast frontier reasoning model.",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKeyEnv: "GEMINI_API_KEY",
    freeTier: false,
    providerChain: [
      GEMINI_FALLBACK,
    ],
  },
];
