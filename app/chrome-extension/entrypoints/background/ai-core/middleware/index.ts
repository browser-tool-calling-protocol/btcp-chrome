/**
 * Middleware Chain Runner
 *
 * Executes middleware in order, supporting both request and response processing
 */

import type { Middleware, MiddlewareContext } from '../types';

export class MiddlewareChain {
  private middlewares: Middleware[] = [];

  /**
   * Add a middleware to the chain
   */
  use(middleware: Middleware): this {
    this.middlewares.push(middleware);
    // Sort by priority (lower runs first)
    this.middlewares.sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
    return this;
  }

  /**
   * Remove a middleware by name
   */
  remove(name: string): boolean {
    const index = this.middlewares.findIndex((m) => m.name === name);
    if (index >= 0) {
      this.middlewares.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all registered middlewares
   */
  list(): Middleware[] {
    return [...this.middlewares];
  }

  /**
   * Execute the middleware chain
   */
  async execute(ctx: MiddlewareContext): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (ctx.aborted) return;

      const middleware = this.middlewares[index++];
      if (middleware) {
        try {
          await middleware.process(ctx, next);
        } catch (error) {
          ctx.error = error instanceof Error ? error : new Error(String(error));
          // Allow error to propagate for error handling middleware
          throw error;
        }
      }
    };

    await next();
  }
}

/**
 * Create a new middleware chain with default middlewares
 */
export function createMiddlewareChain(): MiddlewareChain {
  const chain = new MiddlewareChain();

  // Import and register default middlewares
  // These are registered in the order they should run
  return chain;
}

export * from './logging';
export * from './abort-handler';
export * from './error-handler';
