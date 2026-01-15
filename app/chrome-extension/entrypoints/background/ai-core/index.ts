/**
 * AI Core Service
 *
 * Main orchestrator for multi-provider AI support
 */

import type {
  ProviderConfig,
  Model,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  Middleware,
  MiddlewareContext,
  AiCoreEvent,
  AiCoreEventListener,
  AiCoreEventType,
} from './types';
import { aiCoreStorage } from './storage';
import { MiddlewareChain } from './middleware';
import { loggingMiddleware } from './middleware/logging';
import { abortHandlerMiddleware } from './middleware/abort-handler';
import { errorHandlerMiddleware } from './middleware/error-handler';
import { DEFAULT_PROVIDERS, DEFAULT_MODELS, getDefaultModelsForProvider } from './defaults';
import { getOrCreateClient, getProviderClient } from './providers';
import { BUILTIN_ASSISTANTS, type Assistant } from './assistants';

// Re-export types and utilities
export * from './types';
export * from './assistants';
export { aiCoreStorage } from './storage';
export type { AiCoreStorage, AiCorePreferences } from './storage';
export { DEFAULT_PROVIDERS, DEFAULT_MODELS } from './defaults';

// ============================================================================
// AI Core Service
// ============================================================================

export class AiCoreService {
  private providers = new Map<string, ProviderConfig>();
  private customModels = new Map<string, Model>();
  private middlewareChain: MiddlewareChain;
  private eventListeners = new Map<AiCoreEventType, Set<AiCoreEventListener>>();
  private initialized = false;

  constructor() {
    this.middlewareChain = new MiddlewareChain();
    this.registerDefaultMiddlewares();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize the AI Core service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.loadFromStorage();
    this.initialized = true;

    console.log('[AI Core] Initialized with', this.providers.size, 'providers');
  }

  /**
   * Load providers and models from storage
   */
  private async loadFromStorage(): Promise<void> {
    const storage = await aiCoreStorage.getAll();

    // Load default providers first
    for (const provider of DEFAULT_PROVIDERS) {
      this.providers.set(provider.id, { ...provider });
    }

    // Override with saved providers
    for (const provider of storage.providers) {
      this.providers.set(provider.id, provider);
    }

    // Load custom models
    for (const model of storage.customModels) {
      this.customModels.set(model.id, model);
    }
  }

  /**
   * Save current state to storage
   */
  private async saveToStorage(): Promise<void> {
    await aiCoreStorage.setMany({
      providers: Array.from(this.providers.values()),
      customModels: Array.from(this.customModels.values()),
    });
  }

  /**
   * Register default middlewares
   */
  private registerDefaultMiddlewares(): void {
    this.middlewareChain.use(abortHandlerMiddleware);
    this.middlewareChain.use(loggingMiddleware);
    this.middlewareChain.use(errorHandlerMiddleware);
  }

  // ==========================================================================
  // Provider Management
  // ==========================================================================

  /**
   * Register or update a provider
   */
  async registerProvider(config: ProviderConfig): Promise<void> {
    this.providers.set(config.id, config);
    await this.saveToStorage();
    this.emit('provider:added', config);
  }

  /**
   * Remove a provider
   */
  async removeProvider(id: string): Promise<boolean> {
    const existed = this.providers.delete(id);
    if (existed) {
      await this.saveToStorage();
      this.emit('provider:removed', { id });
    }
    return existed;
  }

  /**
   * Update a provider's configuration
   */
  async updateProvider(id: string, updates: Partial<ProviderConfig>): Promise<void> {
    const provider = this.providers.get(id);
    if (provider) {
      Object.assign(provider, updates);
      await this.saveToStorage();
      this.emit('provider:updated', provider);
    }
  }

  /**
   * Get a provider by ID
   */
  getProvider(id: string): ProviderConfig | undefined {
    return this.providers.get(id);
  }

  /**
   * List all providers
   */
  listProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * List enabled providers
   */
  listEnabledProviders(): ProviderConfig[] {
    return this.listProviders().filter((p) => p.enabled);
  }

