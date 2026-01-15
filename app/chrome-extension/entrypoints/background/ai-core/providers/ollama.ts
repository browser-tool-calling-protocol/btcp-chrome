/**
 * Ollama Provider Adapter
 *
 * Supports local Ollama models via OpenAI-compatible API
 */

import { OpenAIClient } from './openai';
import type {
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  ProviderConfig,
  Model,
} from '../types';

// ============================================================================
// Ollama-specific Types
// ============================================================================

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaListResponse {
  models: OllamaModel[];
}

// ============================================================================
// Ollama Provider Client
// ============================================================================

export class OllamaClient extends OpenAIClient {
  providerId = 'ollama';

  /**
   * Override to not send Authorization header for local Ollama
   */
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  /**
   * List models from Ollama API
   */
  async listModels(config: ProviderConfig): Promise<Model[]> {
    try {
      // Ollama has its own endpoint for listing models
      const ollamaApiUrl = config.baseUrl.replace('/v1', '');
      const response = await fetch(`${ollamaApiUrl}/api/tags`, {
        method: 'GET',
        headers: this.getHeaders(config),
      });

      if (!response.ok) return [];

      const data: OllamaListResponse = await response.json();
      return data.models.map((m) => ({
        id: m.name,
        name: this.formatModelName(m.name),
        providerId: this.providerId,
        capabilities: this.inferCapabilities(m.name),
        contextLength: this.inferContextLength(m.name),
        description: `${m.details.parameter_size} - ${m.details.quantization_level}`,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Test connection to Ollama
   */
  async testConnection(config: ProviderConfig): Promise<boolean> {
    try {
      const ollamaApiUrl = config.baseUrl.replace('/v1', '');
      const response = await fetch(`${ollamaApiUrl}/api/tags`, {
        method: 'GET',
        headers: this.getHeaders(config),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Format model name for display
   */
  private formatModelName(name: string): string {
    // Remove tag if present (e.g., "llama3.2:latest" -> "Llama 3.2")
    const baseName = name.split(':')[0];

    // Capitalize and format common model names
    const nameMap: Record<string, string> = {
      'llama3.2': 'Llama 3.2',
      'llama3.1': 'Llama 3.1',
      llama3: 'Llama 3',
      llama2: 'Llama 2',
      mistral: 'Mistral',
      mixtral: 'Mixtral',
      codellama: 'Code Llama',
      'qwen2.5': 'Qwen 2.5',
      qwen2: 'Qwen 2',
      'deepseek-r1': 'DeepSeek R1',
      'deepseek-coder': 'DeepSeek Coder',
      phi3: 'Phi-3',
      gemma2: 'Gemma 2',
      gemma: 'Gemma',
    };

    for (const [key, displayName] of Object.entries(nameMap)) {
      if (baseName.toLowerCase().startsWith(key)) {
        return displayName + baseName.slice(key.length);
      }
    }

    // Default: capitalize first letter
    return baseName.charAt(0).toUpperCase() + baseName.slice(1);
  }

  /**
   * Infer capabilities from model name
   */
  private inferCapabilities(name: string): Model['capabilities'] {
    const capabilities: Model['capabilities'] = ['text', 'streaming'];
    const lowerName = name.toLowerCase();

    // Vision models
    if (
      lowerName.includes('vision') ||
      lowerName.includes('llava') ||
      lowerName.includes('bakllava')
    ) {
      capabilities.push('vision');
    }

    // Models with function calling support
    if (
      lowerName.includes('qwen') ||
      lowerName.includes('mistral') ||
      lowerName.includes('llama3')
    ) {
      capabilities.push('function_calling');
    }

    // Reasoning models
    if (lowerName.includes('deepseek-r1') || lowerName.includes('thinking')) {
      capabilities.push('reasoning');
    }

    return capabilities;
  }

  /**
   * Infer context length from model name
   */
  private inferContextLength(name: string): number {
    const lowerName = name.toLowerCase();

    // Common context lengths
    if (lowerName.includes('128k')) return 128000;
    if (lowerName.includes('64k')) return 64000;
    if (lowerName.includes('32k')) return 32000;
    if (lowerName.includes('16k')) return 16000;

    // Model-specific defaults
    if (lowerName.includes('llama3')) return 128000;
    if (lowerName.includes('llama2')) return 4096;
    if (lowerName.includes('qwen2.5')) return 128000;
    if (lowerName.includes('mistral')) return 32000;
    if (lowerName.includes('mixtral')) return 32000;
    if (lowerName.includes('gemma2')) return 8192;
    if (lowerName.includes('deepseek')) return 64000;

    // Default
    return 8192;
  }
}

/**
 * Singleton instance
 */
export const ollamaClient = new OllamaClient();
