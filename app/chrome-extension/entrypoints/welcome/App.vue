<script setup lang="ts">
import { ref } from 'vue';
import { LINKS } from '@/common/constants';

import '../sidepanel/styles/agent-chat.css';

// BTCP Server default URL
const DEFAULT_BTCP_URL = 'http://localhost:3000';

const COMMANDS = {
  btcpUrl: DEFAULT_BTCP_URL,
} as const;

type CommandKey = keyof typeof COMMANDS;

const copiedKey = ref<CommandKey | null>(null);
const btcpServerUrl = ref(DEFAULT_BTCP_URL);
const connecting = ref(false);
const connectionStatus = ref<'idle' | 'connected' | 'error'>('idle');
const connectionError = ref<string | null>(null);

function copyLabel(key: CommandKey): string {
  return copiedKey.value === key ? 'Copied' : 'Copy';
}

function copyColor(key: CommandKey): string {
  return copiedKey.value === key ? 'var(--ac-success)' : 'var(--ac-text-muted)';
}

async function copyCommand(key: CommandKey): Promise<void> {
  try {
    await navigator.clipboard.writeText(COMMANDS[key]);
    copiedKey.value = key;
    window.setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = null;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    copiedKey.value = null;
  }
}

async function connectToBTCP(): Promise<void> {
  connecting.value = true;
  connectionError.value = null;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'btcp_connect',
      serverUrl: btcpServerUrl.value,
    });

    if (response?.success) {
      connectionStatus.value = 'connected';
    } else {
      connectionStatus.value = 'error';
      connectionError.value = response?.error || 'Failed to connect';
    }
  } catch (err) {
    connectionStatus.value = 'error';
    connectionError.value = err instanceof Error ? err.message : 'Failed to connect';
  } finally {
    connecting.value = false;
  }
}

async function openDocs(): Promise<void> {
  try {
    await chrome.tabs.create({ url: LINKS.TROUBLESHOOTING });
  } catch {
    window.open(LINKS.TROUBLESHOOTING, '_blank', 'noopener,noreferrer');
  }
}
</script>

<template>
  <div class="agent-theme welcome-root">
    <div class="min-h-screen flex flex-col">
      <header class="welcome-header flex-none px-6 py-5">
        <div class="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="welcome-icon w-10 h-10 flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <svg
                class="w-6 h-6"
                :style="{ color: 'var(--ac-accent)' }"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div class="min-w-0">
              <h1 class="welcome-title text-lg font-medium tracking-tight truncate">
                BTCP Chrome Extension
              </h1>
              <p class="welcome-muted text-sm truncate">
                Connect to a BTCP server to enable browser automation tools.
              </p>
            </div>
          </div>

          <button
            class="welcome-button px-3 py-2 text-xs font-medium ac-btn flex-shrink-0"
            @click="openDocs"
          >
            Documentation
          </button>
        </div>
      </header>

      <main class="flex-1 px-6 py-8">
        <div class="max-w-3xl mx-auto space-y-6">
          <section class="welcome-card welcome-card--primary p-6">
            <h2 class="welcome-title text-xl font-medium"> Connect to BTCP Server </h2>
            <p class="welcome-muted text-sm mt-2">
              Enter the URL of your BTCP server to connect the extension as a tool provider.
            </p>

            <div class="mt-4 space-y-3">
              <div class="welcome-command-row flex items-center gap-3 px-4 py-3">
                <input
                  v-model="btcpServerUrl"
                  type="text"
                  placeholder="http://localhost:3000"
                  class="welcome-input flex-1 bg-transparent outline-none text-sm"
                />
                <button
                  class="welcome-connect-btn px-4 py-2 text-xs font-medium flex-shrink-0"
                  :disabled="connecting"
                  @click="connectToBTCP"
                >
                  {{ connecting ? 'Connecting...' : 'Connect' }}
                </button>
              </div>

              <div v-if="connectionStatus === 'connected'" class="welcome-success px-4 py-3">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="text-sm">Connected to BTCP server</span>
                </div>
              </div>

              <div v-if="connectionStatus === 'error'" class="welcome-error px-4 py-3">
                <div class="flex items-center gap-2">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="text-sm">{{ connectionError }}</span>
                </div>
              </div>

              <div class="welcome-alt-row welcome-muted px-4 py-3 text-xs">
                Make sure your BTCP server is running and accessible at the specified URL.
              </div>
            </div>

            <div
              class="mt-6 pt-5"
              :style="{ borderTop: 'var(--ac-border-width) solid var(--ac-border)' }"
            >
              <h3 class="welcome-title text-sm font-medium">Default BTCP Server URL</h3>
              <p class="welcome-muted text-sm mt-1">
                If you're running the BTCP server locally with default settings.
              </p>

              <div
                class="welcome-command-row mt-3 flex items-center justify-between gap-3 px-4 py-3"
              >
                <code class="welcome-code text-sm break-all">{{ COMMANDS.btcpUrl }}</code>
                <button
                  class="welcome-mono px-2 py-1 text-xs font-medium ac-btn flex-shrink-0"
                  :style="{ color: copyColor('btcpUrl') }"
                  @click="copyCommand('btcpUrl')"
                >
                  {{ copyLabel('btcpUrl') }}
                </button>
              </div>
            </div>
          </section>

          <section class="welcome-card p-6">
            <h2 class="welcome-title text-lg font-medium">How It Works</h2>
            <div class="mt-4 space-y-4">
              <div class="welcome-alt-row p-4">
                <h3 class="text-sm font-medium">1. Connect to BTCP Server</h3>
                <p class="welcome-muted text-sm mt-1">
                  The extension connects to a BTCP server via HTTP/SSE streaming.
                </p>
              </div>
              <div class="welcome-alt-row p-4">
                <h3 class="text-sm font-medium">2. Register Browser Tools</h3>
                <p class="welcome-muted text-sm mt-1">
                  Available browser automation tools are registered with the server.
                </p>
              </div>
              <div class="welcome-alt-row p-4">
                <h3 class="text-sm font-medium">3. Execute Tool Calls</h3>
                <p class="welcome-muted text-sm mt-1">
                  AI agents can now use browser tools through the BTCP protocol.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.welcome-root {
  min-height: 100%;
  background: var(--ac-bg);
  background-image: var(--ac-bg-pattern);
  background-size: var(--ac-bg-pattern-size);
  color: var(--ac-text);
  font-family: var(--ac-font-body);
}

