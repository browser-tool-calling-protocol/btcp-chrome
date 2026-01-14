<template>
  <div class="session-container">
    <!-- Session Header -->
    <div class="session-header">
      <div class="session-title-row">
        <h3 class="session-title">Tab Group Session</h3>
        <div class="session-status" :class="{ active: hasActiveSession }">
          <span class="status-dot"></span>
          <span class="status-text">{{ hasActiveSession ? 'Active' : 'Inactive' }}</span>
        </div>
      </div>
      <p class="session-description">
        {{ hasActiveSession
          ? 'All browser tools operate only within this session\'s tab group.'
          : 'Start a session to scope all browser tools to a dedicated tab group.'
        }}
      </p>
    </div>

    <!-- Session Controls -->
    <div class="session-controls">
      <template v-if="!hasActiveSession">
        <!-- Start Session Form -->
        <div class="start-session-form">
          <div class="form-row">
            <label class="form-label">Session Name</label>
            <input
              v-model="newSessionName"
              class="form-input"
              placeholder="Enter session name..."
              @keyup.enter="handleStartSession"
            />
          </div>
          <div class="form-row">
            <label class="form-label">Tab Group Color</label>
            <div class="color-picker">
              <button
                v-for="color in TAB_GROUP_COLORS"
                :key="color"
                class="color-btn"
                :class="[`color-${color}`, { selected: selectedColor === color }]"
                @click="selectedColor = color"
                :title="color"
              ></button>
            </div>
          </div>
          <div class="form-row">
            <label class="form-label">Initial URL (optional)</label>
            <input
              v-model="initialUrl"
              class="form-input"
              placeholder="https://example.com"
            />
          </div>
          <button
            class="btn btn-primary"
            :disabled="loading"
            @click="handleStartSession"
          >
            <span v-if="loading">Starting...</span>
            <span v-else>Start Session</span>
          </button>
        </div>
      </template>

      <template v-else>
        <!-- Active Session Info -->
        <div class="active-session">
          <div class="session-info-card" :class="`border-${sessionColor}`">
            <div class="session-info-header">
              <div class="session-color-indicator" :class="`bg-${sessionColor}`"></div>
              <div class="session-info-text">
                <span class="session-name">{{ sessionName }}</span>
                <span class="session-meta">{{ tabCount }} tab{{ tabCount !== 1 ? 's' : '' }}</span>
              </div>
            </div>
            <button
              class="btn btn-danger btn-sm"
              :disabled="loading"
              @click="handleEndSession"
            >
              End Session
            </button>
          </div>

          <!-- Session Tabs -->
          <div class="session-tabs">
            <h4 class="tabs-title">Session Tabs</h4>
            <div class="tabs-list" v-if="tabs.length > 0">
              <div
                v-for="tab in tabs"
                :key="tab.tabId"
                class="tab-item"
                :class="{ active: tab.active }"
                @click="switchToTab(tab.tabId)"
              >
                <img
                  v-if="tab.favIconUrl"
                  :src="tab.favIconUrl"
                  class="tab-favicon"
                  @error="(e) => (e.target as HTMLImageElement).style.display = 'none'"
                />
                <div v-else class="tab-favicon-placeholder"></div>
                <div class="tab-info">
                  <span class="tab-title">{{ tab.title || 'New Tab' }}</span>
                  <span class="tab-url">{{ formatUrl(tab.url) }}</span>
                </div>
                <button
                  class="tab-close"
                  @click.stop="closeTab(tab.tabId)"
                  title="Close tab"
                >
                  <svg viewBox="0 0 20 20" width="14" height="14">
                    <path
                      fill="currentColor"
                      d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div v-else class="tabs-empty">
              <p>No tabs in session</p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script lang="ts" setup>
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
  closeTab,
} = useTabGroupSession();

// Form state
const newSessionName = ref('');
const selectedColor = ref<chrome.tabGroups.ColorEnum>('blue');
const initialUrl = ref('');

async function handleStartSession() {
  const success = await startSession({
    name: newSessionName.value || undefined,
    color: selectedColor.value,
    initialUrl: initialUrl.value || undefined,
  });

  if (success) {
    // Reset form
    newSessionName.value = '';
    initialUrl.value = '';
  }
}

async function handleEndSession() {
  if (confirm('Are you sure you want to end this session? All tabs in the session will be closed.')) {
    await endSession();
  }
}

function formatUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url.substring(0, 50);
  }
}
</script>

<style scoped>
.session-container {
  padding: 16px;
  color: var(--ac-text, #262626);
}

.session-header {
  margin-bottom: 16px;
}

.session-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.session-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.session-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--ac-surface-muted, #f5f5f5);
}

.session-status.active {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #a3a3a3;
}

.session-status.active .status-dot {
  background: #22c55e;
}

.session-description {
  font-size: 13px;
  color: var(--ac-text-muted, #737373);
  margin: 0;
  line-height: 1.5;
}

.session-controls {
  margin-top: 16px;
}

/* Start Session Form */
.start-session-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--ac-text-subtle, #737373);
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  background: var(--ac-surface-muted, #f5f5f5);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--ac-text, #262626);
  outline: none;
}

.form-input:focus {
  background: var(--ac-hover-bg, #e5e5e5);
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-btn {
  width: 28px;
  height: 28px;
  border: 2px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-btn.selected {
  border-color: var(--ac-text, #262626);
  transform: scale(1.1);
}

.color-grey { background: #9ca3af; }
.color-blue { background: #3b82f6; }
.color-red { background: #ef4444; }
.color-yellow { background: #eab308; }
.color-green { background: #22c55e; }
.color-pink { background: #ec4899; }
.color-purple { background: #8b5cf6; }
.color-cyan { background: #06b6d4; }
.color-orange { background: #f97316; }

/* Buttons */
.btn {
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-primary {
  background: var(--ac-accent, #d97757);
  color: var(--ac-accent-contrast, #ffffff);
}

.btn-primary:hover:not(:disabled) {
  background: var(--ac-accent-hover, #c4664a);
}

.btn-danger {
  background: #fef2f2;
  color: #dc2626;
}

.btn-danger:hover:not(:disabled) {
  background: #fee2e2;
}

.btn-sm {
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Active Session */
.active-session {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.session-info-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--ac-surface, #ffffff);
  border: 2px solid;
  border-radius: 10px;
}

.border-grey { border-color: #9ca3af; }
.border-blue { border-color: #3b82f6; }
.border-red { border-color: #ef4444; }
.border-yellow { border-color: #eab308; }
.border-green { border-color: #22c55e; }
.border-pink { border-color: #ec4899; }
.border-purple { border-color: #8b5cf6; }
.border-cyan { border-color: #06b6d4; }
.border-orange { border-color: #f97316; }

.session-info-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.session-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.bg-grey { background: #9ca3af; }
.bg-blue { background: #3b82f6; }
.bg-red { background: #ef4444; }
.bg-yellow { background: #eab308; }
.bg-green { background: #22c55e; }
.bg-pink { background: #ec4899; }
.bg-purple { background: #8b5cf6; }
.bg-cyan { background: #06b6d4; }
.bg-orange { background: #f97316; }

.session-info-text {
  display: flex;
  flex-direction: column;
}

.session-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ac-text, #262626);
}

.session-meta {
  font-size: 12px;
  color: var(--ac-text-muted, #737373);
}

/* Session Tabs */
.session-tabs {
  background: var(--ac-surface-muted, #f5f5f5);
  border-radius: 10px;
  padding: 12px;
}

.tabs-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ac-text-subtle, #737373);
  margin: 0 0 10px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tabs-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--ac-surface, #ffffff);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-item:hover {
  background: var(--ac-hover-bg, #e5e5e5);
}

.tab-item.active {
  background: rgba(59, 130, 246, 0.1);
}

.tab-favicon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  flex-shrink: 0;
}

.tab-favicon-placeholder {
  width: 16px;
  height: 16px;
  background: var(--ac-surface-muted, #e5e5e5);
  border-radius: 2px;
  flex-shrink: 0;
}

.tab-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.tab-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--ac-text, #262626);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-url {
  font-size: 11px;
  color: var(--ac-text-muted, #a3a3a3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--ac-text-muted, #a3a3a3);
  cursor: pointer;
  opacity: 0;
  transition: all 0.15s ease;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.tabs-empty {
  text-align: center;
  padding: 16px;
  color: var(--ac-text-muted, #a3a3a3);
  font-size: 13px;
}

/* Error */
.error-message {
  margin-top: 12px;
  padding: 10px;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 6px;
  font-size: 13px;
}
</style>
