/**
 * Tab Group Session Service
 *
 * Manages tab group sessions for scoped browser automation.
 * When a session is active, all browser tools operate only within the session's tab group.
 */

import { STORAGE_KEYS } from '@/common/constants';
import { BACKGROUND_MESSAGE_TYPES } from '@/common/message-types';

const LOG_PREFIX = '[TabGroupSession]';

// Tab group colors available in Chrome
const TAB_GROUP_COLORS: chrome.tabGroups.ColorEnum[] = [
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

/**
 * Session state interface
 */
export interface TabGroupSession {
  /** Unique session ID */
  id: string;
  /** Chrome tab group ID */
  groupId: number;
  /** Window ID containing the tab group */
  windowId: number;
  /** Session name (displayed as tab group title) */
  name: string;
  /** Tab group color */
  color: chrome.tabGroups.ColorEnum;
  /** Session creation timestamp */
  createdAt: number;
  /** Whether the session is active */
  active: boolean;
}

// In-memory session state (source of truth for active session)
let currentSession: TabGroupSession | null = null;

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Pick a random color for the tab group
 */
function pickRandomColor(): chrome.tabGroups.ColorEnum {
  return TAB_GROUP_COLORS[Math.floor(Math.random() * TAB_GROUP_COLORS.length)];
}

/**
 * Save session state to storage for persistence across service worker restarts
 */
async function saveSessionToStorage(session: TabGroupSession | null): Promise<void> {
  try {
    if (session) {
      await chrome.storage.local.set({ [STORAGE_KEYS.TAB_GROUP_SESSION]: session });
    } else {
      await chrome.storage.local.remove(STORAGE_KEYS.TAB_GROUP_SESSION);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save session to storage:`, error);
  }
}

/**
 * Load session state from storage
 */
async function loadSessionFromStorage(): Promise<TabGroupSession | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TAB_GROUP_SESSION);
    const stored = result[STORAGE_KEYS.TAB_GROUP_SESSION];
    if (stored && stored.active) {
      // Verify the tab group still exists
      try {
        await chrome.tabGroups.get(stored.groupId);
        return stored;
      } catch {
        // Tab group no longer exists, clear storage
        await chrome.storage.local.remove(STORAGE_KEYS.TAB_GROUP_SESSION);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to load session from storage:`, error);
    return null;
  }
}

/**
 * Broadcast session change to all listeners (UI components)
 */
function broadcastSessionChange(session: TabGroupSession | null): void {
  chrome.runtime
    .sendMessage({
      type: BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_CHANGED,
      payload: session,
    })
    .catch(() => {
      // Ignore errors if no listeners
    });
}

/**
 * Start a new tab group session
 */
export async function startSession(options?: {
  name?: string;
  color?: chrome.tabGroups.ColorEnum;
  initialUrl?: string;
}): Promise<TabGroupSession> {
  // End any existing session first
  if (currentSession) {
    await endSession();
  }

  const sessionName = options?.name || `MCP Session ${new Date().toLocaleTimeString()}`;
  const sessionColor = options?.color || pickRandomColor();
  const initialUrl = options?.initialUrl || 'chrome://newtab';

  console.log(`${LOG_PREFIX} Starting new session: ${sessionName}`);

  // Get the current window or create one
  let targetWindow: chrome.windows.Window;
  try {
    targetWindow = await chrome.windows.getLastFocused({ populate: false });
  } catch {
    targetWindow = await chrome.windows.create({ focused: true });
  }

  if (!targetWindow.id) {
    throw new Error('Failed to get target window');
  }

  // Create initial tab for the session
  const initialTab = await chrome.tabs.create({
    url: initialUrl,
    windowId: targetWindow.id,
    active: true,
  });

  if (!initialTab.id) {
    throw new Error('Failed to create initial tab');
  }

  // Create tab group with the initial tab
  const groupId = await chrome.tabs.group({
    tabIds: [initialTab.id],
    createProperties: {
      windowId: targetWindow.id,
    },
  });

  // Update tab group properties
  await chrome.tabGroups.update(groupId, {
    title: sessionName,
    color: sessionColor,
    collapsed: false,
  });

  // Create session object
  const session: TabGroupSession = {
    id: generateSessionId(),
    groupId,
    windowId: targetWindow.id,
    name: sessionName,
    color: sessionColor,
    createdAt: Date.now(),
    active: true,
  };

  currentSession = session;
  await saveSessionToStorage(session);
  broadcastSessionChange(session);

  console.log(`${LOG_PREFIX} Session started:`, session);

  return session;
}

/**
 * End the current session
 */
export async function endSession(): Promise<void> {
  if (!currentSession) {
    console.log(`${LOG_PREFIX} No active session to end`);
    return;
  }

  console.log(`${LOG_PREFIX} Ending session: ${currentSession.name}`);

  try {
    // Get all tabs in the group
    const tabs = await chrome.tabs.query({ groupId: currentSession.groupId });

    // Close all tabs in the group
    const tabIds = tabs.map((t) => t.id).filter((id): id is number => id !== undefined);
    if (tabIds.length > 0) {
      await chrome.tabs.remove(tabIds);
    }
  } catch (error) {
    console.warn(`${LOG_PREFIX} Error closing session tabs:`, error);
  }

  currentSession = null;
  await saveSessionToStorage(null);
  broadcastSessionChange(null);

  console.log(`${LOG_PREFIX} Session ended`);
}

/**
 * Get the current active session
 */
export function getCurrentSession(): TabGroupSession | null {
  return currentSession;
}

/**
 * Get tabs in the current session's tab group
 */
export async function getSessionTabs(): Promise<chrome.tabs.Tab[]> {
  if (!currentSession) {
    return [];
  }

  try {
    return await chrome.tabs.query({ groupId: currentSession.groupId });
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get session tabs:`, error);
    return [];
  }
}

/**
 * Check if a tab belongs to the current session
 */
export function isTabInSession(tab: chrome.tabs.Tab): boolean {
  if (!currentSession) {
    return true; // No session means no restrictions
  }
  return tab.groupId === currentSession.groupId;
}

/**
 * Check if a tab ID belongs to the current session
 */
export async function isTabIdInSession(tabId: number): Promise<boolean> {
  if (!currentSession) {
    return true; // No session means no restrictions
  }

  try {
    const tab = await chrome.tabs.get(tabId);
    return tab.groupId === currentSession.groupId;
  } catch {
    return false;
  }
}

/**
 * Add a tab to the current session's tab group
 */
export async function addTabToSession(tabId: number): Promise<boolean> {
  if (!currentSession) {
    console.warn(`${LOG_PREFIX} No active session to add tab to`);
    return false;
  }

  try {
    await chrome.tabs.group({
      tabIds: [tabId],
      groupId: currentSession.groupId,
    });
    console.log(`${LOG_PREFIX} Tab ${tabId} added to session group`);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to add tab to session:`, error);
    return false;
  }
}

