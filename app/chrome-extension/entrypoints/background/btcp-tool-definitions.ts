/**
 * BTCP Tool Definitions
 *
 * Converts MCP tool schemas from chrome-mcp-shared to BTCP format.
 * These definitions are registered with the BTCP server when the extension connects.
 */

import { TOOL_SCHEMAS, TOOL_NAMES } from 'chrome-mcp-shared';

/**
 * JSON Schema type for BTCP tool input schemas
 */
export interface JsonSchema {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: (string | number | boolean)[];
  description?: string;
  oneOf?: JsonSchema[];
  [key: string]: unknown;
}

/**
 * BTCP Tool Example for better AI understanding
 */
export interface BTCPToolExample {
  name: string;
  params: Record<string, unknown>;
  description?: string;
}

/**
 * BTCP Tool Definition format
 */
export interface BTCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  examples?: BTCPToolExample[];
}

/**
 * Generate tool-specific examples for better AI understanding
 */
function generateToolExamples(toolName: string): BTCPToolExample[] {
  const exampleMap: Record<string, BTCPToolExample[]> = {
    [TOOL_NAMES.BROWSER.NAVIGATE]: [
      {
        name: 'Navigate to URL',
        params: { url: 'https://example.com' },
        description: 'Navigate to a specific URL in the current tab',
      },
      {
        name: 'Go back',
        params: { url: 'back' },
        description: 'Navigate back in browser history',
      },
      {
        name: 'Open in new window',
        params: { url: 'https://example.com', newWindow: true },
        description: 'Open URL in a new window',
      },
    ],
    [TOOL_NAMES.BROWSER.CLICK]: [
      {
        name: 'Click by selector',
        params: { selector: 'button.submit' },
        description: 'Click an element using CSS selector',
      },
      {
        name: 'Click by ref',
        params: { ref: 'e1' },
        description: 'Click an element using accessibility tree reference',
      },
      {
        name: 'Click by coordinates',
        params: { coordinates: { x: 100, y: 200 } },
        description: 'Click at specific viewport coordinates',
      },
    ],
    [TOOL_NAMES.BROWSER.FILL]: [
      {
        name: 'Fill text input',
        params: { selector: 'input[name="email"]', value: 'user@example.com' },
        description: 'Fill a text input with a value',
      },
      {
        name: 'Check checkbox',
        params: { ref: 'e5', value: true },
        description: 'Check a checkbox element',
      },
    ],
    [TOOL_NAMES.BROWSER.SCREENSHOT]: [
      {
        name: 'Take full page screenshot',
        params: { fullPage: true, storeBase64: true },
        description: 'Capture the entire page and return as base64',
      },
      {
        name: 'Screenshot element',
        params: { selector: '#main-content' },
        description: 'Screenshot a specific element',
      },
    ],
    [TOOL_NAMES.BROWSER.READ_PAGE]: [
      {
        name: 'Get all visible elements',
        params: {},
        description: 'Get accessibility tree of all visible elements',
      },
      {
        name: 'Get interactive elements only',
        params: { filter: 'interactive' },
        description: 'Get only buttons, links, inputs, etc.',
      },
    ],
    [TOOL_NAMES.BROWSER.COMPUTER]: [
      {
        name: 'Take screenshot',
        params: { action: 'screenshot' },
        description: 'Capture a screenshot of the current tab',
      },
      {
        name: 'Click element',
        params: { action: 'left_click', ref: 'e1' },
        description: 'Click an element by reference',
      },
      {
        name: 'Type text',
        params: { action: 'type', text: 'Hello World' },
        description: 'Type text at current focus',
      },
      {
        name: 'Scroll down',
        params: { action: 'scroll', scrollDirection: 'down', scrollAmount: 3 },
        description: 'Scroll the page down',
      },
    ],
    [TOOL_NAMES.BROWSER.KEYBOARD]: [
      {
        name: 'Press Enter',
        params: { keys: 'Enter' },
        description: 'Press the Enter key',
      },
      {
        name: 'Copy shortcut',
        params: { keys: 'Ctrl+C' },
        description: 'Press Ctrl+C to copy',
      },
    ],
    [TOOL_NAMES.BROWSER.JAVASCRIPT]: [
      {
        name: 'Get page title',
        params: { code: 'return document.title' },
        description: 'Execute JavaScript to get the page title',
      },
    ],
    [TOOL_NAMES.BROWSER.WEB_FETCHER]: [
      {
        name: 'Get page text content',
        params: { textContent: true },
        description: 'Extract visible text from the current page',
      },
    ],
    [TOOL_NAMES.BROWSER.NETWORK_CAPTURE]: [
      {
        name: 'Start capture',
        params: { action: 'start' },
        description: 'Start capturing network requests',
      },
      {
        name: 'Stop and get results',
        params: { action: 'stop' },
        description: 'Stop capture and retrieve network logs',
      },
    ],
    [TOOL_NAMES.BROWSER.CONSOLE]: [
      {
        name: 'Get console logs',
        params: {},
        description: 'Capture console output from the current tab',
      },
      {
        name: 'Get errors only',
        params: { onlyErrors: true },
        description: 'Get only error-level console messages',
      },
    ],
    [TOOL_NAMES.BROWSER.HISTORY]: [
      {
        name: 'Search recent history',
        params: { text: 'github', maxResults: 20 },
        description: 'Search browser history for GitHub pages',
      },
    ],
    [TOOL_NAMES.BROWSER.BOOKMARK_SEARCH]: [
      {
        name: 'Find bookmarks',
        params: { query: 'documentation' },
        description: 'Search bookmarks by keyword',
      },
    ],
  };

  return exampleMap[toolName] || [];
}

/**
 * Convert MCP tool schemas to BTCP tool definitions
 */
export function convertMCPToBTCPToolDefinitions(): BTCPToolDefinition[] {
  return TOOL_SCHEMAS.map((mcpTool) => ({
    name: mcpTool.name,
    description: mcpTool.description || '',
    inputSchema: mcpTool.inputSchema as JsonSchema,
    examples: generateToolExamples(mcpTool.name),
  }));
}

/**
 * Pre-computed BTCP tool definitions for registration
 */
export const BTCP_TOOL_DEFINITIONS = convertMCPToBTCPToolDefinitions();

/**
 * Get a tool definition by name
 */
export function getToolDefinition(name: string): BTCPToolDefinition | undefined {
  return BTCP_TOOL_DEFINITIONS.find((tool) => tool.name === name);
}
