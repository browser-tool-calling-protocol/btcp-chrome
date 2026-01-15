/**
 * Logging Middleware
 *
 * Logs request/response for debugging and analytics
 */

import type { Middleware, MiddlewareContext } from '../types';

export interface LoggingOptions {
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
  logTiming: boolean;
  redactApiKeys: boolean;
}

const DEFAULT_OPTIONS: LoggingOptions = {
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logTiming: true,
  redactApiKeys: true,
};

export function createLoggingMiddleware(options: Partial<LoggingOptions> = {}): Middleware {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: 'logging',
    priority: 10, // Run early

    async process(ctx: MiddlewareContext, next: () => Promise<void>): Promise<void> {
      const startTime = Date.now();
      const requestId = crypto.randomUUID().slice(0, 8);

      // Log request
      if (opts.logRequests) {
        console.log(`[AI Core] Request ${requestId}:`, {
          model: ctx.request.model,
          provider: ctx.provider.id,
          messageCount: ctx.request.messages.length,
          hasTools: !!ctx.request.tools?.length,
          stream: ctx.request.stream,
        });
      }

      // Store request ID in metadata
      ctx.metadata.requestId = requestId;
      ctx.metadata.startTime = startTime;

      try {
        await next();

        // Log response
        if (opts.logResponses && ctx.response) {
          const duration = Date.now() - startTime;
          console.log(`[AI Core] Response ${requestId}:`, {
            finishReason: ctx.response.finishReason,
            contentLength: ctx.response.content.length,
            toolCalls: ctx.response.toolCalls?.length ?? 0,
            usage: ctx.response.usage,
            ...(opts.logTiming && { duration: `${duration}ms` }),
          });
        }
      } catch (error) {
        // Log error
        if (opts.logErrors) {
          const duration = Date.now() - startTime;
          console.error(`[AI Core] Error ${requestId}:`, {
            error: error instanceof Error ? error.message : String(error),
            provider: ctx.provider.id,
            model: ctx.request.model,
            ...(opts.logTiming && { duration: `${duration}ms` }),
          });
        }
        throw error;
      }
    },
  };
}

/**
 * Simple console logger for development
 */
export const loggingMiddleware = createLoggingMiddleware();
