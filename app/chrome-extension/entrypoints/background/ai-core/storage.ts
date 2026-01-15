/**
 * AI Core Storage Layer
 *
 * Wrapper around chrome.storage.local for AI configuration persistence
 */

import type { ProviderConfig, Model } from './types';
import type { Assistant } from './assistants';

// ============================================================================
// Storage Schema
// ============================================================================

export interface AiCorePreferences {
  defaultTemperature: number;
  defaultMaxTokens: number;
  streamingEnabled: boolean;
  showThinking: boolean;
  autoSaveConversations: boolean;
}

export interface AiCoreStorage {
  // Provider configuration
  providers: ProviderConfig[];
  customModels: Model[];

  // Active selections
  activeProviderId: string | null;
  activeModelId: string | null;
  activeAssistantId: string | null;

  // User preferences
  preferences: AiCorePreferences;

  // Custom assistants (built-in stored separately)
  customAssistants: Assistant[];

  // Version for migrations
  storageVersion: number;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PREFERENCES: AiCorePreferences = {
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
  streamingEnabled: true,
  showThinking: true,
  autoSaveConversations: true,
};

export const DEFAULT_STORAGE: AiCoreStorage = {
  providers: [],
  customModels: [],
  activeProviderId: null,
  activeModelId: null,
  activeAssistantId: 'general',
  preferences: DEFAULT_PREFERENCES,
  customAssistants: [],
  storageVersion: 1,
};

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_PREFIX = 'aiCore_';

function getStorageKey<K extends keyof AiCoreStorage>(key: K): string {
  return `${STORAGE_PREFIX}${key}`;
}

// ============================================================================
// Storage API
// ============================================================================

export const aiCoreStorage = {
  /**
   * Get a single value from storage
   */
  async get<K extends keyof AiCoreStorage>(key: K): Promise<AiCoreStorage[K]> {
    const storageKey = getStorageKey(key);
    const result = await chrome.storage.local.get(storageKey);
    return result[storageKey] ?? DEFAULT_STORAGE[key];
  },

  /**
   * Set a single value in storage
   */
  async set<K extends keyof AiCoreStorage>(key: K, value: AiCoreStorage[K]): Promise<void> {
    const storageKey = getStorageKey(key);
    await chrome.storage.local.set({ [storageKey]: value });
  },

  /**
   * Get all AI Core storage values
   */
  async getAll(): Promise<AiCoreStorage> {
    const keys = Object.keys(DEFAULT_STORAGE) as (keyof AiCoreStorage)[];
    const storageKeys = keys.map(getStorageKey);
    const result = await chrome.storage.local.get(storageKeys);

    const storage: Partial<AiCoreStorage> = {};
    for (const key of keys) {
      const storageKey = getStorageKey(key);
      storage[key] = result[storageKey] ?? DEFAULT_STORAGE[key];
    }

    return storage as AiCoreStorage;
  },

  /**
   * Set multiple values at once
   */
  async setMany(values: Partial<AiCoreStorage>): Promise<void> {
    const storageData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(values)) {
      storageData[getStorageKey(key as keyof AiCoreStorage)] = value;
    }
    await chrome.storage.local.set(storageData);
  },

  /**
   * Clear all AI Core storage
   */
  async clear(): Promise<void> {
    const keys = Object.keys(DEFAULT_STORAGE) as (keyof AiCoreStorage)[];
    const storageKeys = keys.map(getStorageKey);
    await chrome.storage.local.remove(storageKeys);
  },

  /**
   * Reset to defaults
   */
  async reset(): Promise<void> {
    await this.setMany(DEFAULT_STORAGE);
  },

  /**
   * Subscribe to storage changes
   */
  onChange(callback: (changes: Partial<AiCoreStorage>) => void): () => void {
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName !== 'local') return;

      const aiCoreChanges: Partial<AiCoreStorage> = {};
      let hasChanges = false;

