/**
 * Session Tab Group Manager
 *
 * Manages a browser tab group that constrains all tab operations during a session.
 * When a session is active, all new tabs created by MCP tools are automatically
 * added to the session's tab group.
 */

// Valid tab group colors
type TabGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange';

export interface SessionTabGroupState {
  /** Whether a session tab group is currently active */
  isActive: boolean;
  /** The Chrome tab group ID (if active) */
  groupId: number | null;
  /** The window ID where the group exists */
  windowId: number | null;
  /** Display title for the group */
  title: string;
  /** Group color */
  color: TabGroupColor;
  /** Timestamp when the session started */
  startedAt: number | null;
}

// In-memory state (survives service worker restarts via storage sync)
let sessionState: SessionTabGroupState = {
  isActive: false,
  groupId: null,
  windowId: null,
  title: '',
  color: 'blue',
  startedAt: null,
};

const STORAGE_KEY = 'SESSION_TAB_GROUP_STATE';

/**
 * Initialize the session manager - should be called on background script startup
 */
export async function initSessionTabGroup(): Promise<void> {
  // Restore state from storage
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    if (stored[STORAGE_KEY]) {
      const restored = stored[STORAGE_KEY] as SessionTabGroupState;
      // Validate that the group still exists
      if (restored.isActive && restored.groupId !== null) {
        try {
          await chrome.tabGroups.get(restored.groupId);
          sessionState = restored;
          console.log('[SessionTabGroup] Restored active session:', sessionState);
        } catch {
          // Group no longer exists, reset state
          console.log('[SessionTabGroup] Stored group no longer exists, resetting');
          sessionState = {
            isActive: false,
            groupId: null,
            windowId: null,
            title: '',
            color: 'blue',
            startedAt: null,
          };
          await persistState();
        }
      }
    }
  } catch (error) {
    console.error('[SessionTabGroup] Failed to restore state:', error);
  }

  // Listen for tab group removal (user manually closed the group)
  chrome.tabGroups.onRemoved.addListener(handleGroupRemoved);
}

/**
 * Persist state to storage
 */
async function persistState(): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: sessionState });
  } catch (error) {
    console.error('[SessionTabGroup] Failed to persist state:', error);
  }
}

/**
 * Handle when a tab group is removed (user closed it manually)
 */
function handleGroupRemoved(group: chrome.tabGroups.TabGroup): void {
  if (sessionState.isActive && group.id === sessionState.groupId) {
    console.log('[SessionTabGroup] Active session group was removed externally');
    sessionState = {
      isActive: false,
      groupId: null,
      windowId: null,
      title: '',
      color: 'blue',
      startedAt: null,
    };
    persistState();
    broadcastStateChange();
  }
}

/**
 * Broadcast state change to UI components
 */
function broadcastStateChange(): void {
  chrome.runtime
    .sendMessage({
      type: 'SESSION_TAB_GROUP_STATE_CHANGED',
      state: getSessionState(),
    })
    .catch(() => {
      // Ignore errors if no listeners
    });
}

/**
 * Get the current session state
 */
export function getSessionState(): SessionTabGroupState {
  return { ...sessionState };
}

/**
 * Check if a session tab group is currently active
 */
export function isSessionActive(): boolean {
  return sessionState.isActive && sessionState.groupId !== null;
}

/**
 * Get the active session's group ID (or null if no session)
 */
export function getActiveGroupId(): number | null {
  return sessionState.groupId;
}

/**
 * Get the active session's window ID (or null if no session)
 */
export function getActiveWindowId(): number | null {
  return sessionState.windowId;
}

/**
 * Start a new session by creating a tab group
 */
export async function startSession(options?: {
  title?: string;
  color?: TabGroupColor;
  initialUrl?: string;
}): Promise<SessionTabGroupState> {
  const { title = 'AI Session', color = 'blue', initialUrl } = options || {};

  console.log('[SessionTabGroup] Starting session:', { title, color, initialUrl });

  try {
    // Get the current window
    const currentWindow = await chrome.windows.getLastFocused();
    if (!currentWindow.id) {
      throw new Error('No active window found');
    }

    // Create a new tab for the session (or use initialUrl)
    const newTab = await chrome.tabs.create({
      windowId: currentWindow.id,
      url: initialUrl || 'chrome://newtab',
      active: true,
    });

    if (!newTab.id) {
      throw new Error('Failed to create initial tab');
    }

    // Create a tab group with the new tab
    const groupId = await chrome.tabs.group({
      tabIds: [newTab.id],
      createProperties: { windowId: currentWindow.id },
    });

    // Update group properties
    await chrome.tabGroups.update(groupId, {
      title,
      color: color as chrome.tabGroups.ColorEnum,
      collapsed: false,
    });

    // Update state
    sessionState = {
      isActive: true,
      groupId,
      windowId: currentWindow.id,
      title,
      color,
      startedAt: Date.now(),
    };

    await persistState();
    broadcastStateChange();

    console.log('[SessionTabGroup] Session started:', sessionState);
    return getSessionState();
  } catch (error) {
    console.error('[SessionTabGroup] Failed to start session:', error);
    throw error;
  }
}

