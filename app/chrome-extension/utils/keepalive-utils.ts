/**
 * @fileoverview Keepalive Utilities
 * @description Production-ready utilities for wrapping async operations with Service Worker keepalive.
 *
 * These utilities ensure that long-running operations (like WASM/ML inference) complete
 * without the Service Worker being terminated by Chrome (which happens after ~30s of inactivity).
 */

import { acquireKeepalive } from '@/entrypoints/background/keepalive-manager';

const LOG_PREFIX = '[KeepaliveUtils]';

/**
 * Configuration for keepalive-wrapped operations
 */
export interface KeepaliveOperationConfig {
  /** Tag for identifying the operation in logs */
  tag: string;
  /** Timeout in milliseconds (default: 60000ms) */
  timeout?: number;
  /** Whether to retry on failure (default: false) */
  retry?: boolean;
  /** Number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Whether to use exponential backoff for retries (default: true) */
  exponentialBackoff?: boolean;
}

/**
 * Result of a keepalive-wrapped operation
 */
export interface KeepaliveOperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts?: number;
  duration?: number;
}

/**
 * Wraps an async operation with keepalive acquisition.
 * Ensures the Service Worker stays alive during the operation.
 *
 * @param tag - Identifier for the operation (for debugging)
 * @param operation - The async operation to execute
 * @returns The result of the operation
 *
 * @example
 * ```typescript
 * const embedding = await withKeepalive('semantic-embedding', async () => {
 *   return await engine.getEmbedding(text);
 * });
 * ```
 */
export async function withKeepalive<T>(tag: string, operation: () => Promise<T>): Promise<T> {
  const release = acquireKeepalive(tag);
  try {
    return await operation();
  } finally {
    release();
  }
}

/**
 * Wraps an async operation with keepalive, timeout, and optional retry logic.
 * Production-ready wrapper for critical operations.
 *
 * @param config - Configuration for the operation
 * @param operation - The async operation to execute
 * @returns Result object with success status and data/error
 *
 * @example
 * ```typescript
 * const result = await withKeepaliveAndRetry(
 *   { tag: 'model-init', timeout: 30000, retry: true, maxRetries: 3 },
 *   async () => await initializeModel()
 * );
 * if (result.success) {
 *   console.log('Model initialized:', result.data);
 * } else {
 *   console.error('Failed:', result.error);
 * }
 * ```
 */
