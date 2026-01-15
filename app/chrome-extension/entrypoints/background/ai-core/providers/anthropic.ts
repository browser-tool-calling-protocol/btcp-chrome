/**
 * Anthropic Provider Adapter
 *
 * Supports Claude models via Anthropic API
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
// Anthropic-specific Types
// ============================================================================

interface AnthropicContentBlock {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens: number;
  tools?: AnthropicTool[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  message?: AnthropicResponse;
  index?: number;
  content_block?: AnthropicContentBlock;
  delta?: {
    type: string;
    text?: string;
    partial_json?: string;
    thinking?: string;
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

// ============================================================================
// Anthropic Provider Client
// ============================================================================

export class AnthropicClient extends BaseProviderClient {
  providerId = 'anthropic';

  /**
   * Get headers for Anthropic API
   */
  protected getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey || '',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      ...config.headers,
    };
  }

  /**
   * Non-streaming completion
   */
  async complete(
    request: CompletionRequest,
    config: ProviderConfig,
    model: Model,
  ): Promise<CompletionResponse> {
    const { systemMessage, messages } = this.extractSystemMessage(request.messages);

    const body: AnthropicRequest = {
      model: request.model,
      messages: this.formatMessages(messages),
      max_tokens: request.maxTokens || model.maxOutputTokens || 4096,
      stream: false,
    };

    if (systemMessage) body.system = systemMessage;
    if (request.tools?.length) body.tools = this.formatTools(request.tools);
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stopSequences?.length) body.stop_sequences = request.stopSequences;

    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify(body),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data: AnthropicResponse = await response.json();
    return this.parseResponse(data);
  }

  /**
   * Streaming completion
   */
  async *streamComplete(
    request: CompletionRequest,
    config: ProviderConfig,
    model: Model,
  ): AsyncGenerator<StreamChunk> {
    const { systemMessage, messages } = this.extractSystemMessage(request.messages);

    const body: AnthropicRequest = {
      model: request.model,
      messages: this.formatMessages(messages),
      max_tokens: request.maxTokens || model.maxOutputTokens || 4096,
      stream: true,
    };

    if (systemMessage) body.system = systemMessage;
    if (request.tools?.length) body.tools = this.formatTools(request.tools);
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.topP !== undefined) body.top_p = request.topP;
    if (request.stopSequences?.length) body.stop_sequences = request.stopSequences;

    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(config),
      body: JSON.stringify(body),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    // Track current content block for tool calls
    let currentToolCall: { id: string; name: string } | null = null;
    const accumulatedUsage: TokenUsage = { input: 0, output: 0 };

    for await (const line of this.parseSSEStream(response)) {
      try {
        const event: AnthropicStreamEvent = JSON.parse(line);

        switch (event.type) {
          case 'content_block_start':
            if (event.content_block?.type === 'tool_use') {
              currentToolCall = {
                id: event.content_block.id!,
                name: event.content_block.name!,
              };
              yield {
                type: 'tool_call_start',
                toolCall: currentToolCall,
              };
            }
            break;

          case 'content_block_delta':
            if (event.delta?.type === 'text_delta' && event.delta.text) {
              yield { type: 'text', text: event.delta.text };
            }
            if (event.delta?.type === 'thinking_delta' && event.delta.thinking) {
              yield { type: 'thinking', text: event.delta.thinking };
            }
            if (event.delta?.type === 'input_json_delta' && event.delta.partial_json) {
              if (currentToolCall) {
                yield {
                  type: 'tool_call_delta',
                  toolCallId: currentToolCall.id,
                  argumentsDelta: event.delta.partial_json,
                };
              }
            }
            break;

          case 'content_block_stop':
            if (currentToolCall) {
              yield { type: 'tool_call_end', toolCallId: currentToolCall.id };
              currentToolCall = null;
            }
            break;

          case 'message_delta':
            if (event.usage) {
              if (event.usage.output_tokens) {
                accumulatedUsage.output = event.usage.output_tokens;
              }
            }
            break;

          case 'message_start':
            if (event.message?.usage) {
              accumulatedUsage.input = event.message.usage.input_tokens;
            }
            break;

          case 'message_stop':
            yield { type: 'usage', usage: accumulatedUsage };
            yield {
              type: 'done',
              finishReason: this.parseStopReason(event.message?.stop_reason || 'end_turn'),
            };
            break;
        }
      } catch {
        // Skip malformed events
      }
    }
  }

  /**
   * Test connection to Anthropic API
   */
  async testConnection(config: ProviderConfig): Promise<boolean> {
    try {
      // Anthropic doesn't have a models endpoint, so we do a minimal message request
      const response = await fetch(`${config.baseUrl}/messages`, {
        method: 'POST',
        headers: this.getHeaders(config),
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      return response.ok || response.status === 400; // 400 means API key works but request invalid
    } catch {
      return false;
    }
  }

  /**
   * Extract system message from messages array (Anthropic handles it separately)
   */
  private extractSystemMessage(messages: Message[]): {
    systemMessage?: string;
    messages: Message[];
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const systemMessage = systemMessages
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .filter(Boolean)
      .join('\n\n');

    return {
      systemMessage: systemMessage || undefined,
      messages: otherMessages,
    };
  }

  /**
   * Format messages for Anthropic API
   */
  protected formatMessages(messages: Message[]): AnthropicMessage[] {
    const result: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue; // Handled separately

      // Handle tool result messages
      if (msg.role === 'tool' && msg.toolCallId) {
        // Anthropic expects tool results as user messages with tool_result content blocks
        const lastUserMsg = result[result.length - 1];
        const toolResultBlock: AnthropicContentBlock = {
          type: 'tool_result',
          tool_use_id: msg.toolCallId,
          content: typeof msg.content === 'string' ? msg.content : '',
        };

        if (lastUserMsg?.role === 'user' && Array.isArray(lastUserMsg.content)) {
          (lastUserMsg.content as AnthropicContentBlock[]).push(toolResultBlock);
        } else {
          result.push({
            role: 'user',
            content: [toolResultBlock],
          });
        }
        continue;
      }

      // Handle assistant messages with tool calls
      if (msg.role === 'assistant' && msg.toolCalls?.length) {
        const content: AnthropicContentBlock[] = [];

        if (typeof msg.content === 'string' && msg.content) {
          content.push({ type: 'text', text: msg.content });
        }

        for (const tc of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          });
        }

        result.push({ role: 'assistant', content });
        continue;
      }

      // Handle multimodal content
      if (Array.isArray(msg.content)) {
        const content: AnthropicContentBlock[] = msg.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          }
          if (part.type === 'image' && part.source.type === 'base64') {
            return {
              type: 'image',
              source: {
                type: 'base64',
                media_type: part.source.mediaType || 'image/png',
                data: part.source.data || '',
              },
            };
          }
          return { type: 'text', text: '' };
        });

        result.push({
          role: msg.role as 'user' | 'assistant',
          content,
        });
        continue;
      }

      // Simple text message
      result.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    }

    return result;
  }

  /**
   * Format tools for Anthropic API
   */
  protected formatTools(tools: Tool[]): AnthropicTool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

  /**
   * Parse response from Anthropic format
   */
  private parseResponse(data: AnthropicResponse): CompletionResponse {
    let content = '';
    const toolCalls: ToolCall[] = [];
    const thinking = '';

    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        content += block.text;
      }
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id!,
          name: block.name!,
          arguments: block.input || {},
        });
      }
    }

    return {
      id: data.id,
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        input: data.usage.input_tokens,
        output: data.usage.output_tokens,
        total: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: this.parseStopReason(data.stop_reason),
      model: data.model,
      thinking: thinking || undefined,
    };
  }

  /**
   * Parse stop reason from Anthropic format
   */
  private parseStopReason(reason: string): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'tool_use':
        return 'tool_calls';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }
}

/**
 * Singleton instance
 */
export const anthropicClient = new AnthropicClient();
