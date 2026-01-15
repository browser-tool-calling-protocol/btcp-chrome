/**
 * Provider Registry
 *
 * Central registry for all provider adapters
 */

import type { BaseApiClient, ProviderConfig } from '../types';
import { OpenAIClient, openaiClient } from './openai';
import { AnthropicClient, anthropicClient } from './anthropic';
import { GoogleClient, googleClient } from './google';
import { OllamaClient, ollamaClient } from './ollama';

// Re-export all provider clients
export { OpenAIClient, openaiClient } from './openai';
export { AnthropicClient, anthropicClient } from './anthropic';
export { GoogleClient, googleClient } from './google';
export { OllamaClient, ollamaClient } from './ollama';
export { BaseProviderClient, generateResponseId } from './base';

// ============================================================================
// Provider Registry
// ============================================================================

/**
 * Map of provider IDs to client instances
 */
const providerRegistry = new Map<string, BaseApiClient>([
  ['openai', openaiClient],
  ['anthropic', anthropicClient],
  ['google', googleClient],
  ['ollama', ollamaClient],
]);

/**
 * Get a client for a specific provider
 */
export function getProviderClient(providerId: string): BaseApiClient | undefined {
  return providerRegistry.get(providerId);
}

/**
 * Register a custom provider client
 */
export function registerProviderClient(providerId: string, client: BaseApiClient): void {
  providerRegistry.set(providerId, client);
}

/**
 * Remove a provider client
 */
export function unregisterProviderClient(providerId: string): boolean {
  return providerRegistry.delete(providerId);
}

/**
 * Get all registered provider IDs
 */
export function getRegisteredProviderIds(): string[] {
  return Array.from(providerRegistry.keys());
}

/**
 * Create a client for an OpenAI-compatible provider
 */
export function createOpenAICompatibleClient(providerId: string): BaseApiClient {
  const client = new OpenAIClient();
  (client as { providerId: string }).providerId = providerId;
  return client;
}

/**
 * Auto-detect and get/create client for a provider config
 */
export function getOrCreateClient(config: ProviderConfig): BaseApiClient {
  // Check if we have a registered client
  let client = getProviderClient(config.id);

  if (!client) {
    // For custom providers, create an OpenAI-compatible client
    client = createOpenAICompatibleClient(config.id);
    registerProviderClient(config.id, client);
  }

  return client;
}