export async function withKeepaliveAndRetry<T>(
  config: KeepaliveOperationConfig,
  operation: () => Promise<T>,
): Promise<KeepaliveOperationResult<T>> {
  const {
    tag,
    timeout = 60000,
    retry = false,
    maxRetries = 3,
    retryDelay = 1000,
    exponentialBackoff = true,
  } = config;

  const startTime = Date.now();
  let attempts = 0;
  let lastError: Error | undefined;

  const executeWithTimeout = async (): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation '${tag}' timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  };

  const release = acquireKeepalive(tag);

  try {
    while (attempts < (retry ? maxRetries : 1)) {
      attempts++;
      try {
        console.debug(`${LOG_PREFIX} [${tag}] Attempt ${attempts}/${retry ? maxRetries : 1}`);
        const data = await executeWithTimeout();
        const duration = Date.now() - startTime;
        console.debug(
          `${LOG_PREFIX} [${tag}] Completed in ${duration}ms after ${attempts} attempt(s)`,
        );
        return { success: true, data, attempts, duration };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`${LOG_PREFIX} [${tag}] Attempt ${attempts} failed:`, lastError.message);

        if (retry && attempts < maxRetries) {
          const delay = exponentialBackoff ? retryDelay * Math.pow(2, attempts - 1) : retryDelay;
          console.debug(`${LOG_PREFIX} [${tag}] Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    const duration = Date.now() - startTime;
    return { success: false, error: lastError, attempts, duration };
  } finally {
    release();
  }
}

/**
 * Creates a keepalive scope that can be used for multiple operations.
 * Useful when you need to perform several related operations without
 * acquiring/releasing keepalive for each one.
 *
 * @param tag - Identifier for the scope
 * @returns Object with execute function and release function
 *
 * @example
 * ```typescript
 * const scope = createKeepaliveScope('batch-indexing');
 * try {
 *   for (const item of items) {
 *     await scope.execute(() => processItem(item));
 *   }
 * } finally {
 *   scope.release();
 * }
 * ```
 */
export function createKeepaliveScope(tag: string): {
  execute: <T>(operation: () => Promise<T>) => Promise<T>;
  release: () => void;
  isActive: () => boolean;
} {
  let isReleased = false;
  const release = acquireKeepalive(tag);

  return {
    execute: async <T>(operation: () => Promise<T>): Promise<T> => {
      if (isReleased) {
        throw new Error(`Keepalive scope '${tag}' has already been released`);
      }
      return operation();
    },
    release: () => {
      if (!isReleased) {
        release();
        isReleased = true;
      }
    },
    isActive: () => !isReleased,
  };
}

/**
 * Batch processor with keepalive support.
 * Processes items in batches while maintaining SW keepalive.
 *
 * @param items - Items to process
 * @param processor - Function to process each item
 * @param config - Configuration options
 * @returns Array of results
 *
 * @example
 * ```typescript
 * const embeddings = await batchWithKeepalive(
 *   texts,
 *   async (text) => await engine.getEmbedding(text),
 *   { tag: 'batch-embedding', batchSize: 10, delayBetweenBatches: 100 }
 * );
 * ```
 */
export async function batchWithKeepalive<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  config: {
    tag: string;
    batchSize?: number;
    delayBetweenBatches?: number;
    onProgress?: (completed: number, total: number) => void;
    continueOnError?: boolean;
  },
): Promise<{ results: R[]; errors: Array<{ index: number; error: Error }> }> {
  const {
    tag,
    batchSize = 10,
    delayBetweenBatches = 50,
    onProgress,
    continueOnError = true,
  } = config;

  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];

  const release = acquireKeepalive(tag);

  try {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, Math.min(i + batchSize, items.length));

      for (let j = 0; j < batch.length; j++) {
        const globalIndex = i + j;
        try {
          const result = await processor(batch[j], globalIndex);
          results[globalIndex] = result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push({ index: globalIndex, error: err });
          console.warn(`${LOG_PREFIX} [${tag}] Error processing item ${globalIndex}:`, err.message);
          if (!continueOnError) {
            throw err;
          }
        }
      }

      onProgress?.(Math.min(i + batchSize, items.length), items.length);

      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < items.length && delayBetweenBatches > 0) {
        await sleep(delayBetweenBatches);
      }
    }

    return { results, errors };
  } finally {
    release();
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Health check for offscreen document connection.
 * Verifies that the offscreen document is responsive.
 *
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns True if offscreen is healthy
 */
export async function checkOffscreenHealth(timeout: number = 5000): Promise<boolean> {
  try {
    const response = await Promise.race([
      chrome.runtime.sendMessage({
        target: 'offscreen',
        type: 'HEALTH_CHECK',
      }),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout),
      ),
    ]);

    return response !== null && (response as any)?.healthy === true;
  } catch (error) {
    console.warn(`${LOG_PREFIX} Offscreen health check failed:`, error);
    return false;
  }
}

/**
 * Ensure offscreen document is ready with keepalive protection.
 * Creates offscreen if needed and verifies it's responsive.
 *
 * @param maxAttempts - Maximum creation attempts (default: 3)
 * @returns True if offscreen is ready
 */
export async function ensureOffscreenReady(maxAttempts: number = 3): Promise<boolean> {
  const release = acquireKeepalive('ensure-offscreen');

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const { OffscreenManager } = await import('./offscreen-manager');
        await OffscreenManager.getInstance().ensureOffscreenDocument();

        // Give it a moment to initialize
        await sleep(100);

        const healthy = await checkOffscreenHealth();
        if (healthy) {
          console.debug(`${LOG_PREFIX} Offscreen document ready after ${attempt} attempt(s)`);
          return true;
        }

        console.warn(`${LOG_PREFIX} Offscreen not healthy, attempt ${attempt}/${maxAttempts}`);
      } catch (error) {
        console.warn(`${LOG_PREFIX} Failed to ensure offscreen (attempt ${attempt}):`, error);
      }

      if (attempt < maxAttempts) {
        await sleep(1000 * attempt);
      }
    }

    return false;
  } finally {
    release();
  }
}
