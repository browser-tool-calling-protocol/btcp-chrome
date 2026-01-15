<template>
  <div class="btcp-server-section">
    <h3 class="section-title">BTCP Server Connection</h3>

    <div class="connection-card">
      <!-- Server URL Input -->
      <div class="input-group">
        <label for="server-url">Server URL:</label>
        <input
          id="server-url"
          v-model="serverUrl"
          type="text"
          placeholder="http://localhost:8765"
          :disabled="isConnected"
          class="server-url-input"
        />
      </div>

      <!-- Connection Status -->
      <div class="status-row">
        <div class="status-indicator" :class="statusClass">
          <span class="status-dot"></span>
          <span class="status-text">{{ statusText }}</span>
        </div>

        <!-- Session ID (when connected) -->
        <div v-if="isConnected && sessionId" class="session-id">
          Session: {{ sessionId.substring(0, 8) }}...
        </div>
      </div>

      <!-- Connect/Disconnect Button -->
      <button
        class="connection-button"
        :class="{ connected: isConnected, connecting: isConnecting }"
        :disabled="isConnecting"
        @click="toggleConnection"
      >
        <span v-if="isConnecting">Connecting...</span>
        <span v-else>{{ isConnected ? 'Disconnect' : 'Connect' }}</span>
      </button>

      <!-- Auto-reconnect Checkbox -->
      <div class="checkbox-group">
        <label class="checkbox-label">
          <input v-model="autoReconnect" type="checkbox" :disabled="isConnected" />
          <span>Auto-reconnect</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

// State
const serverUrl = ref('http://localhost:8765');
const isConnected = ref(false);
const isConnecting = ref(false);
const sessionId = ref<string | null>(null);
const clientId = ref<string | null>(null);
const autoReconnect = ref(true);

// Computed
const statusClass = computed(() => {
  if (isConnecting.value) return 'connecting';
  if (isConnected.value) return 'connected';
  return 'disconnected';
});

const statusText = computed(() => {
  if (isConnecting.value) return 'Connecting...';
  if (isConnected.value) return 'Connected';
  return 'Disconnected';
});

// Methods
async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'btcp_status',
    });

    if (response?.success) {
      isConnected.value = response.connected;
      sessionId.value = response.sessionId;
      clientId.value = response.clientId;
    }
  } catch (error) {
    console.error('Failed to check BTCP status:', error);
  }
}

async function connect() {
  if (!serverUrl.value.trim()) {
    alert('Please enter a server URL');
    return;
  }

  isConnecting.value = true;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'btcp_connect',
      serverUrl: serverUrl.value.trim(),
      config: {
        autoReconnect: autoReconnect.value,
      },
    });

    if (response?.success) {
      isConnected.value = true;
      sessionId.value = response.sessionId || null;
      clientId.value = response.clientId || null;

      // Save server URL to storage
      await chrome.storage.local.set({
        btcp_server_url: serverUrl.value.trim(),
        btcp_auto_connect: autoReconnect.value,
      });
    } else {
      alert(response?.error || 'Failed to connect to BTCP server');
    }
  } catch (error) {
    console.error('Connection error:', error);
    alert('Failed to connect to BTCP server');
  } finally {
    isConnecting.value = false;
  }
}

async function disconnect() {
  isConnecting.value = true;
  try {
    await chrome.runtime.sendMessage({
      type: 'btcp_disconnect',
    });

    isConnected.value = false;
    sessionId.value = null;
    clientId.value = null;
  } catch (error) {
    console.error('Disconnect error:', error);
  } finally {
    isConnecting.value = false;
  }
}

function toggleConnection() {
  if (isConnected.value) {
    disconnect();
  } else {
    connect();
  }
}

async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['btcp_server_url', 'btcp_auto_connect']);

    if (result.btcp_server_url) {
      serverUrl.value = result.btcp_server_url;
    }
    if (typeof result.btcp_auto_connect === 'boolean') {
      autoReconnect.value = result.btcp_auto_connect;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Lifecycle
onMounted(async () => {
  await loadSettings();
  await checkStatus();
});
</script>

<style scoped>
.btcp-server-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--ac-text, #333);
}

.connection-card {
  background: var(--ac-surface, #fff);
  border: 1px solid var(--ac-border, #e0e0e0);
  border-radius: 8px;
  padding: 16px;
}

.input-group {
  margin-bottom: 12px;
}

.input-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--ac-text-secondary, #666);
}

.server-url-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid var(--ac-border, #ddd);
  border-radius: 6px;
  background: var(--ac-input-bg, #fff);
  color: var(--ac-text, #333);
  transition: border-color 0.2s;
}

.server-url-input:focus {
  outline: none;
  border-color: var(--ac-accent, #4f46e5);
}

.server-url-input:disabled {
  background: var(--ac-disabled-bg, #f5f5f5);
  cursor: not-allowed;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background-color 0.3s;
}

.status-indicator.disconnected .status-dot {
  background-color: #ef4444;
}

.status-indicator.connecting .status-dot {
  background-color: #f59e0b;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-indicator.connected .status-dot {
  background-color: #10b981;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.status-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--ac-text, #333);
}

.session-id {
  font-size: 11px;
  color: var(--ac-text-secondary, #666);
  background: var(--ac-surface-secondary, #f5f5f5);
  padding: 4px 8px;
  border-radius: 4px;
}

.connection-button {
  width: 100%;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--ac-accent, #4f46e5);
  color: white;
  margin-bottom: 12px;
}

.connection-button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.connection-button:active:not(:disabled) {
  transform: translateY(0);
}

.connection-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-button.connected {
  background: #ef4444;
}

.connection-button.connecting {
  background: #f59e0b;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ac-text-secondary, #666);
  cursor: pointer;
}

.checkbox-label input[type='checkbox'] {
  cursor: pointer;
}

.checkbox-label input[type='checkbox']:disabled {
  cursor: not-allowed;
}
</style>
