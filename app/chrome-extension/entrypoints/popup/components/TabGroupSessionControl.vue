<template>
  <div class="session-control">
    <template v-if="!hasActiveSession">
      <!-- Big Start Session Button (One Click) -->
      <button class="start-session-button" :disabled="loading" @click="handleQuickStart">
        <span class="button-icon">🚀</span>
        <span class="button-text">{{
          loading ? 'Starting Session...' : 'Start Browser Session'
        }}</span>
      </button>

      <!-- Optional: Show settings link -->
      <button v-if="!loading" class="customize-link" @click="showForm = !showForm">
        {{ showForm ? '✕ Close' : '⚙️ Customize' }}
      </button>

      <!-- Session Creation Form (collapsible for advanced options) -->
      <div v-if="showForm" class="session-form">
        <div class="form-group">
          <label class="form-label">Session Name (optional)</label>
          <input
            v-model="newSessionName"
            class="form-input"
            placeholder="My Automation Session"
            @keyup.enter="handleStartSession"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Tab Group Color</label>
          <div class="color-picker">
            <button
              v-for="color in TAB_GROUP_COLORS"
              :key="color"
              class="color-button"
              :class="[`color-${color}`, { selected: selectedColor === color }]"
              @click="selectedColor = color"
              :title="color"
            ></button>
          </div>
        </div>

        <div class="form-actions">
          <button class="action-button primary" :disabled="loading" @click="handleStartSession">
            {{ loading ? 'Creating...' : 'Create Custom Session' }}
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Active Session Card -->
      <div class="active-session-card" :class="`border-${sessionColor}`">
        <div class="session-header-row">
          <div class="session-indicator">
            <span class="color-dot" :class="`bg-${sessionColor}`"></span>
            <div class="session-text">
              <span class="session-name">{{ sessionName }}</span>
              <span class="session-info"
                >{{ tabCount }} tab{{ tabCount !== 1 ? 's' : '' }} active</span
              >
            </div>
          </div>
          <button
            class="end-button"
            :disabled="loading"
            @click="handleEndSession"
            title="End Session"
          >
            ✕
          </button>
        </div>

        <!-- Tab List Preview (compact) -->
        <div v-if="showTabs && tabs.length > 0" class="tabs-preview">
          <div
            v-for="(tab, index) in tabs.slice(0, 3)"
            :key="tab.tabId"
            class="tab-preview-item"
            :class="{ active: tab.active }"
            @click="switchToTab(tab.tabId)"
          >
            <img
              v-if="tab.favIconUrl"
              :src="tab.favIconUrl"
              class="tab-icon"
              @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
            />
            <div v-else class="tab-icon-placeholder"></div>
            <span class="tab-title">{{ tab.title || 'New Tab' }}</span>
          </div>
          <div v-if="tabs.length > 3" class="more-tabs"> +{{ tabs.length - 3 }} more </div>
        </div>

        <button v-if="tabs.length > 0" class="toggle-tabs-button" @click="showTabs = !showTabs">
          {{ showTabs ? 'Hide Tabs' : 'Show Tabs' }}
        </button>
      </div>
    </template>

    <!-- Error Display -->
    <div v-if="error" class="error-banner">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useTabGroupSession, TAB_GROUP_COLORS } from '../composables/useTabGroupSession';

const {
  session,
  tabs,
  loading,
  error,
  hasActiveSession,
  sessionName,
  sessionColor,
  tabCount,
  startSession,
  endSession,
  switchToTab,
} = useTabGroupSession();

// Form state
const showForm = ref(false);
const showTabs = ref(false);
const newSessionName = ref('');
const selectedColor = ref<chrome.tabGroups.ColorEnum>('blue');

// Quick start with default settings (one click)
async function handleQuickStart() {
  await startSession({
    // Use default name and random color
  });
}

// Advanced start with custom settings
async function handleStartSession() {
  const success = await startSession({
    name: newSessionName.value || undefined,
    color: selectedColor.value,
  });

  if (success) {
    // Reset form
    newSessionName.value = '';
    showForm.value = false;
  }
}

async function handleEndSession() {
  if (confirm('End this session? All tabs in the group will be closed.')) {
    await endSession();
    showTabs.value = false;
  }
}
</script>

<style scoped>
.session-control {
  margin-bottom: 16px;
}

