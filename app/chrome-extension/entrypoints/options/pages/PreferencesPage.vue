<template>
  <div class="preferences-page">
    <header class="page-header">
      <h1 class="page-title">Preferences</h1>
      <p class="page-description">Configure default AI behavior and settings</p>
    </header>

    <div v-if="loading" class="loading">Loading preferences...</div>

    <div v-else class="preferences-sections">
      <!-- Default AI Settings -->
      <section class="settings-section">
        <h2 class="section-title">Default AI Settings</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Temperature</label>
            <p class="setting-description">
              Controls randomness in responses. Lower = more focused, higher = more creative.
            </p>
          </div>
          <div class="setting-control">
            <input
              type="range"
              v-model.number="preferences.defaultTemperature"
              min="0"
              max="1"
              step="0.1"
              @change="savePreferences"
            />
            <span class="value-display">{{ preferences.defaultTemperature }}</span>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Max Output Tokens</label>
            <p class="setting-description"> Maximum number of tokens in AI responses. </p>
          </div>
          <div class="setting-control">
            <select v-model.number="preferences.defaultMaxTokens" @change="savePreferences">
              <option :value="1024">1,024</option>
              <option :value="2048">2,048</option>
              <option :value="4096">4,096</option>
              <option :value="8192">8,192</option>
              <option :value="16384">16,384</option>
            </select>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Streaming Responses</label>
            <p class="setting-description">
              Show responses as they're generated instead of waiting for completion.
            </p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                v-model="preferences.streamingEnabled"
                @change="savePreferences"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Show Thinking/Reasoning</label>
            <p class="setting-description">
              Display extended thinking process from reasoning models (when available).
            </p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input type="checkbox" v-model="preferences.showThinking" @change="savePreferences" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <!-- Conversation Settings -->
      <section class="settings-section">
        <h2 class="section-title">Conversation Settings</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Auto-save Conversations</label>
            <p class="setting-description"> Automatically save conversation history. </p>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                v-model="preferences.autoSaveConversations"
                @change="savePreferences"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <!-- Data Management -->
      <section class="settings-section">
        <h2 class="section-title">Data Management</h2>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Export Settings</label>
            <p class="setting-description"> Download all AI configuration as JSON. </p>
          </div>
          <div class="setting-control">
            <button class="btn-secondary" @click="exportSettings"> Export </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">Import Settings</label>
            <p class="setting-description"> Restore settings from a previously exported file. </p>
          </div>
          <div class="setting-control">
            <input
              type="file"
              accept=".json"
              @change="importSettings"
              class="file-input"
              ref="fileInput"
            />
            <button class="btn-secondary" @click="($refs.fileInput as HTMLInputElement).click()">
              Import
            </button>
          </div>
        </div>

        <div class="setting-item danger">
          <div class="setting-info">
            <label class="setting-label">Reset All Settings</label>
            <p class="setting-description">
              Reset all AI settings to defaults. This cannot be undone.
            </p>
          </div>
          <div class="setting-control">
            <button class="btn-danger" @click="resetSettings"> Reset </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface Preferences {
  defaultTemperature: number;
  defaultMaxTokens: number;
  streamingEnabled: boolean;
  showThinking: boolean;
  autoSaveConversations: boolean;
}

const preferences = ref<Preferences>({
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
  streamingEnabled: true,
  showThinking: true,
  autoSaveConversations: true,
});

const loading = ref(true);
const fileInput = ref<HTMLInputElement | null>(null);

async function loadPreferences() {
  loading.value = true;
  try {
    const result = await chrome.storage.local.get('aiCore_preferences');
    if (result.aiCore_preferences) {
      preferences.value = { ...preferences.value, ...result.aiCore_preferences };
    }
  } catch (error) {
    console.error('Failed to load preferences:', error);
  } finally {
    loading.value = false;
  }
}

async function savePreferences() {
  try {
    await chrome.storage.local.set({ aiCore_preferences: preferences.value });
  } catch (error) {
    console.error('Failed to save preferences:', error);
    alert('Failed to save preferences');
  }
}

async function exportSettings() {
  try {
    const keys = [
      'aiCore_providers',
      'aiCore_customModels',
      'aiCore_customAssistants',
      'aiCore_preferences',
      'aiCore_activeProviderId',
      'aiCore_activeModelId',
      'aiCore_activeAssistantId',
    ];
    const data = await chrome.storage.local.get(keys);

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `btcp-ai-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    alert('Failed to export settings: ' + (error as Error).message);
  }
}

async function importSettings(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate keys
    const validKeys = [
      'aiCore_providers',
      'aiCore_customModels',
      'aiCore_customAssistants',
      'aiCore_preferences',
      'aiCore_activeProviderId',
      'aiCore_activeModelId',
      'aiCore_activeAssistantId',
    ];

    const filteredData: Record<string, unknown> = {};
    for (const key of validKeys) {
      if (key in data) {
        filteredData[key] = data[key];
      }
    }

    await chrome.storage.local.set(filteredData);
    await loadPreferences();
    alert('Settings imported successfully!');
  } catch (error) {
    alert('Failed to import settings: ' + (error as Error).message);
  }

  // Reset file input
  input.value = '';
}

async function resetSettings() {
  if (!confirm('Are you sure you want to reset all AI settings? This cannot be undone.')) {
    return;
  }

  try {
    const keys = [
      'aiCore_providers',
      'aiCore_customModels',
      'aiCore_customAssistants',
      'aiCore_preferences',
      'aiCore_activeProviderId',
      'aiCore_activeModelId',
      'aiCore_activeAssistantId',
    ];
    await chrome.storage.local.remove(keys);
    await loadPreferences();
    alert('Settings have been reset to defaults.');
  } catch (error) {
    alert('Failed to reset settings: ' + (error as Error).message);
  }
}

onMounted(loadPreferences);
</script>

<style scoped>
.preferences-page {
  max-width: 800px;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.page-description {
  color: #64748b;
  font-size: 14px;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #64748b;
}

.preferences-sections {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.settings-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  margin: 0;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
  gap: 24px;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item.danger {
  background: #fef2f2;
}

.setting-info {
  flex: 1;
  min-width: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.setting-description {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.setting-control select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  min-width: 120px;
}

.setting-control input[type='range'] {
  width: 120px;
}

.value-display {
  font-size: 14px;
  font-weight: 500;
  min-width: 32px;
  text-align: center;
}

/* Toggle Switch */
.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: #e2e8f0;
  border-radius: 12px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.toggle input:checked + .toggle-slider {
  background: #3b82f6;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* Buttons */
.btn-secondary {
  padding: 8px 16px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.btn-danger {
  padding: 8px 16px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-danger:hover {
  background: #fecaca;
}

.file-input {
  display: none;
}
</style>
