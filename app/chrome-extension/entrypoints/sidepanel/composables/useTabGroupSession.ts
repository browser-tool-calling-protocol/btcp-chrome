/**
 * Vue Composable for Tab Group Session Management
 *
 * Provides reactive state and methods for managing tab group sessions
 * in the sidepanel UI.
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';
import { BACKGROUND_MESSAGE_TYPES } from '@/common/message-types';

/**
 * Tab group session state interface (mirrors background service)
 */
export interface TabGroupSession {
  id: string;
  groupId: number;
  windowId: number;
  name: string;
  color: chrome.tabGroups.ColorEnum;
  createdAt: number;
  active: boolean;
}

/**
 * Tab info for display
 */
export interface SessionTab {
  tabId: number;
  url: string;
  title: string;
  active: boolean;
  favIconUrl?: string;
}

/**
 * Available tab group colors
 */
export const TAB_GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
  'grey',
  'blue',
  'red',
  'yellow',
  'green',
  'pink',
  'purple',
  'cyan',
  'orange',
];

export interface UseTabGroupSessionOptions {
  /** Auto-fetch session state on mount */
  autoFetch?: boolean;
}

export function useTabGroupSession(options: UseTabGroupSessionOptions = {}) {
  const { autoFetch = true } = options;

  // Reactive state
  const session = ref<TabGroupSession | null>(null);
  const tabs = ref<SessionTab[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Computed
  const hasActiveSession = computed(() => session.value !== null && session.value.active);
  const sessionName = computed(() => session.value?.name || '');
  const sessionColor = computed(() => session.value?.color || 'blue');
  const tabCount = computed(() => tabs.value.length);

  /**
   * Fetch current session state from background
   */
  async function fetchSession(): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const response = await chrome.runtime.sendMessage({
        type: BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_GET,
      });

      if (response?.success) {
        session.value = response.session || null;

        // Fetch tabs if session is active
        if (session.value?.active) {
          await fetchSessionTabs();
        } else {
          tabs.value = [];
        }
      } else {
        error.value = response?.error || 'Failed to get session';
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      console.error('Failed to fetch session:', e);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch tabs in the current session's tab group
   */
  async function fetchSessionTabs(): Promise<void> {
    if (!session.value?.groupId) {
      tabs.value = [];
      return;
    }

    try {
      const chromeTabs = await chrome.tabs.query({ groupId: session.value.groupId });
      tabs.value = chromeTabs.map((tab) => ({
        tabId: tab.id || 0,
        url: tab.url || '',
        title: tab.title || '',
        active: tab.active || false,
        favIconUrl: tab.favIconUrl,
      }));
    } catch (e) {
      console.error('Failed to fetch session tabs:', e);
      tabs.value = [];
    }
  }

  /**
   * Start a new session
   */
  async function startSession(options?: {
    name?: string;
    color?: chrome.tabGroups.ColorEnum;
    initialUrl?: string;
  }): Promise<boolean> {
    try {
      loading.value = true;
      error.value = null;

      const response = await chrome.runtime.sendMessage({
        type: BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_START,
        payload: options || {},
      });

      if (response?.success) {
        session.value = response.session;
        await fetchSessionTabs();
        return true;
      } else {
        error.value = response?.error || 'Failed to start session';
        return false;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      console.error('Failed to start session:', e);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * End the current session
   */
  async function endSession(): Promise<boolean> {
    try {
      loading.value = true;
      error.value = null;

      const response = await chrome.runtime.sendMessage({
        type: BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_END,
      });

      if (response?.success) {
        session.value = null;
        tabs.value = [];
        return true;
      } else {
        error.value = response?.error || 'Failed to end session';
        return false;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      console.error('Failed to end session:', e);
      return false;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Add a tab to the current session
   */
  async function addTabToSession(tabId: number): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_ADD_TAB,
        payload: { tabId },
      });

      if (response?.success) {
        await fetchSessionTabs();
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to add tab to session:', e);
      return false;
    }
  }

  /**
   * Switch to a tab in the session
   */
  async function switchToTab(tabId: number): Promise<void> {
    try {
      await chrome.tabs.update(tabId, { active: true });
      if (session.value?.windowId) {
        await chrome.windows.update(session.value.windowId, { focused: true });
      }
      await fetchSessionTabs();
    } catch (e) {
      console.error('Failed to switch to tab:', e);
    }
  }

  /**
   * Close a tab in the session
   */
  async function closeTab(tabId: number): Promise<void> {
    try {
      await chrome.tabs.remove(tabId);
      await fetchSessionTabs();
    } catch (e) {
      console.error('Failed to close tab:', e);
    }
  }

  /**
   * Handle session change events from background
   */
  function handleSessionChanged(message: any): void {
    if (message.type === BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_CHANGED) {
      session.value = message.payload || null;
      if (session.value?.active) {
        fetchSessionTabs();
      } else {
        tabs.value = [];
      }
    }
  }

  // Setup and teardown
  onMounted(() => {
    if (autoFetch) {
      fetchSession();
    }

    // Listen for session changes
    chrome.runtime.onMessage.addListener(handleSessionChanged);
  });

  onUnmounted(() => {
    chrome.runtime.onMessage.removeListener(handleSessionChanged);
  });

  return {
    // State
    session,
    tabs,
    loading,
    error,

    // Computed
    hasActiveSession,
    sessionName,
    sessionColor,
    tabCount,

    // Methods
    fetchSession,
    fetchSessionTabs,
    startSession,
    endSession,
    addTabToSession,
    switchToTab,
    closeTab,
  };
}
