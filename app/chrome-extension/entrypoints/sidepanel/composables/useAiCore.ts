/**
 * useAiCore Composable
 *
 * Provides reactive AI Core state and operations for sidepanel components
 */

import { ref, computed, onMounted, onUnmounted, shallowRef } from 'vue';

// Types matching ai-core/types.ts
interface ProviderConfig {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'custom';
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  icon?: string;
}

interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: string[];
  contextLength: number;
  pricing?: { input: number; output: number };
  description?: string;
}

interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  category: string;
  tools?: string[];
  temperature?: number;
  isBuiltIn: boolean;
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  toolCallId?: string;
}

interface StreamChunk {
  type: string;
  text?: string;
  toolCall?: { id: string; name: string };
  toolCallId?: string;
  argumentsDelta?: string;
  usage?: { input: number; output: number };
  finishReason?: string;
  error?: string;
}

// State
const providers = ref<ProviderConfig[]>([]);
const models = ref<Model[]>([]);
const assistants = ref<Assistant[]>([]);
const activeProvider = ref<ProviderConfig | null>(null);
const activeModel = ref<Model | null>(null);
const activeAssistant = ref<Assistant | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

// Computed
const enabledProviders = computed(() => providers.value.filter((p) => p.enabled));

const availableModels = computed(() =>
  models.value.filter((m) => enabledProviders.value.some((p) => p.id === m.providerId)),
);

const modelsByProvider = computed(() => {
  const grouped = new Map<string, Model[]>();
  for (const model of availableModels.value) {
    const existing = grouped.get(model.providerId) || [];
    existing.push(model);
    grouped.set(model.providerId, existing);
  }
  return grouped;
});

const assistantsByCategory = computed(() => {
  const grouped = new Map<string, Assistant[]>();
  for (const assistant of assistants.value) {
    const existing = grouped.get(assistant.category) || [];
    existing.push(assistant);
    grouped.set(assistant.category, existing);
  }
  return grouped;
});

// Storage listener
let storageUnsubscribe: (() => void) | null = null;

function setupStorageListener() {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
    if (areaName !== 'local') return;

    // Reload on relevant changes
    const aiCoreKeys = [
      'aiCore_providers',
      'aiCore_customModels',
      'aiCore_activeProviderId',
      'aiCore_activeModelId',
      'aiCore_activeAssistantId',
    ];

    if (Object.keys(changes).some((k) => aiCoreKeys.includes(k))) {
      loadAll();
    }
  };

  chrome.storage.onChanged.addListener(listener);
  storageUnsubscribe = () => chrome.storage.onChanged.removeListener(listener);
}

// API helpers
async function sendMessage<T>(type: string, payload?: unknown): Promise<T> {
  const response = await chrome.runtime.sendMessage({ type, payload });
  if (!response.success) {
    throw new Error(response.error || 'Unknown error');
  }
  return response.data as T;
}

// Actions
async function loadProviders(): Promise<void> {
  providers.value = await sendMessage('AI_LIST_PROVIDERS');
}

async function loadModels(): Promise<void> {
  models.value = await sendMessage('AI_LIST_MODELS');
}

async function loadAssistants(): Promise<void> {
  assistants.value = await sendMessage('AI_LIST_ASSISTANTS');
}

async function loadActiveSelections(): Promise<void> {
  const active = await sendMessage<{
    provider: ProviderConfig | null;
    model: Model | null;
  } | null>('AI_GET_ACTIVE_MODEL');

  if (active) {
    activeProvider.value = active.provider;
    activeModel.value = active.model;
  }

  const assistant = await sendMessage<Assistant | null>('AI_GET_ACTIVE_ASSISTANT');
  activeAssistant.value = assistant;
}

async function loadAll(): Promise<void> {
  isLoading.value = true;
  error.value = null;

  try {
    await Promise.all([loadProviders(), loadModels(), loadAssistants(), loadActiveSelections()]);
  } catch (e) {
    error.value = (e as Error).message;
    console.error('[useAiCore] Failed to load:', e);
  } finally {
    isLoading.value = false;
  }
}