/**
 * Create a new tab in the current session's tab group
 */
export async function createTabInSession(url: string, active = true): Promise<chrome.tabs.Tab | null> {
  if (!currentSession) {
    console.warn(`${LOG_PREFIX} No active session to create tab in`);
    return null;
  }

  try {
    // Create the tab in the session's window
    const tab = await chrome.tabs.create({
      url,
      windowId: currentSession.windowId,
      active,
    });

    if (!tab.id) {
      throw new Error('Failed to create tab');
    }

    // Add to the session's tab group
    await chrome.tabs.group({
      tabIds: [tab.id],
      groupId: currentSession.groupId,
    });

    console.log(`${LOG_PREFIX} Created tab ${tab.id} in session: ${url}`);
    return tab;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to create tab in session:`, error);
    return null;
  }
}

/**
 * Get the active tab in the current session
 */
export async function getActiveTabInSession(): Promise<chrome.tabs.Tab | null> {
  if (!currentSession) {
    // No session - fall back to regular active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab || null;
  }

  try {
    // Get tabs in the session's tab group
    const tabs = await chrome.tabs.query({ groupId: currentSession.groupId });

    // Find the active tab in the group
    const activeTab = tabs.find((t) => t.active);
    if (activeTab) {
      return activeTab;
    }

    // If no active tab in group, return the first tab
    return tabs[0] || null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get active tab in session:`, error);
    return null;
  }
}

/**
 * Rename the current session
 */
export async function renameSession(name: string): Promise<boolean> {
  if (!currentSession) {
    return false;
  }

  try {
    await chrome.tabGroups.update(currentSession.groupId, { title: name });
    currentSession.name = name;
    await saveSessionToStorage(currentSession);
    broadcastSessionChange(currentSession);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to rename session:`, error);
    return false;
  }
}

/**
 * Change the session's tab group color
 */
export async function setSessionColor(color: chrome.tabGroups.ColorEnum): Promise<boolean> {
  if (!currentSession) {
    return false;
  }

  try {
    await chrome.tabGroups.update(currentSession.groupId, { color });
    currentSession.color = color;
    await saveSessionToStorage(currentSession);
    broadcastSessionChange(currentSession);
    return true;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to change session color:`, error);
    return false;
  }
}

/**
 * Initialize the tab group session service
 * Called on service worker startup to restore session state
 */
export async function initTabGroupSession(): Promise<void> {
  console.log(`${LOG_PREFIX} Initializing tab group session service`);

  // Try to restore session from storage
  const stored = await loadSessionFromStorage();
  if (stored) {
    currentSession = stored;
    console.log(`${LOG_PREFIX} Restored session from storage:`, stored.name);
    broadcastSessionChange(stored);
  }

  // Listen for tab group removal to detect session ending externally
  chrome.tabGroups.onRemoved.addListener((group) => {
    if (currentSession && group.id === currentSession.groupId) {
      console.log(`${LOG_PREFIX} Session tab group was removed externally`);
      currentSession = null;
      saveSessionToStorage(null).catch(() => {});
      broadcastSessionChange(null);
    }
  });

  // Listen for tab removal to check if session is empty
  chrome.tabs.onRemoved.addListener(async (_tabId, _removeInfo) => {
    if (!currentSession) return;

    try {
      const tabs = await chrome.tabs.query({ groupId: currentSession.groupId });
      if (tabs.length === 0) {
        console.log(`${LOG_PREFIX} Session tab group is empty, ending session`);
        currentSession = null;
        await saveSessionToStorage(null);
        broadcastSessionChange(null);
      }
    } catch {
      // Group may no longer exist
    }
  });
}

/**
 * Initialize message listeners for tab group session
 */
export function initTabGroupSessionListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_START) {
      startSession(message.payload)
        .then((session) => sendResponse({ success: true, session }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;
    }

    if (message.type === BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_END) {
      endSession()
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;
    }

    if (message.type === BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_GET) {
      sendResponse({ success: true, session: currentSession });
      return true;
    }

    if (message.type === BACKGROUND_MESSAGE_TYPES.TAB_GROUP_SESSION_ADD_TAB) {
      const { tabId } = message.payload || {};
      if (typeof tabId !== 'number') {
        sendResponse({ success: false, error: 'tabId is required' });
        return true;
      }
      addTabToSession(tabId)
        .then((added) => sendResponse({ success: added }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;
    }
  });
}