      for (const [storageKey, change] of Object.entries(changes)) {
        if (storageKey.startsWith(STORAGE_PREFIX)) {
          const key = storageKey.slice(STORAGE_PREFIX.length) as keyof AiCoreStorage;
          if (key in DEFAULT_STORAGE) {
            (aiCoreChanges as Record<string, unknown>)[key] = change.newValue;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        callback(aiCoreChanges);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  },

  // ============================================================================
  // Provider-specific helpers
  // ============================================================================

  async getProviders(): Promise<ProviderConfig[]> {
    return this.get('providers');
  },

  async setProviders(providers: ProviderConfig[]): Promise<void> {
    return this.set('providers', providers);
  },

  async addProvider(provider: ProviderConfig): Promise<void> {
    const providers = await this.getProviders();
    const existing = providers.findIndex((p) => p.id === provider.id);
    if (existing >= 0) {
      providers[existing] = provider;
    } else {
      providers.push(provider);
    }
    await this.setProviders(providers);
  },

  async removeProvider(providerId: string): Promise<void> {
    const providers = await this.getProviders();
    await this.setProviders(providers.filter((p) => p.id !== providerId));
  },

  async updateProvider(providerId: string, updates: Partial<ProviderConfig>): Promise<void> {
    const providers = await this.getProviders();
    const index = providers.findIndex((p) => p.id === providerId);
    if (index >= 0) {
      providers[index] = { ...providers[index], ...updates };
      await this.setProviders(providers);
    }
  },

  // ============================================================================
  // Model-specific helpers
  // ============================================================================

  async getCustomModels(): Promise<Model[]> {
    return this.get('customModels');
  },

  async addCustomModel(model: Model): Promise<void> {
    const models = await this.getCustomModels();
    const existing = models.findIndex((m) => m.id === model.id);
    if (existing >= 0) {
      models[existing] = model;
    } else {
      models.push(model);
    }
    await this.set('customModels', models);
  },

  async removeCustomModel(modelId: string): Promise<void> {
    const models = await this.getCustomModels();
    await this.set(
      'customModels',
      models.filter((m) => m.id !== modelId),
    );
  },

  // ============================================================================
  // Selection helpers
  // ============================================================================

  async getActiveSelection(): Promise<{
    providerId: string | null;
    modelId: string | null;
    assistantId: string | null;
  }> {
    const [providerId, modelId, assistantId] = await Promise.all([
      this.get('activeProviderId'),
      this.get('activeModelId'),
      this.get('activeAssistantId'),
    ]);
    return { providerId, modelId, assistantId };
  },

  async setActiveModel(providerId: string, modelId: string): Promise<void> {
    await this.setMany({
      activeProviderId: providerId,
      activeModelId: modelId,
    });
  },

  async setActiveAssistant(assistantId: string): Promise<void> {
    await this.set('activeAssistantId', assistantId);
  },

  // ============================================================================
  // Preferences helpers
  // ============================================================================

  async getPreferences(): Promise<AiCorePreferences> {
    return this.get('preferences');
  },

  async updatePreferences(updates: Partial<AiCorePreferences>): Promise<void> {
    const current = await this.getPreferences();
    await this.set('preferences', { ...current, ...updates });
  },

  // ============================================================================
  // Custom assistants helpers
  // ============================================================================

  async getCustomAssistants(): Promise<Assistant[]> {
    return this.get('customAssistants');
  },

  async addCustomAssistant(assistant: Assistant): Promise<void> {
    const assistants = await this.getCustomAssistants();
    const existing = assistants.findIndex((a) => a.id === assistant.id);
    if (existing >= 0) {
      assistants[existing] = assistant;
    } else {
      assistants.push(assistant);
    }
    await this.set('customAssistants', assistants);
  },

  async removeCustomAssistant(assistantId: string): Promise<void> {
    const assistants = await this.getCustomAssistants();
    await this.set(
      'customAssistants',
      assistants.filter((a) => a.id !== assistantId),
    );
  },
};
