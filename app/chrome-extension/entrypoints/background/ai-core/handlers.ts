/**
 * AI Core Message Handlers
 *
 * Handles chrome.runtime messages for AI Core operations
 */

import { getAiCore } from './index';
import type { CompletionRequest, StreamChunk, ProviderConfig, Model } from './types';
import type { Assistant } from './assistants';

// ============================================================================
// Message Types
// ============================================================================

export type AiCoreMessageType =
  // Provider operations
  | 'AI_LIST_PROVIDERS'
  | 'AI_GET_PROVIDER'
  | 'AI_UPDATE_PROVIDER'
  | 'AI_TEST_PROVIDER'
  // Model operations
  | 'AI_LIST_MODELS'
  | 'AI_GET_MODEL'
  | 'AI_FETCH_PROVIDER_MODELS'
  // Assistant operations
  | 'AI_LIST_ASSISTANTS'
  | 'AI_GET_ASSISTANT'
  | 'AI_CREATE_ASSISTANT'
  | 'AI_DELETE_ASSISTANT'
  // Completion operations
  | 'AI_COMPLETE'
  | 'AI_STREAM_START'
  | 'AI_STREAM_ABORT'
  // Selection state
  | 'AI_GET_ACTIVE_MODEL'
  | 'AI_SET_ACTIVE_MODEL'
  | 'AI_GET_ACTIVE_ASSISTANT'
  | 'AI_SET_ACTIVE_ASSISTANT';

export interface AiCoreMessage {
  type: AiCoreMessageType;
  payload?: unknown;
  requestId?: string;
}

export interface AiCoreResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// ============================================================================
// Stream Management
// ============================================================================

const activeStreams = new Map<string, AbortController>();

/**
 * Start a streaming completion and send chunks via port messaging
 */
async function handleStreamStart(
  request: CompletionRequest,
  streamId: string,
  port: chrome.runtime.Port,
): Promise<void> {
  const aiCore = getAiCore();
  const controller = new AbortController();
  activeStreams.set(streamId, controller);

  try {
    const streamRequest = {
      ...request,
      stream: true,
      abortSignal: controller.signal,
    };

    for await (const chunk of aiCore.streamComplete(streamRequest)) {
      if (controller.signal.aborted) break;

      port.postMessage({
        type: 'AI_STREAM_CHUNK',
        streamId,
        chunk,
      });
    }

    port.postMessage({
      type: 'AI_STREAM_END',
      streamId,
    });
  } catch (error) {
    port.postMessage({
      type: 'AI_STREAM_ERROR',
      streamId,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    activeStreams.delete(streamId);
  }
}

/**
 * Abort an active stream
 */
function handleStreamAbort(streamId: string): boolean {
  const controller = activeStreams.get(streamId);
  if (controller) {
    controller.abort();
    activeStreams.delete(streamId);
    return true;
  }
  return false;
}

// ============================================================================
// Message Handler Registration
// ============================================================================

/**
 * Register AI Core message handlers
 */
export function registerAiCoreHandlers(): void {
  // Handle one-time messages
  chrome.runtime.onMessage.addListener((message: AiCoreMessage, sender, sendResponse) => {
    if (!message.type?.startsWith('AI_')) return false;

    handleMessage(message)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
          requestId: message.requestId,
        });
      });

    return true; // Async response
  });

  // Handle streaming via ports
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== 'ai-core-stream') return;

    port.onMessage.addListener(async (message: AiCoreMessage) => {
      if (message.type === 'AI_STREAM_START' && message.payload) {
        const { request, streamId } = message.payload as {
          request: CompletionRequest;
          streamId: string;
        };
        handleStreamStart(request, streamId, port);
      }

      if (message.type === 'AI_STREAM_ABORT' && message.payload) {
        const { streamId } = message.payload as { streamId: string };
        handleStreamAbort(streamId);
      }
    });

    port.onDisconnect.addListener(() => {
      // Abort any active streams from this port
      // Note: We'd need to track which streams belong to which port for this
    });
  });

  console.log('[AI Core] Message handlers registered');
}

/**
 * Handle individual messages
 */
