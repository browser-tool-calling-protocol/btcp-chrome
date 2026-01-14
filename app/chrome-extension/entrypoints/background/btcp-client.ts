/**
 * BTCP Client Integration
 *
 * Manages the connection to the BTCP server and handles tool registration.
 * This module replaces the native messaging approach with HTTP streaming (SSE).
 *
 * The Chrome extension becomes a tool provider that:
 * 1. Connects to the BTCP server via SSE
 * 2. Registers available tools with the server
 * 3. Receives tool call requests via SSE events
 * 4. Executes tools using existing implementations
 * 5. Returns results via HTTP POST
 */

import { BTCP_TOOL_DEFINITIONS } from './btcp-tool-definitions';
import { getBTCPToolAdapter, type BTCPToolCallResponse } from './btcp-tool-adapter';
import { STORAGE_KEYS } from '@/common/constants';
import { acquireKeepalive } from './keepalive-manager';

const LOG_PREFIX = '[BTCP]';

// ==================== Configuration ====================

export interface BTCPConnectionConfig {
  /** BTCP server URL */
  serverUrl: string;
  /** Optional session ID for reconnection */
  sessionId?: string;
  /** Enable auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Connection timeout in milliseconds (default: 30000) */
  connectionTimeout?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

// Default configuration values
const DEFAULT_CONFIG: Required<Omit<BTCPConnectionConfig, 'serverUrl' | 'sessionId'>> = {
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
  connectionTimeout: 30000,
  debug: false,
};

// Storage keys for BTCP settings
const BTCP_STORAGE_KEYS = {
  SERVER_URL: 'btcp_server_url',
  SESSION_ID: 'btcp_session_id',
  AUTO_CONNECT: 'btcp_auto_connect',
} as const;

// ==================== Client State ====================

interface ClientState {
  isConnected: boolean;
  sessionId: string | null;
  clientId: string | null;
  eventSource: EventSource | null;
  config: BTCPConnectionConfig | null;
  reconnectAttempts: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  keepaliveRelease: (() => void) | null;
}

const state: ClientState = {
  isConnected: false,
  sessionId: null,
  clientId: null,
  eventSource: null,
  config: null,
  reconnectAttempts: 0,
  reconnectTimer: null,
  keepaliveRelease: null,
};

// ==================== Event Callbacks ====================

type EventCallback = (...args: any[]) => void;
const eventCallbacks: Record<string, EventCallback[]> = {
  connected: [],
  disconnected: [],
  error: [],
  toolCall: [],
  registered: [],
};

function emit(event: string, ...args: any[]): void {
  const callbacks = eventCallbacks[event] || [];
  callbacks.forEach((cb) => {
    try {
      cb(...args);
    } catch (e) {
      console.error(`${LOG_PREFIX} Error in ${event} callback:`, e);
    }
  });
}

// ==================== Utility Functions ====================

function log(message: string, ...args: any[]): void {
  if (state.config?.debug) {
    console.log(`${LOG_PREFIX} ${message}`, ...args);
  }
}

function warn(message: string, ...args: any[]): void {
  console.warn(`${LOG_PREFIX} ${message}`, ...args);
}

function generateClientId(): string {
  return `chrome-ext-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ==================== Keepalive Management ====================

function acquireKeepaliveHold(): void {
  if (!state.keepaliveRelease) {
    state.keepaliveRelease = acquireKeepalive('btcp-client');
    log('Acquired keepalive');
  }
}

function releaseKeepaliveHold(): void {
  if (state.keepaliveRelease) {
    try {
      state.keepaliveRelease();
      log('Released keepalive');
    } catch {
      // Ignore
    }
    state.keepaliveRelease = null;
  }
}

// ==================== SSE Connection ====================

function clearReconnectTimer(): void {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
}

function scheduleReconnect(reason: string): void {
  if (!state.config?.autoReconnect) return;
  if (state.reconnectTimer) return;
  if (
    state.reconnectAttempts >=
    (state.config?.maxReconnectAttempts ?? DEFAULT_CONFIG.maxReconnectAttempts)
  ) {
    warn(`Max reconnect attempts reached (${state.reconnectAttempts}), giving up`);
    releaseKeepaliveHold();
    return;
  }

  const delay =
    (state.config?.reconnectDelay ?? DEFAULT_CONFIG.reconnectDelay) *
    Math.pow(2, state.reconnectAttempts);
  log(
    `Scheduling reconnect in ${delay}ms (attempt ${state.reconnectAttempts + 1}, reason: ${reason})`,
  );

  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    state.reconnectAttempts++;
    void connectToServer().catch((e) => {
      warn('Reconnect failed:', e);
    });
  }, delay);
}

async function sendToolCallResponse(
  requestId: string,
  response: BTCPToolCallResponse,
): Promise<void> {
  if (!state.config?.serverUrl || !state.clientId) {
    throw new Error('Not connected to BTCP server');
  }

  const url = `${state.config.serverUrl}/tools/response`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': state.clientId,
        ...(state.sessionId && { 'X-Session-ID': state.sessionId }),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        result: response,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    log(`Tool response sent for request ${requestId}`);
  } catch (error) {
    warn(`Failed to send tool response:`, error);
    throw error;
  }
}

async function handleToolCall(data: {
  id: string;
  method: string;
  params: { name: string; arguments: Record<string, unknown> };
}): Promise<void> {
  const { id: requestId, params } = data;
  const { name: toolName, arguments: toolArgs } = params;

  log(`Received tool call: ${toolName} (request: ${requestId})`);
  emit('toolCall', { requestId, toolName, toolArgs });

  try {
    const adapter = getBTCPToolAdapter();
    const response = await adapter.execute(toolName, toolArgs || {});
    await sendToolCallResponse(requestId, response);
  } catch (error) {
    warn(`Tool call failed:`, error);
    await sendToolCallResponse(requestId, {
      content: [
        { type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` },
      ],
      isError: true,
    });
  }
}

