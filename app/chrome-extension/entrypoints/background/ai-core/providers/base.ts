/**
 * Base API Client
 *
 * Abstract base class for provider implementations
 */

import type {
  BaseApiClient,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  ProviderConfig,
  Model,
  Message,
  Tool,
} from '../types';

export abstract class BaseProviderClient implements BaseApiClient {
  abstract providerId: string;

  abstract complete(
    request: CompletionRequest,
    config: ProviderConfig,
    model: Model,
  ): Promise<CompletionResponse>;

  abstract streamComplete(
    request: CompletionRequest,
    config: ProviderConfig,
    model: Model,
  ): AsyncGenerator<StreamChunk>;

  /**
   * Test connection to the provider
   */
  async testConnection(config: ProviderConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(config),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models from the provider API
   */
  async listModels(_config: ProviderConfig): Promise<Model[]> {
    // Default implementation returns empty - override in subclasses
    return [];
  }

  /**
   * Build request headers
   */
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    return headers;
  }

  /**
   * Parse SSE stream from fetch response
   */
  protected async *parseSSEStream(response: Response): AsyncGenerator<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            yield data;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Convert internal message format to provider-specific format
   */
  protected abstract formatMessages(messages: Message[]): unknown[];

  /**
   * Convert internal tool format to provider-specific format
   */
  protected abstract formatTools(tools: Tool[]): unknown;
}

/**
 * Helper to create a unique response ID
 */
export function generateResponseId(): string {
  return `resp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
