/**
 * OpenAI Provider Adapter
 *
 * Supports OpenAI API and compatible endpoints
 */

import { BaseProviderClient, generateResponseId } from './base';
import type {
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  ProviderConfig,
  Model,
  Message,
  Tool,
  ToolCall,
  TokenUsage,
} from '../types';

// ============================================================================
// OpenAI-specific Types
// ============================================================================

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentPart[];
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'low' | 'high' | 'auto' };
}

interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  tool_choice?: 'none' | 'auto' | 'required';
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
}

interface OpenAICompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: 'stop' | 'tool_calls' | 'length' | 'content_filter';
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// OpenAI Provider Client
// ============================================================================

export class OpenAIClient extends BaseProviderClient {
  providerId = 'openai';

  /**
   * Non-streaming completion
   */
  async complete(
    request: CompletionRequest,
    config: ProviderConfig,
    _model: Model,
  ): Promise<CompletionResponse> {
    const body: OpenAICompletionRequest = {
      model: request.model,
      messages: this.formatMessages(request.messages),
      stream: false,
    };

    if (request.tools?.length) {
      body.tools = this.formatTools(request.tools);
      body.tool_choice = 'auto';
    }
    if (request.maxTokens) body.max_tokens = request.maxTokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stopSequences?.length) body.stop = request.stopSequences;

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify(body),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data: OpenAICompletionResponse = await response.json();
    const choice = data.choices[0];

    return {
      id: data.id,
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls?.map(this.parseToolCall),
      usage: data.usage ? this.parseUsage(data.usage) : undefined,
      finishReason: this.parseFinishReason(choice.finish_reason),
      model: request.model,
    };
  }

  /**
   * Streaming completion
   */
  async *streamComplete(
    request: CompletionRequest,
    config: ProviderConfig,
    _model: Model,
  ): AsyncGenerator<StreamChunk> {
    const body: OpenAICompletionRequest = {
      model: request.model,
      messages: this.formatMessages(request.messages),
      stream: true,
    };

    if (request.tools?.length) {
      body.tools = this.formatTools(request.tools);
      body.tool_choice = 'auto';
    }
    if (request.maxTokens) body.max_tokens = request.maxTokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stopSequences?.length) body.stop = request.stopSequences;

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify(body),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    // Track tool calls being built
    const toolCallsInProgress = new Map<number, { id: string; name: string; args: string }>();

    for await (const line of this.parseSSEStream(response)) {
      try {
        const chunk: OpenAIStreamChunk = JSON.parse(line);
        const choice = chunk.choices[0];
        if (!choice) continue;

        // Text content
        if (choice.delta.content) {
          yield { type: 'text', text: choice.delta.content };
        }

        // Tool calls
        if (choice.delta.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            if (tc.id) {
              // New tool call starting
              toolCallsInProgress.set(tc.index, {
                id: tc.id,
                name: tc.function?.name || '',
                args: tc.function?.arguments || '',
              });
              yield {
                type: 'tool_call_start',
                toolCall: { id: tc.id, name: tc.function?.name || '' },
              };
            } else if (tc.function?.arguments) {
              // Continuing tool call arguments
              const inProgress = toolCallsInProgress.get(tc.index);
              if (inProgress) {
                inProgress.args += tc.function.arguments;
                yield {
                  type: 'tool_call_delta',
                  toolCallId: inProgress.id,
                  argumentsDelta: tc.function.arguments,
                };
              }
            }
          }
        }

        // Usage (sent at end with stream_options)
        if (chunk.usage) {
          yield { type: 'usage', usage: this.parseUsage(chunk.usage) };
        }

        // Finish
        if (choice.finish_reason) {
          // Emit tool call end events
          for (const tc of toolCallsInProgress.values()) {
            yield { type: 'tool_call_end', toolCallId: tc.id };
          }
          yield { type: 'done', finishReason: this.parseFinishReason(choice.finish_reason) };
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  /**
   * List models from OpenAI API
   */
  async listModels(config: ProviderConfig): Promise<Model[]> {
    try {
      const response = await fetch(`${config.baseUrl}/models`, {
        method: 'GET',
        headers: this.getHeaders(config),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.data
        .filter(
          (m: { id: string }) =>
            m.id.startsWith('gpt') || m.id.startsWith('o1') || m.id.startsWith('o3'),
        )
        .map((m: { id: string }) => ({
          id: m.id,
          name: m.id,
          providerId: this.providerId,
          capabilities: ['text', 'streaming'] as const,
          contextLength: 128000,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Format messages for OpenAI API
   */
  protected formatMessages(messages: Message[]): OpenAIMessage[] {
    return messages.map((msg): OpenAIMessage => {
      // Handle tool result messages
      if (msg.role === 'tool' && msg.toolCallId) {
        return {
          role: 'tool',
          content: typeof msg.content === 'string' ? msg.content : '',
          tool_call_id: msg.toolCallId,
        };
      }

      // Handle assistant messages with tool calls
      if (msg.role === 'assistant' && msg.toolCalls?.length) {
        return {
          role: 'assistant',
          content: typeof msg.content === 'string' ? msg.content : '',
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        };
      }

      // Handle multimodal content
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content.map((part): OpenAIContentPart => {
            if (part.type === 'text') {
              return { type: 'text', text: part.text };
            }
            if (part.type === 'image') {
              const url =
                part.source.type === 'base64'
                  ? `data:${part.source.mediaType};base64,${part.source.data}`
                  : part.source.url!;
              return { type: 'image_url', image_url: { url } };
            }
            return { type: 'text', text: '' };
          }),
        };
      }

      // Simple text message
      return {
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      };
    });
  }

  /**
   * Format tools for OpenAI API
   */
  protected formatTools(tools: Tool[]): OpenAITool[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Parse tool call from OpenAI format
   */
  private parseToolCall(tc: OpenAIToolCall): ToolCall {
    return {
      id: tc.id,
      name: tc.function.name,
      arguments: JSON.parse(tc.function.arguments || '{}'),
    };
  }

  /**
   * Parse usage from OpenAI format
   */
  private parseUsage(usage: { prompt_tokens: number; completion_tokens: number }): TokenUsage {
    return {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.prompt_tokens + usage.completion_tokens,
    };
  }

  /**
   * Parse finish reason from OpenAI format
   */
  private parseFinishReason(reason: string): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'tool_calls':
        return 'tool_calls';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'error';
      default:
        return 'stop';
    }
  }
}

/**
 * Singleton instance
 */
export const openaiClient = new OpenAIClient();
