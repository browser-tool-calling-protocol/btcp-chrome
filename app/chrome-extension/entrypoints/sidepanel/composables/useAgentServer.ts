/**
 * Composable for managing BTCP Server connection state.
 * Handles BTCP client connection and SSE stream for agent chat.
 */
import { ref, computed, onUnmounted } from 'vue';
import type { AgentEngineInfo, RealtimeEvent } from 'chrome-mcp-shared';

interface BTCPStatus {
  connected: boolean;
  sessionId: string | null;
  clientId: string | null;
}

export interface UseAgentServerOptions {
  /**
   * Get the session ID for SSE routing.
   * Must be provided by caller (typically DB session ID).
   */
  getSessionId?: () => string;
  onMessage?: (event: RealtimeEvent) => void;
  onError?: (error: string) => void;
}

export function useAgentServer(options: UseAgentServerOptions = {}) {
  // State
  const btcpStatus = ref<BTCPStatus | null>(null);
  const connecting = ref(false);
  const engines = ref<AgentEngineInfo[]>([]);
  const eventSource = ref<EventSource | null>(null);

  // Reconnection state
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const BASE_RECONNECT_DELAY = 1000;

  // Track which sessionId the current SSE connection is subscribed to
  let currentStreamSessionId: string | null = null;

  // Computed
  const isServerReady = computed(() => {
    return btcpStatus.value?.connected ?? false;
  });

  // Legacy compatibility
  const nativeConnected = computed(() => btcpStatus.value?.connected ?? false);
  const serverPort = ref<number | null>(null);
  const serverStatus = ref<{ isRunning: boolean; port?: number; lastUpdated: number } | null>(null);

  // Check BTCP connection status
  async function checkBTCPStatus(): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'btcp_status',
      });
      if (response?.success) {
        btcpStatus.value = {
          connected: response.connected,
          sessionId: response.sessionId,
          clientId: response.clientId,
        };
        return response.connected;
      }
      return false;
    } catch (error) {
      console.error('Failed to check BTCP status:', error);
      return false;
    }
  }

  /**
   * Connect to BTCP server.
   * @param serverUrl - BTCP server URL
   */
  async function connectBTCP(serverUrl: string): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'btcp_connect',
        serverUrl,
      });
      if (response?.success) {
        btcpStatus.value = {
          connected: true,
          sessionId: null,
          clientId: null,
        };
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to connect to BTCP:', error);
      return false;
    }
  }

  /**
   * Disconnect from BTCP server.
   */
  async function disconnectBTCP(): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        type: 'btcp_disconnect',
      });
      btcpStatus.value = null;
    } catch (error) {
      console.error('Failed to disconnect BTCP:', error);
    }
  }

  // Ensure BTCP server is ready
  async function ensureNativeServer(): Promise<boolean> {
    connecting.value = true;
    try {
      // Check BTCP connection status
      const connected = await checkBTCPStatus();
      return connected;
    } finally {
      connecting.value = false;
    }
  }

  // Fetch available engines (placeholder - may not be needed with BTCP)
  async function fetchEngines(): Promise<void> {
    // With BTCP, engines may be discovered differently
    // For now, this is a no-op
  }

  // Check if SSE is connected
  function isEventSourceConnected(): boolean {
    return eventSource.value !== null && eventSource.value.readyState === EventSource.OPEN;
  }

  // Open SSE connection (skip if already connected to same session)
  function openEventSource(): void {
    const targetSessionId = options.getSessionId?.()?.trim() ?? '';
    if (!targetSessionId) return;

    // Skip if already connected to the same session
    if (isEventSourceConnected() && currentStreamSessionId === targetSessionId) {
      console.log('[AgentServer] SSE already connected to session, skipping reconnect');
      return;
    }

    // Close existing connection before subscribing to a new session
    closeEventSource();

    // Note: With BTCP, SSE events come through the BTCP client, not a separate connection
    // This function may need to be updated to use BTCP events instead
    console.log('[AgentServer] SSE connection would be handled by BTCP client');
    currentStreamSessionId = targetSessionId;
  }

  // Close SSE connection
  function closeEventSource(): void {
    if (eventSource.value) {
      eventSource.value.close();
      eventSource.value = null;
    }
    currentStreamSessionId = null;
  }

  // Reconnect to server
  async function reconnect(): Promise<void> {
    closeEventSource();
    reconnectAttempts = 0;
    await ensureNativeServer();
    if (isServerReady.value) {
      openEventSource();
    }
  }

  // Initialize
  async function initialize(): Promise<void> {
    await ensureNativeServer();
  }

  // Cleanup on unmount
  onUnmounted(() => {
    closeEventSource();
  });

  return {
    // State
    serverPort,
    nativeConnected,
    serverStatus,
    connecting,
    engines,
    eventSource,
    btcpStatus,

    // Computed
    isServerReady,

    // Methods
    ensureNativeServer,
    fetchEngines,
    openEventSource,
    closeEventSource,
    isEventSourceConnected,
    reconnect,
    initialize,
    checkBTCPStatus,
    connectBTCP,
    disconnectBTCP,
  };
}