.welcome-header {
  background: var(--ac-header-bg);
  border-bottom: var(--ac-border-width) solid var(--ac-header-border);
  backdrop-filter: blur(8px);
}

.welcome-card {
  background: var(--ac-surface);
  border: var(--ac-border-width) solid var(--ac-border);
  border-radius: var(--ac-radius-card);
  box-shadow: var(--ac-shadow-card);
}

.welcome-card--primary {
  box-shadow: var(--ac-shadow-float);
}

.welcome-icon {
  background: var(--ac-surface);
  border: var(--ac-border-width) solid var(--ac-border);
  border-radius: var(--ac-radius-card);
  box-shadow: var(--ac-shadow-card);
}

.welcome-title {
  font-family: var(--ac-font-heading);
  color: var(--ac-text);
}

.welcome-muted {
  color: var(--ac-text-muted);
}

.welcome-subtle {
  color: var(--ac-text-subtle);
}

.welcome-mono {
  font-family: var(--ac-font-mono);
}

.welcome-code {
  font-family: var(--ac-font-code);
}

.welcome-button {
  font-family: var(--ac-font-mono);
  color: var(--ac-text-muted);
  background: var(--ac-surface);
  border: var(--ac-border-width) solid var(--ac-border);
  border-radius: var(--ac-radius-button);
  cursor: pointer;
  transition: all 0.2s ease;
}

.welcome-button:hover {
  background: var(--ac-hover-bg-subtle);
}

.welcome-command-row {
  background: var(--ac-code-bg);
  border: var(--ac-border-width) solid var(--ac-code-border);
  border-radius: var(--ac-radius-inner);
}

.welcome-alt-row {
  background: var(--ac-surface-muted);
  border: var(--ac-border-width) solid var(--ac-border);
  border-radius: var(--ac-radius-inner);
}

.welcome-input {
  font-family: var(--ac-font-code);
  color: var(--ac-text);
}

.welcome-input::placeholder {
  color: var(--ac-text-subtle);
}

.welcome-connect-btn {
  font-family: var(--ac-font-mono);
  color: var(--ac-text);
  background: var(--ac-accent);
  border: none;
  border-radius: var(--ac-radius-button);
  cursor: pointer;
  transition: all 0.2s ease;
}

.welcome-connect-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.welcome-connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.welcome-success {
  background: var(--ac-diff-add-bg);
  border: var(--ac-border-width) solid var(--ac-diff-add-border);
  border-radius: var(--ac-radius-inner);
  color: var(--ac-success);
}

.welcome-error {
  background: var(--ac-diff-del-bg);
  border: var(--ac-border-width) solid var(--ac-diff-del-border);
  border-radius: var(--ac-radius-inner);
  color: var(--ac-danger);
}

.ac-btn {
  cursor: pointer;
  transition: all 0.2s ease;
}

.ac-btn:hover {
  opacity: 0.8;
}
</style>