/* Big Start Button */
.start-session-button {
  width: 100%;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: linear-gradient(135deg, var(--ac-accent, #4f46e5) 0%, #6366f1 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.start-session-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
}

.start-session-button:active:not(:disabled) {
  transform: translateY(0);
}

.start-session-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-icon {
  font-size: 24px;
}

.button-text {
  font-size: 16px;
}

/* Customize Link */
.customize-link {
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  background: transparent;
  border: 1px dashed var(--ac-border, #ddd);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ac-text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
}

.customize-link:hover {
  background: var(--ac-surface-secondary, #f9f9f9);
  border-color: var(--ac-accent, #4f46e5);
  color: var(--ac-accent, #4f46e5);
}

/* Session Form */
.session-form {
  margin-top: 12px;
  padding: 16px;
  background: var(--ac-surface, #fff);
  border: 1px solid var(--ac-border, #e0e0e0);
  border-radius: 8px;
}

.form-group {
  margin-bottom: 14px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--ac-text-secondary, #666);
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid var(--ac-border, #ddd);
  border-radius: 6px;
  background: var(--ac-input-bg, #fff);
  color: var(--ac-text, #333);
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: var(--ac-accent, #4f46e5);
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-button {
  width: 32px;
  height: 32px;
  border: 3px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-button:hover {
  transform: scale(1.1);
}

.color-button.selected {
  border-color: var(--ac-text, #333);
  box-shadow: 0 0 0 2px var(--ac-surface, #fff);
}

.color-grey {
  background: #9ca3af;
}
.color-blue {
  background: #3b82f6;
}
.color-red {
  background: #ef4444;
}
.color-yellow {
  background: #eab308;
}
.color-green {
  background: #22c55e;
}
.color-pink {
  background: #ec4899;
}
.color-purple {
  background: #8b5cf6;
}
.color-cyan {
  background: #06b6d4;
}
.color-orange {
  background: #f97316;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.action-button {
  flex: 1;
  height: 40px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.primary {
  background: var(--ac-accent, #4f46e5);
  color: white;
}

.action-button.primary:hover:not(:disabled) {
  opacity: 0.9;
}

.action-button.secondary {
  background: var(--ac-surface-secondary, #f5f5f5);
  color: var(--ac-text-secondary, #666);
}

.action-button.secondary:hover:not(:disabled) {
  background: var(--ac-hover-bg, #e5e5e5);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Active Session Card */
.active-session-card {
  padding: 16px;
  background: var(--ac-surface, #fff);
  border: 2px solid;
  border-radius: 12px;
  transition: all 0.2s;
}

.border-grey {
  border-color: #9ca3af;
}
.border-blue {
  border-color: #3b82f6;
}
.border-red {
  border-color: #ef4444;
}
.border-yellow {
  border-color: #eab308;
}
.border-green {
  border-color: #22c55e;
}
.border-pink {
  border-color: #ec4899;
}
.border-purple {
  border-color: #8b5cf6;
}
.border-cyan {
  border-color: #06b6d4;
}
.border-orange {
  border-color: #f97316;
}

.session-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.session-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.bg-grey {
  background: #9ca3af;
}
.bg-blue {
  background: #3b82f6;
}
.bg-red {
  background: #ef4444;
}
.bg-yellow {
  background: #eab308;
}
.bg-green {
  background: #22c55e;
}
.bg-pink {
  background: #ec4899;
}
.bg-purple {
  background: #8b5cf6;
}
.bg-cyan {
  background: #06b6d4;
}
.bg-orange {
  background: #f97316;
}

.session-text {
  display: flex;
  flex-direction: column;
}

.session-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ac-text, #333);
}

.session-info {
  font-size: 12px;
  color: var(--ac-text-secondary, #666);
}

.end-button {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fee2e2;
  border: none;
  border-radius: 6px;
  color: #dc2626;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.end-button:hover:not(:disabled) {
  background: #fecaca;
}

.end-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tabs Preview */
.tabs-preview {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--ac-border, #e0e0e0);
}

.tab-preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 4px;
  background: var(--ac-surface-secondary, #f9f9f9);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-preview-item:hover {
  background: var(--ac-hover-bg, #e5e5e5);
}

.tab-preview-item.active {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
}

.tab-icon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.tab-icon-placeholder {
  width: 16px;
  height: 16px;
  background: var(--ac-border, #ddd);
  border-radius: 2px;
  flex-shrink: 0;
}

.tab-title {
  flex: 1;
  font-size: 13px;
  color: var(--ac-text, #333);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.more-tabs {
  text-align: center;
  padding: 6px;
  font-size: 12px;
  color: var(--ac-text-secondary, #666);
  font-weight: 500;
}

.toggle-tabs-button {
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  background: transparent;
  border: 1px dashed var(--ac-border, #ddd);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-tabs-button:hover {
  background: var(--ac-surface-secondary, #f9f9f9);
  border-color: var(--ac-accent, #4f46e5);
  color: var(--ac-accent, #4f46e5);
}

/* Error Banner */
.error-banner {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 500;
}
</style>
