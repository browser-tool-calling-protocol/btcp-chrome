/**
 * BTCP Tool Adapter
 *
 * Wraps existing tool implementations from the Chrome extension
 * to work with the BTCP (Browser Tool Calling Protocol) client.
 *
 * This adapter converts between the MCP ToolResult format used internally
 * and the BTCP response format expected by the BTCP server.
 */

import { handleCallTool } from './tools/index';
import type { ToolResult } from '@/common/tool-handler';

/**
 * BTCP Content Types
 */
export interface BTCPTextContent {
  type: 'text';
  text: string;
}

export interface BTCPImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export type BTCPContent = BTCPTextContent | BTCPImageContent;

/**
 * BTCP Tool Call Response format
 */
export interface BTCPToolCallResponse {
  content: BTCPContent[];
  isError?: boolean;
}

/**
 * Create a text content object
 */
export function createTextContent(text: string): BTCPTextContent {
  return { type: 'text', text };
}

/**
 * Create an image content object
 */
export function createImageContent(data: string, mimeType: string): BTCPImageContent {
  return { type: 'image', data, mimeType };
}

/**
 * BTCP Tool Adapter interface
 */
export interface BTCPToolAdapter {
  /**
   * Execute a tool and return the result in BTCP format
   */
  execute(toolName: string, params: Record<string, unknown>): Promise<BTCPToolCallResponse>;
}

/**
 * Convert MCP ToolResult to BTCP response format
 */
function convertToBTCPResponse(mcpResult: ToolResult): BTCPToolCallResponse {
  const content: BTCPContent[] = mcpResult.content.map((item) => {
    if (item.type === 'text') {
      return createTextContent(item.text);
    } else if (item.type === 'image') {
      return createImageContent(item.data, item.mimeType);
    }
    // Fallback for unknown content types - stringify as JSON
    return createTextContent(JSON.stringify(item));
  });

  return {
    content,
    isError: mcpResult.isError,
  };
}

/**
 * Create a BTCP Tool Adapter that wraps existing tool implementations
 */
export function createBTCPToolAdapter(): BTCPToolAdapter {
  return {
    async execute(
      toolName: string,
      params: Record<string, unknown>,
    ): Promise<BTCPToolCallResponse> {
      try {
        // Call existing tool implementation
        const result: ToolResult = await handleCallTool({
          name: toolName,
          args: params,
        });

        // Convert MCP ToolResult to BTCP response format
        return convertToBTCPResponse(result);
      } catch (error) {
        // Return error in BTCP format
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[BTCPToolAdapter] Error executing tool ${toolName}:`, error);

        return {
          content: [createTextContent(`Error executing tool ${toolName}: ${errorMessage}`)],
          isError: true,
        };
      }
    },
  };
}

/**
 * Singleton adapter instance for use across the extension
 */
let adapterInstance: BTCPToolAdapter | null = null;

/**
 * Get or create the BTCP tool adapter singleton
 */
export function getBTCPToolAdapter(): BTCPToolAdapter {
  if (!adapterInstance) {
    adapterInstance = createBTCPToolAdapter();
  }
  return adapterInstance;
}
