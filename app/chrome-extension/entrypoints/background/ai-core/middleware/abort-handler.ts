/**
 * Abort Handler Middleware
 *
 * Handles request cancellation via AbortSignal
 */

import type { Middleware, MiddlewareContext } from '../types';

export function createAbortHandlerMiddleware(): Middleware {
  return {
    name: 'abort-handler',
    priority: 5, // Run very early

    async process(ctx: MiddlewareContext, next: () => Promise<void>): Promise<void> {
      const signal = ctx.request.abortSignal;

      // Check if already aborted before starting
      if (signal?.aborted) {
        ctx.aborted = true;
        ctx.response = {
          id: '',
          content: '',
          finishReason: 'cancelled',
        };
        return;
      }

      // Set up abort listener
      let abortHandler: (() => void) | undefined;
      if (signal) {
        abortHandler = () => {
          ctx.aborted = true;
          console.log('[AI Core] Request aborted by signal');
        };
        signal.addEventListener('abort', abortHandler);
      }

      try {
        await next();
      } finally {
        // Clean up abort listener
        if (signal && abortHandler) {
          signal.removeEventListener('abort', abortHandler);
        }
      }

      // If aborted during execution, update response
      if (ctx.aborted && ctx.response) {
        ctx.response.finishReason = 'cancelled';
      }
    },
  };
}

/**
 * Default abort handler middleware
 */
export const abortHandlerMiddleware = createAbortHandlerMiddleware();

/**
 * Helper to create an abort controller with timeout
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

/**
 * Combine multiple abort signals into one
 */
export function combineAbortSignals(...signals: (AbortSignal | undefined)[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal) {
      if (signal.aborted) {
        controller.abort();
        break;
      }
      signal.addEventListener('abort', () => controller.abort());
    }
  }

  return controller.signal;
}