function setupEventSource(): void {
  if (!state.config?.serverUrl || !state.clientId) {
    throw new Error('Configuration not set');
  }

  const url = new URL(`${state.config.serverUrl}/events`);
  url.searchParams.set('clientId', state.clientId);
  if (state.sessionId) {
    url.searchParams.set('sessionId', state.sessionId);
  }

  log(`Connecting to SSE: ${url.toString()}`);

  const eventSource = new EventSource(url.toString());
  state.eventSource = eventSource;

  eventSource.onopen = () => {
    log('SSE connection opened');
    state.isConnected = true;
    state.reconnectAttempts = 0;
    clearReconnectTimer();
    emit('connected');

    // Register tools after connection
    void registerTools().catch((e) => {
      warn('Failed to register tools:', e);
    });
  };

  eventSource.onerror = (event) => {
    warn('SSE connection error:', event);
    state.isConnected = false;
    emit('error', event);

    // Close and schedule reconnect
    if (eventSource.readyState === EventSource.CLOSED) {
      state.eventSource = null;
      emit('disconnected');
      scheduleReconnect('sse_error');
    }
  };

  // Handle tool call messages
  eventSource.addEventListener('tool_call', (event) => {
    try {
      const data = JSON.parse(event.data);
      void handleToolCall(data);
    } catch (e) {
      warn('Failed to parse tool_call event:', e);
    }
  });

  // Handle session assignment
  eventSource.addEventListener('session', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.sessionId) {
        state.sessionId = data.sessionId;
        log(`Session assigned: ${data.sessionId}`);
        // Persist session ID for reconnection
        void chrome.storage.local
          .set({ [BTCP_STORAGE_KEYS.SESSION_ID]: data.sessionId })
          .catch(() => {});
      }
    } catch (e) {
      warn('Failed to parse session event:', e);
    }
  });

  // Handle ping/pong for keepalive
  eventSource.addEventListener('ping', () => {
    log('Received ping');
  });
}

// ==================== Public API ====================

/**
 * Initialize and connect to the BTCP server
 */
export async function initializeBTCPClient(config: BTCPConnectionConfig): Promise<void> {
  if (state.isConnected) {
    log('Already connected, disconnecting first');
    await disconnectBTCPClient();
  }

  state.config = { ...DEFAULT_CONFIG, ...config };
  state.clientId = generateClientId();

  // Try to restore session ID from storage
  try {
    const stored = await chrome.storage.local.get([BTCP_STORAGE_KEYS.SESSION_ID]);
    if (stored[BTCP_STORAGE_KEYS.SESSION_ID]) {
      state.sessionId = stored[BTCP_STORAGE_KEYS.SESSION_ID];
      log(`Restored session ID: ${state.sessionId}`);
    }
  } catch {
    // Ignore
  }

  // Override with config session ID if provided
  if (config.sessionId) {
    state.sessionId = config.sessionId;
  }

  await connectToServer();
}

/**
 * Connect to the BTCP server
 */
async function connectToServer(): Promise<void> {
  if (!state.config) {
    throw new Error('BTCP client not initialized');
  }

  acquireKeepaliveHold();

  try {
    setupEventSource();
  } catch (error) {
    releaseKeepaliveHold();
    throw error;
  }
}

/**
 * Register tools with the BTCP server
 */
async function registerTools(): Promise<void> {
  if (!state.config?.serverUrl || !state.clientId) {
    throw new Error('Not connected to BTCP server');
  }

  const url = `${state.config.serverUrl}/tools/register`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': state.clientId,
        ...(state.sessionId && { 'X-Session-ID': state.sessionId }),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `register-${Date.now()}`,
        method: 'tools/register',
        params: {
          tools: BTCP_TOOL_DEFINITIONS,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const result = await res.json();
    log(`Registered ${BTCP_TOOL_DEFINITIONS.length} tools:`, result);
    emit('registered', { toolCount: BTCP_TOOL_DEFINITIONS.length });
  } catch (error) {
    warn(`Failed to register tools:`, error);
    throw error;
  }
}

