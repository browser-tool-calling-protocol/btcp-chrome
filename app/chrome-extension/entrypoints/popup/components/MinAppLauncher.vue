<template>
  <div class="minapp-launcher">
    <h3 class="section-title">Quick Actions</h3>

    <div v-if="loading" class="loading">Loading...</div>

    <div v-else class="apps-grid">
      <button
        v-for="app in minApps"
        :key="app.id"
        class="app-btn"
        :class="{ running: runningApp === app.id }"
        @click="launchApp(app)"
        :disabled="runningApp !== null"
      >
        <span class="app-icon">{{ app.icon }}</span>
        <span class="app-name">{{ app.name }}</span>
      </button>
    </div>

    <!-- Input Modal -->
    <div v-if="showInputModal" class="modal-overlay" @click.self="cancelInput">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-icon">{{ pendingApp?.icon }}</span>
          <span class="modal-title">{{ pendingApp?.name }}</span>
        </div>
        <div class="modal-body">
          <input
            ref="inputRef"
            v-model="userInput"
            :placeholder="pendingApp?.inputPlaceholder || 'Enter input...'"
            @keydown.enter="submitInput"
            @keydown.escape="cancelInput"
            autofocus
          />
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="cancelInput">Cancel</button>
          <button class="btn-run" @click="submitInput">Run</button>
        </div>
      </div>
    </div>

    <!-- Result Display -->
    <div v-if="result" class="result-panel">
      <div class="result-header">
        <span class="result-status" :class="{ success: result.success, error: !result.success }">
          {{ result.success ? '✓' : '✗' }}
        </span>
        <span class="result-title">{{ lastAppName }}</span>
        <button class="close-btn" @click="result = null">&times;</button>
      </div>
      <div class="result-content">
        <div v-if="result.error" class="error-message">{{ result.error }}</div>
        <div
          v-else-if="result.output"
          class="output-text"
          v-html="formatOutput(result.output)"
        ></div>
      </div>
      <div v-if="result.actions?.length" class="result-actions">
        <button
          v-for="(action, i) in result.actions"
          :key="i"
          class="action-btn"
          @click="executeAction(action)"
        >
          {{ action.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

interface MinApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiresInput?: boolean;
  inputPlaceholder?: string;
}

interface MinAppResult {
  success: boolean;
  output?: string;
  error?: string;
  actions?: Array<{
    type: string;
    label: string;
    payload: Record<string, unknown>;
  }>;
}

const minApps = ref<MinApp[]>([]);
const loading = ref(true);
const runningApp = ref<string | null>(null);
const result = ref<MinAppResult | null>(null);
const lastAppName = ref('');

// Input modal state
const showInputModal = ref(false);
const pendingApp = ref<MinApp | null>(null);
const userInput = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

async function loadMinApps() {
  loading.value = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'MINAPP_LIST' });
    if (response.success) {
      minApps.value = response.data;
    }
  } catch (error) {
    console.error('Failed to load MinApps:', error);
  } finally {
    loading.value = false;
  }
}

async function launchApp(app: MinApp) {
  result.value = null;

  if (app.requiresInput) {
    pendingApp.value = app;
    userInput.value = '';
    showInputModal.value = true;
    await nextTick();
    inputRef.value?.focus();
    return;
  }

  await executeApp(app.id);
}

async function submitInput() {
  if (!pendingApp.value) return;

  const appId = pendingApp.value.id;
  const input = userInput.value;

  showInputModal.value = false;
  pendingApp.value = null;

  await executeApp(appId, input);
}

function cancelInput() {
  showInputModal.value = false;
  pendingApp.value = null;
  userInput.value = '';
}

async function executeApp(appId: string, input?: string) {
  const app = minApps.value.find((a) => a.id === appId);
  if (!app) return;

  runningApp.value = appId;
  lastAppName.value = app.name;

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'MINAPP_EXECUTE',
      payload: { appId, userInput: input },
    });

    result.value = response.data || { success: false, error: response.error };
  } catch (error) {
    result.value = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    runningApp.value = null;
  }
}

function formatOutput(output: string): string {
  // Simple markdown to HTML conversion
  return output
    .replace(/^## (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h5>$1</h5>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.+<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

async function executeAction(action: {
  type: string;
  label: string;
  payload: Record<string, unknown>;
}) {
  switch (action.type) {
    case 'copy':
      if (action.payload.text) {
        await navigator.clipboard.writeText(action.payload.text as string);
        // Could show a toast here
      }
      break;
    case 'navigate':
      if (action.payload.url) {
        await chrome.tabs.create({ url: action.payload.url as string });
      }
      break;
    case 'run_minapp':
      if (action.payload.appId) {
        await executeApp(action.payload.appId as string);
      }
      break;
  }
}

onMounted(loadMinApps);
</script>

<style scoped>
.minapp-launcher {
  padding: 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.loading {
  text-align: center;
  padding: 16px;
  color: #64748b;
  font-size: 12px;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.app-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}

.app-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.app-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-btn.running {
  background: #eff6ff;
  border-color: #3b82f6;
}

.app-icon {
  font-size: 24px;
}

.app-name {
  font-size: 11px;
  font-weight: 500;
  color: #475569;
  text-align: center;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 280px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-icon {
  font-size: 20px;
}

.modal-title {
  font-weight: 600;
  font-size: 14px;
}

.modal-body {
  padding: 16px;
}

.modal-body input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
}

.modal-body input:focus {
  outline: none;
  border-color: #3b82f6;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f1f5f9;
}

.btn-cancel,
.btn-run {
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.btn-run {
  background: #3b82f6;
  color: white;
}

/* Result Panel */
.result-panel {
  margin-top: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
}

.result-status {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
}

.result-status.success {
  background: #dcfce7;
  color: #16a34a;
}

.result-status.error {
  background: #fee2e2;
  color: #dc2626;
}

.result-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.result-content {
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.5;
}

.error-message {
  color: #dc2626;
}

.output-text {
  color: #334155;
}

.output-text :deep(h4) {
  font-size: 13px;
  font-weight: 600;
  margin: 8px 0 4px 0;
}

.output-text :deep(h5) {
  font-size: 12px;
  font-weight: 600;
  margin: 6px 0 4px 0;
}

.output-text :deep(ul) {
  margin: 4px 0;
  padding-left: 16px;
}

.output-text :deep(li) {
  margin: 2px 0;
}

.result-actions {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid #e2e8f0;
}

.action-btn {
  padding: 6px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}

.action-btn:hover {
  background: #f1f5f9;
}
</style>
