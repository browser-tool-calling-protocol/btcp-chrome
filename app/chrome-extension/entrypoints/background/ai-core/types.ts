/**
 * AI Core Types
 *
 * Cherry Studio-inspired type definitions for multi-provider AI support
 */

// ============================================================================
// Provider Configuration
// ============================================================================

export type ProviderType = 'cloud' | 'local' | 'custom';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  enabled: boolean;
  icon?: string;
}

// ============================================================================
// Model Definitions
// ============================================================================

export type ModelCapability = 'text' | 'vision' | 'function_calling' | 'streaming' | 'reasoning';

export interface ModelPricing {
  input: number; // Cost per 1M tokens
  output: number; // Cost per 1M tokens
  currency?: string;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: ModelCapability[];
  contextLength: number;
  pricing?: ModelPricing;
  maxOutputTokens?: number;
  description?: string;
}

// ============================================================================
// Messages
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    mediaType?: string;
    data?: string;
    url?: string;
  };
}

export type MessageContent = TextContent | ImageContent;

export interface ToolCallContent {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResultContent {
  toolCallId: string;
  content: string;
  isError?: boolean;
}

export interface Message {
  role: MessageRole;
  content: string | MessageContent[];
  name?: string;
  toolCalls?: ToolCallContent[];
  toolCallId?: string; // For tool result messages
}

// ============================================================================
// Tools
// ============================================================================

export interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
  required?: boolean;
  properties?: Record<string, ToolParameter>;
  items?: ToolParameter;
}

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolParameter>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

// ============================================================================
// Completion Request/Response
// ============================================================================

export interface CompletionRequest {
  model: string;
  messages: Message[];
  tools?: Tool[];
  stream?: boolean;
  abortSignal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export type FinishReason = 'stop' | 'tool_calls' | 'length' | 'error' | 'cancelled';

export interface TokenUsage {
  input: number;
  output: number;
  total?: number;
  reasoning?: number;
}

export interface CompletionResponse {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
  usage?: TokenUsage;
  finishReason: FinishReason;
  model?: string;
  thinking?: string; // For reasoning models
}

// ============================================================================
// Streaming
// ============================================================================

export type StreamChunkType =
  | 'text'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_call_end'
  | 'thinking'
  | 'usage'
  | 'done'
  | 'error';

export interface BaseStreamChunk {
  type: StreamChunkType;
}

export interface TextStreamChunk extends BaseStreamChunk {
  type: 'text';
  text: string;
}

export interface ThinkingStreamChunk extends BaseStreamChunk {
  type: 'thinking';
  text: string;
}

export interface ToolCallStartChunk extends BaseStreamChunk {
  type: 'tool_call_start';
  toolCall: {
    id: string;
    name: string;
  };
}

export interface ToolCallDeltaChunk extends BaseStreamChunk {
  type: 'tool_call_delta';
  toolCallId: string;
  argumentsDelta: string;
}

export interface ToolCallEndChunk extends BaseStreamChunk {
  type: 'tool_call_end';
  toolCallId: string;
}

export interface UsageStreamChunk extends BaseStreamChunk {
  type: 'usage';
  usage: TokenUsage;
}

export interface DoneStreamChunk extends BaseStreamChunk {
  type: 'done';
  finishReason: FinishReason;
}

export interface ErrorStreamChunk extends BaseStreamChunk {
  type: 'error';
  error: string;
}

export type StreamChunk =
  | TextStreamChunk
  | ThinkingStreamChunk
  | ToolCallStartChunk
  | ToolCallDeltaChunk
  | ToolCallEndChunk
  | UsageStreamChunk
  | DoneStreamChunk
  | ErrorStreamChunk;

// ============================================================================
// Middleware
// ============================================================================

export interface MiddlewareContext {
  request: CompletionRequest;
  response?: CompletionResponse;
  provider: ProviderConfig;
  model: Model;
  aborted: boolean;
  error?: Error;
  metadata: Record<string, unknown>;
  streamChunks?: StreamChunk[];
}

export interface Middleware {
  name: string;
  priority?: number; // Lower runs first
  process(ctx: MiddlewareContext, next: () => Promise<void>): Promise<void>;
}

// ============================================================================
// Provider Client Interface
// ============================================================================

export interface BaseApiClient {
  providerId: string;

  complete(
    request: CompletionRequest,
    config: ProviderConfig,
    model: Model,
  ): Promise<CompletionResponse>;

  streamComplete(
    request: CompletionRequest,
    config: ProviderConfig,
    model: Model,
  ): AsyncGenerator<StreamChunk>;

  listModels?(config: ProviderConfig): Promise<Model[]>;

  testConnection?(config: ProviderConfig): Promise<boolean>;
}

// ============================================================================
// Events
// ============================================================================

export type AiCoreEventType =
  | 'provider:added'
  | 'provider:updated'
  | 'provider:removed'
  | 'model:selected'
  | 'completion:start'
  | 'completion:end'
  | 'stream:chunk'
  | 'error';

export interface AiCoreEvent {
  type: AiCoreEventType;
  data?: unknown;
  timestamp: number;
}

export type AiCoreEventListener = (event: AiCoreEvent) => void;