async function handleMessage(message: AiCoreMessage): Promise<AiCoreResponse> {
  const aiCore = getAiCore();

  switch (message.type) {
    // ========================================================================
    // Provider Operations
    // ========================================================================

    case 'AI_LIST_PROVIDERS': {
      const providers = aiCore.listProviders();
      return { success: true, data: providers, requestId: message.requestId };
    }

    case 'AI_GET_PROVIDER': {
      const { providerId } = message.payload as { providerId: string };
      const provider = aiCore.getProvider(providerId);
      return { success: true, data: provider, requestId: message.requestId };
    }

    case 'AI_UPDATE_PROVIDER': {
      const { providerId, updates } = message.payload as {
        providerId: string;
        updates: Partial<ProviderConfig>;
      };
      await aiCore.updateProvider(providerId, updates);
      return { success: true, requestId: message.requestId };
    }

    case 'AI_TEST_PROVIDER': {
      const { providerId } = message.payload as { providerId: string };
      const success = await aiCore.testProvider(providerId);
      return { success: true, data: success, requestId: message.requestId };
    }

    // ========================================================================
    // Model Operations
    // ========================================================================

    case 'AI_LIST_MODELS': {
      const { providerId } = (message.payload as { providerId?: string }) || {};
      const models = aiCore.listModels(providerId);
      return { success: true, data: models, requestId: message.requestId };
    }

    case 'AI_GET_MODEL': {
      const { modelId } = message.payload as { modelId: string };
      const model = aiCore.getModel(modelId);
      return { success: true, data: model, requestId: message.requestId };
    }

    case 'AI_FETCH_PROVIDER_MODELS': {
      const { providerId } = message.payload as { providerId: string };
      const models = await aiCore.fetchProviderModels(providerId);
      return { success: true, data: models, requestId: message.requestId };
    }

    // ========================================================================
    // Assistant Operations
    // ========================================================================

    case 'AI_LIST_ASSISTANTS': {
      const assistants = await aiCore.listAssistants();
      return { success: true, data: assistants, requestId: message.requestId };
    }

    case 'AI_GET_ASSISTANT': {
      const { assistantId } = message.payload as { assistantId: string };
      const assistant = await aiCore.getAssistant(assistantId);
      return { success: true, data: assistant, requestId: message.requestId };
    }

    case 'AI_CREATE_ASSISTANT': {
      const { assistant } = message.payload as { assistant: Assistant };
      await aiCore.createAssistant(assistant);
      return { success: true, requestId: message.requestId };
    }

    case 'AI_DELETE_ASSISTANT': {
      const { assistantId } = message.payload as { assistantId: string };
      await aiCore.deleteAssistant(assistantId);
      return { success: true, requestId: message.requestId };
    }

    // ========================================================================
    // Completion Operations
    // ========================================================================

    case 'AI_COMPLETE': {
      const request = message.payload as CompletionRequest;
      const response = await aiCore.complete(request);
      return { success: true, data: response, requestId: message.requestId };
    }

    // ========================================================================
    // Selection State
    // ========================================================================

    case 'AI_GET_ACTIVE_MODEL': {
      const active = await aiCore.getActiveModel();
      return { success: true, data: active, requestId: message.requestId };
    }

    case 'AI_SET_ACTIVE_MODEL': {
      const { providerId, modelId } = message.payload as {
        providerId: string;
        modelId: string;
      };
      await aiCore.setActiveModel(providerId, modelId);
      return { success: true, requestId: message.requestId };
    }

    case 'AI_GET_ACTIVE_ASSISTANT': {
      const assistant = await aiCore.getActiveAssistant();
      return { success: true, data: assistant, requestId: message.requestId };
    }

    case 'AI_SET_ACTIVE_ASSISTANT': {
      const { assistantId } = message.payload as { assistantId: string };
      await aiCore.setActiveAssistant(assistantId);
      return { success: true, requestId: message.requestId };
    }

    default:
      return {
        success: false,
        error: `Unknown message type: ${message.type}`,
        requestId: message.requestId,
      };
  }
}

// ============================================================================
// Client Helpers
// ============================================================================

/**
 * Send a message to the AI Core service (for use in UI components)
 */
export async function sendAiCoreMessage<T = unknown>(
  type: AiCoreMessageType,
  payload?: unknown,
): Promise<T> {
  const response: AiCoreResponse<T> = await chrome.runtime.sendMessage({
    type,
    payload,
  });

  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }

  return response.data as T;
}

/**
 * Create a streaming completion connection
 */
export function createStreamConnection(): {
  port: chrome.runtime.Port;
  startStream: (request: CompletionRequest) => string;
  abortStream: (streamId: string) => void;
  onChunk: (callback: (streamId: string, chunk: StreamChunk) => void) => void;
  onEnd: (callback: (streamId: string) => void) => void;
  onError: (callback: (streamId: string, error: string) => void) => void;
  disconnect: () => void;
} {
  const port = chrome.runtime.connect({ name: 'ai-core-stream' });
  const chunkCallbacks: Array<(streamId: string, chunk: StreamChunk) => void> = [];
  const endCallbacks: Array<(streamId: string) => void> = [];
  const errorCallbacks: Array<(streamId: string, error: string) => void> = [];

  port.onMessage.addListener((message) => {
    if (message.type === 'AI_STREAM_CHUNK') {
      chunkCallbacks.forEach((cb) => cb(message.streamId, message.chunk));
    }
    if (message.type === 'AI_STREAM_END') {
      endCallbacks.forEach((cb) => cb(message.streamId));
    }
    if (message.type === 'AI_STREAM_ERROR') {
      errorCallbacks.forEach((cb) => cb(message.streamId, message.error));
    }
  });

  return {
    port,
    startStream: (request: CompletionRequest) => {
      const streamId = crypto.randomUUID();
      port.postMessage({
        type: 'AI_STREAM_START',
        payload: { request, streamId },
      });
      return streamId;
    },
    abortStream: (streamId: string) => {
      port.postMessage({
        type: 'AI_STREAM_ABORT',
        payload: { streamId },
      });
    },
    onChunk: (callback) => chunkCallbacks.push(callback),
    onEnd: (callback) => endCallbacks.push(callback),
    onError: (callback) => errorCallbacks.push(callback),
    disconnect: () => port.disconnect(),
  };
}
