/**
 * MinApps Module Entry
 *
 * Mini-application framework for browser-specific AI tasks
 */

export * from './types';
export {
  initMinAppRegistry,
  getAllMinApps,
  getMinApp,
  getMinAppsByCategory,
  registerMinApp,
  unregisterMinApp,
  executeMinApp,
  getExecutionLogs,
  registerMinAppHandlers,
} from './registry';

// Re-export built-in apps for direct access
export { pageSummarizerApp } from './apps/page-summarizer';
export { tabOrganizerApp } from './apps/tab-organizer';
export { contentExtractorApp } from './apps/content-extractor';
export { quickTranslatorApp } from './apps/quick-translator';
