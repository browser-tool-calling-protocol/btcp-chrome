/**
 * MinApp Types
 *
 * Mini-application framework for browser-specific AI tasks
 */

import type { AiCoreService } from '../ai-core';

// ============================================================================
// MinApp Definition
// ============================================================================

export interface MinApp {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Short description */
  description: string;

  /** Emoji or icon name */
  icon: string;

  /** Category for organization */
  category: MinAppCategory;

  /** System prompt for AI interactions */
  systemPrompt: string;

  /** Enabled BTCP tools */
  tools?: string[];

  /** Preferred model ID (optional) */
  defaultModel?: string;

  /** Whether this MinApp requires user input */
  requiresInput?: boolean;

  /** Placeholder text for input */
  inputPlaceholder?: string;

  /** Execute the MinApp */
  execute(context: MinAppContext): Promise<MinAppResult>;
}

export type MinAppCategory = 'productivity' | 'research' | 'content' | 'automation' | 'utility';

// ============================================================================
// Execution Context
// ============================================================================

export interface MinAppContext {
  /** Current active tab */
  activeTab: chrome.tabs.Tab;

  /** Selected text on the page (if any) */
  selectedText?: string;

  /** Extracted page content */
  pageContent?: string;

  /** Page metadata */
  pageMeta?: PageMetadata;

  /** User-provided input */
  userInput?: string;

  /** AI Core service reference */
  aiCore: AiCoreService;

  /** Helper to execute browser tools */
  executeTool: (name: string, params: Record<string, unknown>) => Promise<unknown>;

  /** Helper to send AI completion */
  complete: (messages: Array<{ role: string; content: string }>) => Promise<string>;

  /** Progress callback */
  onProgress?: (message: string) => void;
}

export interface PageMetadata {
  title?: string;
  url?: string;
  description?: string;
  favicon?: string;
}

// ============================================================================
// Execution Result
// ============================================================================

export interface MinAppResult {
  /** Whether execution was successful */
  success: boolean;

  /** Output content (markdown supported) */
  output?: string;

  /** Structured data output */
  data?: Record<string, unknown>;

  /** Suggested follow-up actions */
  actions?: MinAppAction[];

  /** Error message if failed */
  error?: string;

  /** Execution duration in ms */
  duration?: number;
}

export interface MinAppAction {
  /** Action type */
  type: 'navigate' | 'copy' | 'download' | 'open_tab' | 'run_minapp';

  /** Display label */
  label: string;

  /** Action payload */
  payload: Record<string, unknown>;
}

// ============================================================================
// Registry Types
// ============================================================================

export interface MinAppRegistration {
  app: MinApp;
  enabled: boolean;
  usageCount: number;
  lastUsed?: number;
}

export interface MinAppExecutionLog {
  appId: string;
  timestamp: number;
  success: boolean;
  duration: number;
  tabUrl?: string;
  error?: string;
}