  /**
   * Test connection to a provider
   */
  async testProvider(id: string): Promise<boolean> {
    const provider = this.providers.get(id);
    if (!provider) return false;

    const client = getProviderClient(id);
    if (!client?.testConnection) return false;

    return client.testConnection(provider);
  }

  // ==========================================================================
  // Model Management
  // ==========================================================================

  /**
   * List all models (default + custom)
   */
  listModels(providerId?: string): Model[] {
    const models: Model[] = [];

    if (providerId) {
      // Get models for specific provider
      models.push(...getDefaultModelsForProvider(providerId));
      models.push(
        ...Array.from(this.customModels.values()).filter((m) => m.providerId === providerId),
      );
    } else {
      // Get all models from enabled providers
      for (const provider of this.listEnabledProviders()) {
        models.push(...getDefaultModelsForProvider(provider.id));
      }
      models.push(...Array.from(this.customModels.values()));
    }

    return models;
  }

  /**
   * Get a model by ID
   */
  getModel(modelId: string): Model | undefined {
    // Check custom models first
    if (this.customModels.has(modelId)) {
      return this.customModels.get(modelId);
    }

    // Check default models
    for (const models of Object.values(DEFAULT_MODELS)) {
      const model = models.find((m) => m.id === modelId);
      if (model) return model;
    }

    return undefined;
  }

  /**
   * Add a custom model
   */
  async addCustomModel(model: Model): Promise<void> {
    this.customModels.set(model.id, model);
    await this.saveToStorage();
  }

  /**
   * Remove a custom model
   */
  async removeCustomModel(modelId: string): Promise<boolean> {
    const existed = this.customModels.delete(modelId);
    if (existed) {
      await this.saveToStorage();
    }
    return existed;
  }

  /**
   * Fetch models from provider API
   */
  async fetchProviderModels(providerId: string): Promise<Model[]> {
    const provider = this.providers.get(providerId);
    if (!provider) return [];

    const client = getOrCreateClient(provider);
    if (!client.listModels) return [];

    return client.listModels(provider);
  }

  // ==========================================================================
  // Completion API
  // ==========================================================================

  /**
   * Execute a completion request
   */
  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    await this.ensureInitialized();

    const model = this.getModel(request.model);
    if (!model) {
      throw new Error(`Model not found: ${request.model}`);
    }

