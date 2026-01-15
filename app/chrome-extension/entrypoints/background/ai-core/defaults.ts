/**
 * Default Provider and Model Configurations
 *
 * Pre-configured providers with sensible defaults
 */

import type { ProviderConfig, Model } from './types';

// ============================================================================
// Default Providers
// ============================================================================

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    baseUrl: 'https://api.openai.com/v1',
    enabled: false, // User must add API key
    icon: '🤖',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'cloud',
    baseUrl: 'https://api.anthropic.com/v1',
    enabled: false,
    icon: '🧠',
  },
  {
    id: 'google',
    name: 'Google AI',
    type: 'cloud',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    enabled: false,
    icon: '✨',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'local',
    baseUrl: 'http://localhost:11434/v1',
    enabled: false,
    icon: '🦙',
  },
];

// ============================================================================
// Default Models by Provider
// ============================================================================

export const DEFAULT_MODELS: Record<string, Model[]> = {
  openai: [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      providerId: 'openai',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 128000,
      maxOutputTokens: 16384,
      pricing: { input: 2.5, output: 10 },
      description: 'Most capable multimodal model',
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      providerId: 'openai',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 128000,
      maxOutputTokens: 16384,
      pricing: { input: 0.15, output: 0.6 },
      description: 'Fast and affordable multimodal model',
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      providerId: 'openai',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 128000,
      maxOutputTokens: 4096,
      pricing: { input: 10, output: 30 },
      description: 'Previous flagship model',
    },
    {
      id: 'o1',
      name: 'o1',
      providerId: 'openai',
      capabilities: ['text', 'reasoning'],
      contextLength: 200000,
      maxOutputTokens: 100000,
      pricing: { input: 15, output: 60 },
      description: 'Advanced reasoning model',
    },
    {
      id: 'o1-mini',
      name: 'o1 Mini',
      providerId: 'openai',
      capabilities: ['text', 'reasoning'],
      contextLength: 128000,
      maxOutputTokens: 65536,
      pricing: { input: 3, output: 12 },
      description: 'Fast reasoning model',
    },
    {
      id: 'o3-mini',
      name: 'o3 Mini',
      providerId: 'openai',
      capabilities: ['text', 'reasoning', 'function_calling', 'streaming'],
      contextLength: 200000,
      maxOutputTokens: 100000,
      pricing: { input: 1.1, output: 4.4 },
      description: 'Latest efficient reasoning model',
    },
  ],
  anthropic: [
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      providerId: 'anthropic',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 200000,
      maxOutputTokens: 8192,
      pricing: { input: 3, output: 15 },
      description: 'Balanced performance and cost',
    },
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      providerId: 'anthropic',
      capabilities: ['text', 'vision', 'function_calling', 'streaming', 'reasoning'],
      contextLength: 200000,
      maxOutputTokens: 32000,
      pricing: { input: 15, output: 75 },
      description: 'Most capable Claude model with extended thinking',
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      providerId: 'anthropic',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 200000,
      maxOutputTokens: 8192,
      pricing: { input: 3, output: 15 },
      description: 'Previous Sonnet version',
    },
    {
      id: 'claude-3-5-haiku-20241022',
      name: 'Claude 3.5 Haiku',
      providerId: 'anthropic',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 200000,
      maxOutputTokens: 8192,
      pricing: { input: 0.8, output: 4 },
      description: 'Fast and efficient',
    },
  ],
  google: [
    {
      id: 'gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      providerId: 'google',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 1000000,
      maxOutputTokens: 8192,
      pricing: { input: 0.075, output: 0.3 },
      description: 'Fast multimodal model with 1M context',
    },
    {
      id: 'gemini-2.0-flash-thinking',
      name: 'Gemini 2.0 Flash Thinking',
      providerId: 'google',
      capabilities: ['text', 'vision', 'streaming', 'reasoning'],
      contextLength: 1000000,
      maxOutputTokens: 8192,
      pricing: { input: 0.075, output: 0.3 },
      description: 'Flash model with visible reasoning',
    },
    {
      id: 'gemini-2.5-pro',
      name: 'Gemini 2.5 Pro',
      providerId: 'google',
      capabilities: ['text', 'vision', 'function_calling', 'streaming', 'reasoning'],
      contextLength: 2000000,
      maxOutputTokens: 65536,
      pricing: { input: 1.25, output: 5 },
      description: 'Most capable Google model with 2M context',
    },
    {
      id: 'gemini-1.5-pro',
      name: 'Gemini 1.5 Pro',
      providerId: 'google',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 2000000,
      maxOutputTokens: 8192,
      pricing: { input: 1.25, output: 5 },
      description: 'Previous Pro version',
    },
    {
      id: 'gemini-1.5-flash',
      name: 'Gemini 1.5 Flash',
      providerId: 'google',
      capabilities: ['text', 'vision', 'function_calling', 'streaming'],
      contextLength: 1000000,
      maxOutputTokens: 8192,
      pricing: { input: 0.075, output: 0.3 },
      description: 'Previous Flash version',
    },
  ],
  ollama: [
    {
      id: 'llama3.2',
      name: 'Llama 3.2',
      providerId: 'ollama',
      capabilities: ['text', 'streaming'],
      contextLength: 128000,
      description: 'Meta Llama 3.2 8B',
    },
    {
      id: 'llama3.2:70b',
      name: 'Llama 3.2 70B',
      providerId: 'ollama',
      capabilities: ['text', 'streaming'],
      contextLength: 128000,
      description: 'Meta Llama 3.2 70B parameter model',
    },
    {
      id: 'qwen2.5:7b',
      name: 'Qwen 2.5 7B',
      providerId: 'ollama',
      capabilities: ['text', 'function_calling', 'streaming'],
      contextLength: 128000,
      description: 'Alibaba Qwen 2.5 7B with tool use',
    },
    {
      id: 'qwen2.5:72b',
      name: 'Qwen 2.5 72B',
      providerId: 'ollama',
      capabilities: ['text', 'function_calling', 'streaming'],
      contextLength: 128000,
      description: 'Alibaba Qwen 2.5 72B with tool use',
    },
    {
      id: 'deepseek-r1:8b',
      name: 'DeepSeek R1 8B',
      providerId: 'ollama',
      capabilities: ['text', 'streaming', 'reasoning'],
      contextLength: 64000,
      description: 'DeepSeek reasoning model',
    },
    {
      id: 'mistral',
      name: 'Mistral 7B',
      providerId: 'ollama',
      capabilities: ['text', 'streaming'],
      contextLength: 32000,
      description: 'Mistral AI 7B base model',
    },
    {
      id: 'codellama',
      name: 'Code Llama',
      providerId: 'ollama',
      capabilities: ['text', 'streaming'],
      contextLength: 16000,
      description: 'Meta Code Llama for coding tasks',
    },
  ],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all default models as a flat array
 */
export function getAllDefaultModels(): Model[] {
  return Object.values(DEFAULT_MODELS).flat();
}

/**
 * Get default models for a specific provider
 */
export function getDefaultModelsForProvider(providerId: string): Model[] {
  return DEFAULT_MODELS[providerId] ?? [];
}

/**
 * Get a specific default provider by ID
 */
export function getDefaultProvider(providerId: string): ProviderConfig | undefined {
  return DEFAULT_PROVIDERS.find((p) => p.id === providerId);
}

/**
 * Get a specific default model by ID
 */
export function getDefaultModel(modelId: string): Model | undefined {
  return getAllDefaultModels().find((m) => m.id === modelId);
}

/**
 * Check if a model supports a capability
 */
export function modelHasCapability(
  model: Model,
  capability: Model['capabilities'][number],
): boolean {
  return model.capabilities.includes(capability);
}