async function setActiveModel(providerId: string, modelId: string): Promise<void> {
  await sendMessage('AI_SET_ACTIVE_MODEL', { providerId, modelId });
  await loadActiveSelections();
}

async function setActiveAssistant(assistantId: string): Promise<void> {
  await sendMessage('AI_SET_ACTIVE_ASSISTANT', { assistantId });
  await loadActiveSelections();
}

// Completion API
interface CompletionOptions {
  model?: string;
  messages: Message[];
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  temperature?: number;
  maxTokens?: number;
}

async function complete(options: CompletionOptions): Promise<{
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: { input: number; output: number };
}> {
  const request = {
    model: options.model || activeModel.value?.id,
    messages: options.messages,
    tools: options.tools,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    stream: false,
  };

  if (!request.model) {
    throw new Error('No model selected');
  }

  return sendMessage('AI_COMPLETE', request);
}

// Streaming completion
function createStreamingCompletion(options: CompletionOptions): {
  onChunk: (callback: (chunk: StreamChunk) => void) => void;
  onEnd: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
  abort: () => void;
  start: () => void;
} {
  const chunkCallbacks: Array<(chunk: StreamChunk) => void> = [];
  const endCallbacks: Array<() => void> = [];
  const errorCallbacks: Array<(error: string) => void> = [];

  let port: chrome.runtime.Port | null = null;
  let streamId: string | null = null;

  const start = () => {
    port = chrome.runtime.connect({ name: 'ai-core-stream' });
    streamId = crypto.randomUUID();

    port.onMessage.addListener((message) => {
      if (message.streamId !== streamId) return;

      switch (message.type) {
        case 'AI_STREAM_CHUNK':
          chunkCallbacks.forEach((cb) => cb(message.chunk));
          break;
        case 'AI_STREAM_END':
          endCallbacks.forEach((cb) => cb());
          port?.disconnect();
          break;
        case 'AI_STREAM_ERROR':
          errorCallbacks.forEach((cb) => cb(message.error));
          port?.disconnect();
          break;
      }
    });

    const request = {
      model: options.model || activeModel.value?.id,
      messages: options.messages,
      tools: options.tools,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      stream: true,
    };

    port.postMessage({
      type: 'AI_STREAM_START',
      payload: { request, streamId },
    });
  };

  const abort = () => {
    if (port && streamId) {
      port.postMessage({
        type: 'AI_STREAM_ABORT',
        payload: { streamId },
      });
      port.disconnect();
    }
  };

  return {
    onChunk: (cb) => chunkCallbacks.push(cb),
    onEnd: (cb) => endCallbacks.push(cb),
    onError: (cb) => errorCallbacks.push(cb),
    abort,
    start,
  };
}

// Build system prompt with assistant
function buildSystemPrompt(assistant: Assistant | null, additionalContext?: string): string {
  const parts: string[] = [];

  if (assistant?.systemPrompt) {
    parts.push(assistant.systemPrompt);
  }

  if (additionalContext) {
    parts.push(additionalContext);
  }

  return parts.join('\n\n');
}

// Main composable export
export function useAiCore() {
  // Initialize on first use
  onMounted(() => {
    loadAll();
    setupStorageListener();
  });

  onUnmounted(() => {
    storageUnsubscribe?.();
  });

  return {
    // State
    providers,
    models,
    assistants,
    activeProvider,
    activeModel,
    activeAssistant,
    isLoading,
    error,

    // Computed
    enabledProviders,
    availableModels,
    modelsByProvider,
    assistantsByCategory,

    // Actions
    loadAll,
    loadProviders,
    loadModels,
    loadAssistants,
    setActiveModel,
    setActiveAssistant,

    // Completion
    complete,
    createStreamingCompletion,

    // Helpers
    buildSystemPrompt,
  };
}

// Export a shared instance for components that need shared state
let sharedInstance: ReturnType<typeof useAiCore> | null = null;

export function useSharedAiCore() {
  if (!sharedInstance) {
    sharedInstance = useAiCore();
  }
  return sharedInstance;
}