/**
 * End the current session (optionally close all tabs in the group)
 */
export async function endSession(options?: { closeTabs?: boolean }): Promise<void> {
  const { closeTabs = false } = options || {};

  if (!sessionState.isActive || sessionState.groupId === null) {
    console.log('[SessionTabGroup] No active session to end');
    return;
  }

  console.log('[SessionTabGroup] Ending session:', { closeTabs });

  try {
    if (closeTabs) {
      // Get all tabs in the group and close them
      const tabs = await chrome.tabs.query({ groupId: sessionState.groupId });
      const tabIds = tabs.map((t) => t.id).filter((id): id is number => id !== undefined);
      if (tabIds.length > 0) {
        await chrome.tabs.remove(tabIds);
      }
    } else {
      // Just ungroup all tabs (they remain open)
      const tabs = await chrome.tabs.query({ groupId: sessionState.groupId });
      const tabIds = tabs.map((t) => t.id).filter((id): id is number => id !== undefined);
      if (tabIds.length > 0) {
        await chrome.tabs.ungroup(tabIds);
      }
    }
  } catch (error) {
    console.error('[SessionTabGroup] Error during session cleanup:', error);
  }

  // Reset state
  sessionState = {
    isActive: false,
    groupId: null,
    windowId: null,
    title: '',
    color: 'blue',
    startedAt: null,
  };

  await persistState();
  broadcastStateChange();

  console.log('[SessionTabGroup] Session ended');
}

/**
 * Add a tab to the current session group
 */
export async function addTabToSession(tabId: number): Promise<boolean> {
  if (!sessionState.isActive || sessionState.groupId === null) {
    return false;
  }

  try {
    await chrome.tabs.group({
      tabIds: [tabId],
      groupId: sessionState.groupId,
    });
    console.log('[SessionTabGroup] Added tab to session:', tabId);
    return true;
  } catch (error) {
    console.error('[SessionTabGroup] Failed to add tab to session:', error);
    return false;
  }
}

/**
 * Get tabs in the current session group
 */
export async function getSessionTabs(): Promise<chrome.tabs.Tab[]> {
  if (!sessionState.isActive || sessionState.groupId === null) {
    return [];
  }

  try {
    return await chrome.tabs.query({ groupId: sessionState.groupId });
  } catch (error) {
    console.error('[SessionTabGroup] Failed to get session tabs:', error);
    return [];
  }
}

/**
 * Update session properties
 */
export async function updateSession(options: {
  title?: string;
  color?: TabGroupColor;
  collapsed?: boolean;
}): Promise<SessionTabGroupState> {
  if (!sessionState.isActive || sessionState.groupId === null) {
    throw new Error('No active session');
  }

  const updateProps: chrome.tabGroups.UpdateProperties = {};
  if (options.title !== undefined) {
    updateProps.title = options.title;
    sessionState.title = options.title;
  }
  if (options.color !== undefined) {
    updateProps.color = options.color as chrome.tabGroups.ColorEnum;
    sessionState.color = options.color;
  }
  if (options.collapsed !== undefined) {
    updateProps.collapsed = options.collapsed;
  }

  await chrome.tabGroups.update(sessionState.groupId, updateProps);
  await persistState();
  broadcastStateChange();

  return getSessionState();
}

/**
 * Initialize message listener for session control
 */
export function initSessionMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'SESSION_TAB_GROUP_GET_STATE') {
      sendResponse({ success: true, state: getSessionState() });
      return true;
    }

    if (message.type === 'SESSION_TAB_GROUP_START') {
      startSession(message.options)
        .then((state) => sendResponse({ success: true, state }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;
    }

    if (message.type === 'SESSION_TAB_GROUP_END') {
      endSession(message.options)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;
    }

    if (message.type === 'SESSION_TAB_GROUP_UPDATE') {
      updateSession(message.options)
        .then((state) => sendResponse({ success: true, state }))
        .catch((error) =>
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      return true;
    }

    return false;
  });
}