/**
 * Disconnect from the BTCP server
 */
export async function disconnectBTCPClient(): Promise<void> {
  clearReconnectTimer();
  state.reconnectAttempts = 0;

  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }

  state.isConnected = false;
  state.clientId = null;
  releaseKeepaliveHold();

  emit('disconnected');
  log('Disconnected from BTCP server');
}

/**
 * Check if the client is connected
 */
export function isConnected(): boolean {
  return state.isConnected;
}

/**
 * Get the current session ID
 */
export function getSessionId(): string | null {
  return state.sessionId;
}

/**
 * Get the current client ID
 */
export function getClientId(): string | null {
  return state.clientId;
}

/**
 * Add an event listener
 */
export function on(event: string, callback: EventCallback): void {
  if (!eventCallbacks[event]) {
    eventCallbacks[event] = [];
  }
  eventCallbacks[event].push(callback);
}

/**
 * Remove an event listener
 */
export function off(event: string, callback: EventCallback): void {
  if (!eventCallbacks[event]) return;
  eventCallbacks[event] = eventCallbacks[event].filter((cb) => cb !== callback);
}

// ==================== Message Listeners ====================

/**
 * Initialize BTCP client message listeners
 * Handles messages from popup/options UI for connection management
 */
export function initBTCPClientListener(): void {
  // Load saved config and auto-connect if enabled
  chrome.storage.local
    .get([BTCP_STORAGE_KEYS.SERVER_URL, BTCP_STORAGE_KEYS.AUTO_CONNECT])
    .then((result) => {
      const serverUrl = result[BTCP_STORAGE_KEYS.SERVER_URL] as string | undefined;
      const autoConnect = result[BTCP_STORAGE_KEYS.AUTO_CONNECT] !== false; // Default to true

      if (serverUrl && autoConnect) {
        log(`Auto-connecting to saved server: ${serverUrl}`);
        void initializeBTCPClient({
          serverUrl,
          autoReconnect: true,
          debug: true,
        }).catch((e) => {
          warn('Auto-connect failed:', e);
        });
      }
    });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const msgType = typeof message === 'string' ? message : message?.type;

    // Connect to BTCP server
    if (msgType === 'btcp_connect') {
      const serverUrl = message?.serverUrl as string;
      if (!serverUrl) {
        sendResponse({ success: false, error: 'Server URL required' });
        return true;
      }

      // Save config
      void chrome.storage.local.set({
        [BTCP_STORAGE_KEYS.SERVER_URL]: serverUrl,
        [BTCP_STORAGE_KEYS.AUTO_CONNECT]: true,
      });

      initializeBTCPClient({
        serverUrl,
        autoReconnect: true,
        debug: true,
      })
        .then(() => {
          sendResponse({ success: true, connected: true });
        })
        .catch((e) => {
          sendResponse({ success: false, error: String(e) });
        });
      return true;
    }

    // Disconnect from BTCP server
    if (msgType === 'btcp_disconnect') {
      void chrome.storage.local.set({ [BTCP_STORAGE_KEYS.AUTO_CONNECT]: false });

      disconnectBTCPClient()
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((e) => {
          sendResponse({ success: false, error: String(e) });
        });
      return true;
    }

    // Get BTCP connection status
    if (msgType === 'btcp_status') {
      sendResponse({
        success: true,
        connected: state.isConnected,
        sessionId: state.sessionId,
        clientId: state.clientId,
      });
      return true;
    }

    // Allow UI to call tools directly (for testing)
    if (message && message.type === 'call_tool' && message.name) {
      const adapter = getBTCPToolAdapter();
      adapter
        .execute(message.name, message.args || {})
        .then((res) => sendResponse({ success: true, result: res }))
        .catch((err) =>
          sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) }),
        );
      return true;
    }
  });

  // Auto-connect on Chrome browser startup
  chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local
      .get([BTCP_STORAGE_KEYS.SERVER_URL, BTCP_STORAGE_KEYS.AUTO_CONNECT])
      .then((result) => {
        const serverUrl = result[BTCP_STORAGE_KEYS.SERVER_URL] as string | undefined;
        const autoConnect = result[BTCP_STORAGE_KEYS.AUTO_CONNECT] !== false;

        if (serverUrl && autoConnect && !state.isConnected) {
          log('onStartup: Auto-connecting');
          void initializeBTCPClient({
            serverUrl,
            autoReconnect: true,
            debug: true,
          }).catch((e) => {
            warn('onStartup auto-connect failed:', e);
          });
        }
      });
  });
}
