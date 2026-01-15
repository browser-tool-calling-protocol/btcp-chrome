/**
 * Error Handler Middleware
 *
 * Catches and normalizes errors from providers
 */

import type { Middleware, MiddlewareContext } from '../types';

// ============================================================================
// Error Types
// ============================================================================

export class AiCoreError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public provider?: string,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AiCoreError';
  }
}

export class RateLimitError extends AiCoreError {
  constructor(
    message: string,
    provider: string,
    public retryAfter?: number,
  ) {
    super(message, 'RATE_LIMIT', 429, provider, true);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends AiCoreError {
  constructor(message: string, provider: string) {
    super(message, 'AUTH_ERROR', 401, provider, false);
    this.name = 'AuthenticationError';
  }
}

export class ModelNotFoundError extends AiCoreError {
  constructor(model: string, provider: string) {
    super(`Model "${model}" not found`, 'MODEL_NOT_FOUND', 404, provider, false);
    this.name = 'ModelNotFoundError';
  }
}

export class ContextLengthError extends AiCoreError {
  constructor(message: string, provider: string) {
    super(message, 'CONTEXT_LENGTH', 400, provider, false);
    this.name = 'ContextLengthError';
  }
}

export class ContentFilterError extends AiCoreError {
  constructor(message: string, provider: string) {
    super(message, 'CONTENT_FILTER', 400, provider, false);
    this.name = 'ContentFilterError';
  }
}

export class NetworkError extends AiCoreError {
  constructor(message: string, provider: string) {
    super(message, 'NETWORK_ERROR', undefined, provider, true);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Error Handler Middleware
// ============================================================================

export interface ErrorHandlerOptions {
  maxRetries: number;
  retryDelayMs: number;
  retryableStatusCodes: number[];
}

const DEFAULT_OPTIONS: ErrorHandlerOptions = {
  maxRetries: 2,
  retryDelayMs: 1000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export function createErrorHandlerMiddleware(
  options: Partial<ErrorHandlerOptions> = {},
): Middleware {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: 'error-handler',
    priority: 15, // Run after logging but before provider calls

    async process(ctx: MiddlewareContext, next: () => Promise<void>): Promise<void> {
      let lastError: Error | undefined;
      let attempts = 0;

      while (attempts <= opts.maxRetries) {
        try {
          await next();
          return; // Success
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          ctx.error = lastError;
          attempts++;

          // Check if error is retryable
          const shouldRetry = isRetryableError(lastError, opts);
          if (!shouldRetry || attempts > opts.maxRetries) {
            throw normalizeError(lastError, ctx.provider.id);
          }

          // Wait before retry
          const delay = getRetryDelay(lastError, attempts, opts);
          console.log(`[AI Core] Retrying in ${delay}ms (attempt ${attempts}/${opts.maxRetries})`);
          await sleep(delay);
        }
      }

      // Should not reach here, but just in case
      throw lastError || new AiCoreError('Unknown error', 'UNKNOWN', undefined, ctx.provider.id);
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function isRetryableError(error: Error, opts: ErrorHandlerOptions): boolean {
  // Check if it's a known retryable error type
  if (error instanceof AiCoreError && error.retryable) {
    return true;
  }

  // Check for retryable status codes in error message/name
  for (const code of opts.retryableStatusCodes) {
    if (error.message.includes(String(code))) {
      return true;
    }
  }

  // Network errors are usually retryable
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

function getRetryDelay(error: Error, attempt: number, opts: ErrorHandlerOptions): number {
  // Use retry-after header if available
  if (error instanceof RateLimitError && error.retryAfter) {
    return error.retryAfter * 1000;
  }

  // Exponential backoff
  return opts.retryDelayMs * Math.pow(2, attempt - 1);
}

function normalizeError(error: Error, providerId: string): AiCoreError {
  // Already normalized
  if (error instanceof AiCoreError) {
    return error;
  }

  const message = error.message.toLowerCase();

  // Detect error type from message patterns
  if (message.includes('rate limit') || message.includes('429')) {
    return new RateLimitError(error.message, providerId);
  }
  if (
    message.includes('unauthorized') ||
    message.includes('invalid api key') ||
    message.includes('401')
  ) {
    return new AuthenticationError(error.message, providerId);
  }
  if (message.includes('model not found') || message.includes('does not exist')) {
    return new ModelNotFoundError(message, providerId);
  }
  if (
    message.includes('context length') ||
    message.includes('too long') ||
    message.includes('maximum')
  ) {
    return new ContextLengthError(error.message, providerId);
  }
  if (
    message.includes('content filter') ||
    message.includes('safety') ||
    message.includes('blocked')
  ) {
    return new ContentFilterError(error.message, providerId);
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return new NetworkError(error.message, providerId);
  }

  // Generic error
  return new AiCoreError(error.message, 'UNKNOWN', undefined, providerId, false);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Default error handler middleware
 */
export const errorHandlerMiddleware = createErrorHandlerMiddleware();
