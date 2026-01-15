/**
 * MinApp Registry
 *
 * Manages registration and execution of mini-applications
 */

import type {
  MinApp,
  MinAppRegistration,
  MinAppContext,
  MinAppResult,
  MinAppExecutionLog,
} from './types';
import { getAiCore } from '../ai-core';

// Built-in MinApps
import { pageSummarizerApp } from './apps/page-summarizer';
import { tabOrganizerApp } from './apps/tab-organizer';
import { contentExtractorApp } from './apps/content-extractor';
import { quickTranslatorApp } from './apps/quick-translator';

// ============================================================================
// Registry State
// ============================================================================

const registry = new Map<string, MinAppRegistration>();
const executionLogs: MinAppExecutionLog[] = [];
const MAX_LOGS = 100;

// ============================================================================
// Built-in Apps Registration
// ============================================================================

function registerBuiltinApps() {
  const builtins: MinApp[] = [
    pageSummarizerApp,
    tabOrganizerApp,
    contentExtractorApp,
    quickTranslatorApp,
  ];

  for (const app of builtins) {
    registry.set(app.id, {
      app,
      enabled: true,
      usageCount: 0,
    });
  }

  console.log(`[MinApps] Registered ${builtins.length} built-in apps`);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize the MinApp registry
 */
export function initMinAppRegistry(): void {
  registerBuiltinApps();
}

/**
 * Get all registered MinApps
 */
export function getAllMinApps(): MinApp[] {
  return Array.from(registry.values())
    .filter((r) => r.enabled)
    .map((r) => r.app);
}

/**
 * Get a MinApp by ID
 */
export function getMinApp(id: string): MinApp | undefined {
  return registry.get(id)?.app;
}

/**
 * Get MinApps by category
 */
export function getMinAppsByCategory(category: string): MinApp[] {
  return Array.from(registry.values())
    .filter((r) => r.enabled && r.app.category === category)
    .map((r) => r.app);
}

/**
 * Register a custom MinApp
 */
export function registerMinApp(app: MinApp): void {
  registry.set(app.id, {
    app,
    enabled: true,
    usageCount: 0,
  });
}

/**
 * Unregister a MinApp
 */
export function unregisterMinApp(id: string): boolean {
  return registry.delete(id);
}

/**
 * Execute a MinApp
 */
export async function executeMinApp(
  appId: string,
  options: {
    tabId?: number;
    userInput?: string;
    onProgress?: (message: string) => void;
  } = {},
): Promise<MinAppResult> {
  const registration = registry.get(appId);
  if (!registration) {
    return {
      success: false,
      error: `MinApp not found: ${appId}`,
    };
  }

  const { app } = registration;
  const startTime = Date.now();

  try {
    // Get active tab
    let activeTab: chrome.tabs.Tab;
    if (options.tabId) {
      activeTab = await chrome.tabs.get(options.tabId);
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        return { success: false, error: 'No active tab found' };
      }
      activeTab = tab;
    }

    // Build execution context
    const context = await buildContext(activeTab, options);

    // Execute the app
    options.onProgress?.(`Running ${app.name}...`);
    const result = await app.execute(context);

    // Log execution
    const duration = Date.now() - startTime;
    logExecution({
      appId,
      timestamp: Date.now(),
      success: result.success,
      duration,
      tabUrl: activeTab.url,
      error: result.error,
    });

    // Update usage stats
    registration.usageCount++;
    registration.lastUsed = Date.now();

    return {
      ...result,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logExecution({
      appId,
      timestamp: Date.now(),
      success: false,
      duration,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Get recent execution logs
 */
export function getExecutionLogs(limit = 20): MinAppExecutionLog[] {
  return executionLogs.slice(-limit);
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function buildContext(
  activeTab: chrome.tabs.Tab,
  options: {
    userInput?: string;
    onProgress?: (message: string) => void;
  },
): Promise<MinAppContext> {
  const aiCore = getAiCore();

  // Try to get page content
  let pageContent: string | undefined;
  let selectedText: string | undefined;

  if (activeTab.id) {
    try {
      // Get selected text
      const [selection] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => window.getSelection()?.toString() || '',
      });
      if (selection?.result) {
        selectedText = selection.result;
      }
    } catch {
      // Content script may not be injectable
    }
  }

  // Helper to execute browser tools
  const executeTool = async (name: string, params: Record<string, unknown>): Promise<unknown> => {
    const response = await chrome.runtime.sendMessage({
      type: 'call_tool',
      name,
      args: params,
    });
    if (!response?.success) {
      throw new Error(response?.error || 'Tool execution failed');
    }
    return response.result;
  };

  // Helper for AI completion
  const complete = async (messages: Array<{ role: string; content: string }>): Promise<string> => {
    const activeModel = await aiCore.getActiveModel();
    if (!activeModel) {
      throw new Error('No AI model selected');
    }

    const response = await aiCore.complete({
      model: activeModel.model.id,
      messages: messages as any,
    });

    return response.content;
  };

  return {
    activeTab,
    selectedText,
    pageContent,
    pageMeta: {
      title: activeTab.title,
      url: activeTab.url,
      favicon: activeTab.favIconUrl,
    },
    userInput: options.userInput,
    aiCore,
    executeTool,
    complete,
    onProgress: options.onProgress,
  };
}

function logExecution(log: MinAppExecutionLog): void {
  executionLogs.push(log);
  if (executionLogs.length > MAX_LOGS) {
    executionLogs.shift();
  }
}

// ============================================================================
// Message Handlers
// ============================================================================

export function registerMinAppHandlers(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message.type?.startsWith('MINAPP_')) return false;

    handleMinAppMessage(message)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      });

    return true;
  });
}

async function handleMinAppMessage(message: {
  type: string;
  payload?: unknown;
}): Promise<{ success: boolean; data?: unknown; error?: string }> {
  switch (message.type) {
    case 'MINAPP_LIST': {
      const apps = getAllMinApps();
      return { success: true, data: apps };
    }

    case 'MINAPP_GET': {
      const { appId } = message.payload as { appId: string };
      const app = getMinApp(appId);
      return { success: true, data: app };
    }

    case 'MINAPP_EXECUTE': {
      const { appId, tabId, userInput } = message.payload as {
        appId: string;
        tabId?: number;
        userInput?: string;
      };
      const result = await executeMinApp(appId, { tabId, userInput });
      return { success: result.success, data: result, error: result.error };
    }

    case 'MINAPP_LOGS': {
      const { limit } = (message.payload as { limit?: number }) || {};
      const logs = getExecutionLogs(limit);
      return { success: true, data: logs };
    }

    default:
      return { success: false, error: `Unknown message type: ${message.type}` };
  }
}