    const provider = this.providers.get(model.providerId);
    if (!provider) {
      throw new Error(`Provider not found for model: ${request.model}`);
    }

    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${provider.name}`);
    }

    const client = getOrCreateClient(provider);

    // Create middleware context
    const ctx: MiddlewareContext = {
      request,
      provider,
      model,
      aborted: false,
      metadata: {},
    };

    // Execute through middleware chain
    await this.middlewareChain.execute({
      ...ctx,
      // The actual completion happens in this "virtual" middleware
      // We modify the context during execution
    });

    // Execute the actual completion
    this.emit('completion:start', { model: model.id, provider: provider.id });

    try {
      const response = await client.complete(request, provider, model);
      ctx.response = response;
      this.emit('completion:end', { response });
      return response;
    } catch (error) {
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * Execute a streaming completion request
   */
  async *streamComplete(request: CompletionRequest): AsyncGenerator<StreamChunk> {
    await this.ensureInitialized();

    const model = this.getModel(request.model);
    if (!model) {
      throw new Error(`Model not found: ${request.model}`);
    }

    const provider = this.providers.get(model.providerId);
    if (!provider) {
      throw new Error(`Provider not found for model: ${request.model}`);
    }

    if (!provider.enabled) {
      throw new Error(`Provider is disabled: ${provider.name}`);
    }

    const client = getOrCreateClient(provider);

    this.emit('completion:start', { model: model.id, provider: provider.id, stream: true });

    try {
      for await (const chunk of client.streamComplete(request, provider, model)) {
        this.emit('stream:chunk', { chunk });
        yield chunk;
      }
      this.emit('completion:end', { stream: true });
    } catch (error) {
      this.emit('error', { error });
      throw error;
    }
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  // ==========================================================================
  // Middleware Management
  // ==========================================================================

  /**
   * Add a middleware to the chain
   */
  use(middleware: Middleware): void {
    this.middlewareChain.use(middleware);
  }

  /**
   * Remove a middleware by name
   */
  removeMiddleware(name: string): boolean {
    return this.middlewareChain.remove(name);
  }

  /**
   * List all middlewares
   */
  listMiddlewares(): Middleware[] {
    return this.middlewareChain.list();
  }

  // ==========================================================================
  // Assistant Management
  // ==========================================================================

  /**
   * Get all assistants (built-in + custom)
   */
  async listAssistants(): Promise<Assistant[]> {
    const customAssistants = await aiCoreStorage.getCustomAssistants();
    return [...BUILTIN_ASSISTANTS, ...customAssistants];
  }

  /**
   * Get an assistant by ID
   */
  async getAssistant(id: string): Promise<Assistant | undefined> {
    // Check built-in first
    const builtin = BUILTIN_ASSISTANTS.find((a) => a.id === id);
    if (builtin) return builtin;

    // Check custom
    const customAssistants = await aiCoreStorage.getCustomAssistants();
    return customAssistants.find((a) => a.id === id);
  }

  /**
   * Create a custom assistant
   */
  async createAssistant(assistant: Assistant): Promise<void> {
    await aiCoreStorage.addCustomAssistant(assistant);
  }

  /**
   * Delete a custom assistant
   */
  async deleteAssistant(id: string): Promise<void> {
    await aiCoreStorage.removeCustomAssistant(id);
  }

  // ==========================================================================
  // Event System
  // ==========================================================================

  /**
   * Subscribe to events
   */
  on(type: AiCoreEventType, listener: AiCoreEventListener): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(type)?.delete(listener);
    };
  }

  /**
   * Emit an event
   */
  private emit(type: AiCoreEventType, data?: unknown): void {
    const event: AiCoreEvent = {
      type,
      data,
      timestamp: Date.now(),
    };

    this.eventListeners.get(type)?.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error('[AI Core] Event listener error:', error);
      }
    });
  }

  // ==========================================================================
  // Selection State
  // ==========================================================================

  /**
   * Get the currently active model
   */
  async getActiveModel(): Promise<{ provider: ProviderConfig; model: Model } | null> {
    const { providerId, modelId } = await aiCoreStorage.getActiveSelection();
    if (!providerId || !modelId) return null;

    const provider = this.providers.get(providerId);
    const model = this.getModel(modelId);

    if (!provider || !model) return null;
    return { provider, model };
  }

  /**
   * Set the active model
   */
  async setActiveModel(providerId: string, modelId: string): Promise<void> {
    await aiCoreStorage.setActiveModel(providerId, modelId);
    this.emit('model:selected', { providerId, modelId });
  }

  /**
   * Get the active assistant
   */
  async getActiveAssistant(): Promise<Assistant | null> {
    const { assistantId } = await aiCoreStorage.getActiveSelection();
    if (!assistantId) return null;

    return (await this.getAssistant(assistantId)) || null;
  }

  /**
   * Set the active assistant
   */
  async setActiveAssistant(assistantId: string): Promise<void> {
    await aiCoreStorage.setActiveAssistant(assistantId);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let aiCoreInstance: AiCoreService | null = null;

/**
 * Get the singleton AiCoreService instance
 */
export function getAiCore(): AiCoreService {
  if (!aiCoreInstance) {
    aiCoreInstance = new AiCoreService();
  }
  return aiCoreInstance;
}

/**
 * Initialize the AI Core service (call once at startup)
 */
export async function initializeAiCore(): Promise<AiCoreService> {
  const aiCore = getAiCore();
  await aiCore.initialize();
  return aiCore;
}
