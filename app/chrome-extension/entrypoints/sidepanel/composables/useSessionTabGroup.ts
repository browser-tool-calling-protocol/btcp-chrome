import { ref, onMounted, onUnmounted } from 'vue';

// Tab group colors
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
  isActive: boolean;
  groupId: number | null;
  windowId: number | null;
  title: string;
  color: TabGroupColor;
  startedAt: number | null;
}

const defaultState: SessionTabGroupState = {
  isActive: false,
  groupId: null,
  windowId: null,
  title: '',
  color: 'blue',
  startedAt: null,
};

/**
 * Composable for managing session tab group state in the sidepanel
 */
export function useSessionTabGroup() {
  const state = ref<SessionTabGroupState>({ ...defaultState });
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Fetch current state from background
  async function refreshState(): Promise<void> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SESSION_TAB_GROUP_GET_STATE',
      });
      if (response?.success) {
        state.value = response.state;
      }
    } catch (e) {
      console.error('[useSessionTabGroup] Failed to get state:', e);
    }
  }

  // Start a new session
  async function startSession(options?: {
    title?: string;
    color?: TabGroupColor;
    initialUrl?: string;
  }): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SESSION_TAB_GROUP_START',
        options,
      });
      if (response?.success) {
        state.value = response.state;
        return true;
      } else {
        error.value = response?.error || 'Failed to start session';
        return false;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // End the current session
  async function endSession(options?: { closeTabs?: boolean }): Promise<boolean> {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SESSION_TAB_GROUP_END',
        options,
      });
      if (response?.success) {
        state.value = { ...defaultState };
        return true;
      } else {
        error.value = response?.error || 'Failed to end session';
        return false;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // Update session properties
  async function updateSession(options: {
    title?: string;
    color?: TabGroupColor;
    collapsed?: boolean;
  }): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SESSION_TAB_GROUP_UPDATE',
        options,
      });
      if (response?.success) {
        state.value = response.state;
        return true;
      }
      return false;
    } catch (e) {
      console.error('[useSessionTabGroup] Failed to update session:', e);
      return false;
    }
  }

  // Listen for state changes from background
  function handleMessage(message: { type?: string; state?: SessionTabGroupState }) {
    if (message.type === 'SESSION_TAB_GROUP_STATE_CHANGED' && message.state) {
      state.value = message.state;
    }
  }

  onMounted(() => {
    refreshState();
    chrome.runtime.onMessage.addListener(handleMessage);
  });

  onUnmounted(() => {
    chrome.runtime.onMessage.removeListener(handleMessage);
  });

  return {
    state,
    isLoading,
    error,
    refreshState,
    startSession,
    endSession,
    updateSession,
  };
}
