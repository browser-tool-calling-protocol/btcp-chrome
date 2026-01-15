/**
 * Google AI Provider Adapter
 *
 * Supports Gemini models via Google Generative AI API
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
// Google-specific Types
// ============================================================================

interface GoogleContent {
  role: 'user' | 'model';
  parts: GooglePart[];
}

interface GooglePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
  functionResponse?: {
    name: string;
    response: Record<string, unknown>;
  };
}

interface GoogleTool {
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
}

interface GoogleRequest {
  contents: GoogleContent[];
  systemInstruction?: { parts: GooglePart[] };
  tools?: GoogleTool[];
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
}

interface GoogleCandidate {
  content: {
    role: string;
    parts: GooglePart[];
  };
  finishReason: 'STOP' | 'MAX_TOKENS' | 'SAFETY' | 'RECITATION' | 'OTHER';
}

interface GoogleResponse {
  candidates: GoogleCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface GoogleStreamChunk {
  candidates?: GoogleCandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ============================================================================
// Google Provider Client
// ============================================================================

export class GoogleClient extends BaseProviderClient {
  providerId = 'google';

  /**
   * Build request URL for Google API
   */
  private getEndpoint(config: ProviderConfig, model: string, stream: boolean): string {
    const action = stream ? 'streamGenerateContent' : 'generateContent';
    const streamParam = stream ? '?alt=sse' : '';
    return `${config.baseUrl}/models/${model}:${action}${streamParam}&key=${config.apiKey}`;
  }

  /**
   * Non-streaming completion
   */
  async complete(
    request: CompletionRequest,
    config: ProviderConfig,
    model: Model,
  ): Promise<CompletionResponse> {
    const { systemInstruction, contents } = this.prepareContents(request.messages);

    const body: GoogleRequest = {
      contents,
    };

    if (systemInstruction) body.systemInstruction = systemInstruction;
    if (request.tools?.length) body.tools = [this.formatTools(request.tools)];

    body.generationConfig = {};
    if (request.maxTokens) body.generationConfig.maxOutputTokens = request.maxTokens;
    if (request.temperature !== undefined) body.generationConfig.temperature = request.temperature;
    if (request.topP !== undefined) body.generationConfig.topP = request.topP;
    if (request.stopSequences?.length) body.generationConfig.stopSequences = request.stopSequences;

    const response = await fetch(this.getEndpoint(config, request.model, false), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI API error: ${response.status} - ${error}`);
    }

    const data: GoogleResponse = await response.json();
    return this.parseResponse(data, request.model);
  }

  /**
   * Streaming completion
   */
  async *streamComplete(
    request: CompletionRequest,
    config: ProviderConfig,
    _model: Model,
  ): AsyncGenerator<StreamChunk> {
    const { systemInstruction, contents } = this.prepareContents(request.messages);

    const body: GoogleRequest = {
      contents,
    };

    if (systemInstruction) body.systemInstruction = systemInstruction;
    if (request.tools?.length) body.tools = [this.formatTools(request.tools)];

    body.generationConfig = {};
    if (request.maxTokens) body.generationConfig.maxOutputTokens = request.maxTokens;
    if (request.temperature !== undefined) body.generationConfig.temperature = request.temperature;
    if (request.topP !== undefined) body.generationConfig.topP = request.topP;
    if (request.stopSequences?.length) body.generationConfig.stopSequences = request.stopSequences;

    const response = await fetch(this.getEndpoint(config, request.model, true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: request.abortSignal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google AI API error: ${response.status} - ${error}`);
    }

    // Track tool calls
    let currentToolCallIndex = 0;
    let lastUsage: TokenUsage | undefined;

    for await (const line of this.parseSSEStream(response)) {
      try {
        const chunk: GoogleStreamChunk = JSON.parse(line);

        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.text) {
              yield { type: 'text', text: part.text };
            }
            if (part.functionCall) {
              const id = `tool_${currentToolCallIndex++}`;
              yield {
                type: 'tool_call_start',
                toolCall: { id, name: part.functionCall.name },
              };
              yield {
                type: 'tool_call_delta',
                toolCallId: id,
                argumentsDelta: JSON.stringify(part.functionCall.args),
              };
              yield { type: 'tool_call_end', toolCallId: id };
            }
          }
        }

        if (chunk.usageMetadata) {
          lastUsage = {
            input: chunk.usageMetadata.promptTokenCount,
            output: chunk.usageMetadata.candidatesTokenCount,
            total: chunk.usageMetadata.totalTokenCount,
          };
        }

        if (chunk.candidates?.[0]?.finishReason) {
          if (lastUsage) {
            yield { type: 'usage', usage: lastUsage };
          }
          yield {
            type: 'done',
            finishReason: this.parseFinishReason(chunk.candidates[0].finishReason),
          };
        }
      } catch {
        // Skip malformed chunks
      }
    }
  }

  /**
   * List models from Google API
   */
  async listModels(config: ProviderConfig): Promise<Model[]> {
    try {
      const response = await fetch(`${config.baseUrl}/models?key=${config.apiKey}`, {
        method: 'GET',
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.models
        .filter((m: { name: string }) => m.name.includes('gemini'))
        .map((m: { name: string; displayName: string; inputTokenLimit: number }) => ({
          id: m.name.replace('models/', ''),
          name: m.displayName,
          providerId: this.providerId,
          capabilities: ['text', 'vision', 'streaming', 'function_calling'] as const,
          contextLength: m.inputTokenLimit || 1000000,
        }));
    } catch {
      return [];
    }
  }

  /**
   * Test connection to Google API
   */
  async testConnection(config: ProviderConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.baseUrl}/models?key=${config.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Prepare contents and extract system instruction
   */
  private prepareContents(messages: Message[]): {
    systemInstruction?: { parts: GooglePart[] };
    contents: GoogleContent[];
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    const systemText = systemMessages
      .map((m) => (typeof m.content === 'string' ? m.content : ''))
      .filter(Boolean)
      .join('\n\n');

    return {
      systemInstruction: systemText ? { parts: [{ text: systemText }] } : undefined,
      contents: this.formatMessages(otherMessages),
    };
  }

  /**
   * Format messages for Google API
   */
  protected formatMessages(messages: Message[]): GoogleContent[] {
    const result: GoogleContent[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      // Map roles
      const role: 'user' | 'model' = msg.role === 'assistant' ? 'model' : 'user';
      const parts: GooglePart[] = [];

      // Handle tool results
      if (msg.role === 'tool' && msg.toolCallId) {
        parts.push({
          functionResponse: {
            name: msg.name || 'unknown',
            response: {
              result: typeof msg.content === 'string' ? msg.content : '',
            },
          },
        });
        result.push({ role: 'user', parts });
        continue;
      }

      // Handle tool calls from assistant
      if (msg.role === 'assistant' && msg.toolCalls?.length) {
        if (typeof msg.content === 'string' && msg.content) {
          parts.push({ text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.arguments,
            },
          });
        }
        result.push({ role: 'model', parts });
        continue;
      }

      // Handle multimodal content
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text') {
            parts.push({ text: part.text });
          }
          if (part.type === 'image' && part.source.type === 'base64') {
            parts.push({
              inlineData: {
                mimeType: part.source.mediaType || 'image/png',
                data: part.source.data || '',
              },
            });
          }
        }
      } else {
        parts.push({ text: msg.content });
      }

      result.push({ role, parts });
    }

    return result;
  }

  /**
   * Format tools for Google API
   */
  protected formatTools(tools: Tool[]): GoogleTool {
    return {
      functionDeclarations: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    };
  }

  /**
   * Parse response from Google format
   */
  private parseResponse(data: GoogleResponse, modelId: string): CompletionResponse {
    const candidate = data.candidates?.[0];
    if (!candidate) {
      return {
        id: generateResponseId(),
        content: '',
        finishReason: 'error',
        model: modelId,
      };
    }

    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const part of candidate.content.parts) {
      if (part.text) {
        content += part.text;
      }
      if (part.functionCall) {
        toolCalls.push({
          id: `tool_${toolCalls.length}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args,
        });
      }
    }

    return {
      id: generateResponseId(),
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: data.usageMetadata
        ? {
            input: data.usageMetadata.promptTokenCount,
            output: data.usageMetadata.candidatesTokenCount,
            total: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason: this.parseFinishReason(candidate.finishReason),
      model: modelId,
    };
  }

  /**
   * Parse finish reason from Google format
   */
  private parseFinishReason(reason: string): CompletionResponse['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'error';
      default:
        return 'stop';
    }
  }
}

/**
 * Singleton instance
 */
export const googleClient = new GoogleClient();
