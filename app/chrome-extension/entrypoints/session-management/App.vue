<template>
  <div class="session-dashboard agent-theme">
    <div class="dashboard-container">
      <!-- Header -->
      <header class="dashboard-header">
        <div class="header-content">
          <h1 class="dashboard-title">Session Management</h1>
          <p class="dashboard-subtitle">Manage your browser automation session</p>
        </div>
      </header>

      <!-- Loading State -->
      <div v-if="loading && !hasActiveSession" class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading session...</p>
      </div>

      <!-- No Session State -->
      <div v-else-if="!hasActiveSession" class="no-session-state">
        <div class="empty-icon">📋</div>
        <h2>No Active Session</h2>
        <p>This page is part of a tab group session that has ended or doesn't exist.</p>
        <button class="btn-primary" @click="openPopup"> Create New Session </button>
      </div>

      <!-- Active Session -->
      <div v-else class="session-content">
        <!-- Session Info Card -->
        <div class="session-info-card" :class="`border-${sessionColor}`">
          <div class="session-header-row">
            <div class="session-identity">
              <span class="color-dot" :class="`bg-${sessionColor}`"></span>
              <div class="session-details">
                <input
                  v-if="isEditingName"
                  v-model="editedSessionName"
                  @blur="saveSessionName"
                  @keyup.enter="saveSessionName"
                  @keyup.esc="cancelEditName"
                  class="session-name-input"
                  ref="nameInput"
                />
                <h2 v-else class="session-name" @click="startEditName">
                  {{ sessionName }}
                </h2>
                <p class="session-meta">
                  {{ tabCount }} tab{{ tabCount !== 1 ? 's' : '' }} • Created {{ createdTime }}
                </p>
              </div>
            </div>
            <div class="session-actions">
              <button
                class="action-btn color-picker-btn"
                @click="showColorPicker = !showColorPicker"
                title="Change color"
              >
                🎨
              </button>
              <button class="action-btn danger-btn" @click="confirmEndSession" title="End session">
                ✕
              </button>
            </div>
          </div>

          <!-- Color Picker -->
          <div v-if="showColorPicker" class="color-picker-dropdown">
            <p class="color-picker-label">Select Color:</p>
            <div class="color-options">
              <button
                v-for="color in TAB_GROUP_COLORS"
                :key="color"
                class="color-option"
                :class="[`color-${color}`, { selected: sessionColor === color }]"
                @click="changeColor(color)"
                :title="color"
              ></button>
            </div>
          </div>
        </div>

        <!-- Quick Actions Bar -->
        <div class="quick-actions-bar">
          <div class="action-group">
            <input
              v-model="newTabUrl"
              type="text"
              placeholder="Enter URL to open in session..."
              class="url-input"
              @keyup.enter="addNewTab"
            />
            <button class="btn-primary" @click="addNewTab" :disabled="!newTabUrl.trim()">
              Add Tab
            </button>
          </div>
          <button class="btn-secondary" @click="openSidepanel"> Open Sidepanel </button>
        </div>

        <!-- Tabs List -->
        <div class="tabs-section">
          <div class="tabs-header">
            <h3 class="tabs-title">Session Tabs</h3>
            <span class="tabs-count">{{ tabs.length }}</span>
          </div>

          <div v-if="tabs.length === 0" class="tabs-empty">
            <p>No tabs in this session yet</p>
            <button class="btn-secondary btn-sm" @click="addNewTab"> Add First Tab </button>
          </div>

          <div v-else class="tabs-list">
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
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <div v-else class="tab-favicon-placeholder">📄</div>

              <div class="tab-info">
                <span class="tab-title">{{ tab.title || 'Untitled' }}</span>
                <span class="tab-url">{{ formatUrl(tab.url) }}</span>
              </div>

              <span v-if="tab.active" class="active-badge">Active</span>

              <button
                class="tab-close-btn"
                @click.stop="confirmCloseTab(tab.tabId)"
                title="Close tab"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="error-banner">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import {
  useTabGroupSession,
  TAB_GROUP_COLORS,
} from '@/entrypoints/sidepanel/composables/useTabGroupSession';

// Use the existing composable
const {
  session,
  tabs,
  loading,
  error,
  hasActiveSession,
  sessionName,
  sessionColor,
  tabCount,
  endSession,
  switchToTab,
  closeTab,
  fetchSession,
} = useTabGroupSession();

// Local state
const newTabUrl = ref('');
const showColorPicker = ref(false);
const isEditingName = ref(false);
const editedSessionName = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

// Computed
const createdTime = computed(() => {
  if (!session.value?.createdAt) return '';
  const date = new Date(session.value.createdAt);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
});

// Methods
async function addNewTab() {
  if (!newTabUrl.value.trim()) return;

  let url = newTabUrl.value.trim();
  // Add protocol if missing
  if (!url.match(/^https?:\/\//i)) {
    url = 'https://' + url;
  }

  try {
    if (session.value?.groupId) {
      const tab = await chrome.tabs.create({
        url,
        active: false,
      });

      if (tab.id) {
        await chrome.tabs.group({ tabIds: tab.id, groupId: session.value.groupId });
      }

      await fetchSession();
      newTabUrl.value = '';
    }
  } catch (e) {
    console.error('Failed to add tab:', e);
  }
}

async function confirmCloseTab(tabId: number) {
  if (confirm('Close this tab?')) {
    await closeTab(tabId);
  }
}

async function confirmEndSession() {
  if (confirm('End this session? All tabs in the session will be closed.')) {
    await endSession();
  }
}

async function changeColor(color: chrome.tabGroups.ColorEnum) {
  try {
    if (session.value?.groupId) {
      await chrome.tabGroups.update(session.value.groupId, { color });
      await fetchSession();
      showColorPicker.value = false;
    }
  } catch (e) {
    console.error('Failed to change color:', e);
  }
}

function startEditName() {
  isEditingName.value = true;
  editedSessionName.value = sessionName.value;
  nextTick(() => {
    nameInput.value?.focus();
    nameInput.value?.select();
  });
}

async function saveSessionName() {
  if (editedSessionName.value.trim() && editedSessionName.value !== sessionName.value) {
    try {
      if (session.value?.groupId) {
        await chrome.tabGroups.update(session.value.groupId, {
          title: editedSessionName.value.trim(),
        });
        await fetchSession();
      }
    } catch (e) {
      console.error('Failed to rename session:', e);
    }
  }
  isEditingName.value = false;
}

function cancelEditName() {
  isEditingName.value = false;
  editedSessionName.value = '';
}

function formatUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname !== '/' ? u.pathname : '';
    return u.hostname + path;
  } catch {
    return url.substring(0, 60);
  }
}

async function openSidepanel() {
  await chrome.sidePanel.open({ windowId: session.value?.windowId });
}

function openPopup() {
  chrome.action.openPopup();
}

// Lifecycle
onMounted(() => {
  console.log('Session Management Dashboard loaded');
});
</script>

<style scoped>
.session-dashboard {
  min-height: 100vh;
  background: var(--ac-bg, #fafafa);
  color: var(--ac-text, #262626);
}

.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

/* Header */
.dashboard-header {
  margin-bottom: 32px;
}

.header-content {
  text-align: center;
}

.dashboard-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: var(--ac-text, #262626);
}

.dashboard-subtitle {
  font-size: 16px;
  color: var(--ac-text-muted, #737373);
  margin: 0;
}

/* Loading State */
.loading-state {
  text-align: center;
  padding: 60px 20px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border: 4px solid var(--ac-border, #e5e5e5);
  border-top-color: var(--ac-accent, #d97757);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* No Session State */
.no-session-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.no-session-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.no-session-state p {
  font-size: 16px;
  color: var(--ac-text-muted, #737373);
  margin: 0 0 24px 0;
}

/* Session Info Card */
.session-info-card {
  background: var(--ac-surface, #ffffff);
  border: 3px solid;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.session-identity {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex: 1;
}

.color-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
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

.session-details {
  flex: 1;
}

.session-name {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 8px 0;
  cursor: pointer;
  transition: color 0.2s;
}

.session-name:hover {
  color: var(--ac-accent, #d97757);
}

.session-name-input {
  width: 100%;
  font-size: 24px;
  font-weight: 700;
  padding: 4px 8px;
  border: 2px solid var(--ac-accent, #d97757);
  border-radius: 6px;
  background: var(--ac-surface, #fff);
  color: var(--ac-text, #262626);
}

.session-name-input:focus {
  outline: none;
}

.session-meta {
  font-size: 14px;
  color: var(--ac-text-muted, #737373);
  margin: 0;
}

.session-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--ac-surface-muted, #f5f5f5);
}

.action-btn:hover {
  background: var(--ac-hover-bg, #e5e5e5);
}

.danger-btn {
  color: #dc2626;
}

.danger-btn:hover {
  background: #fee2e2;
}

/* Color Picker */
.color-picker-dropdown {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--ac-border, #e5e5e5);
}

.color-picker-label {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--ac-text-subtle, #737373);
}

.color-options {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.color-option {
  width: 36px;
  height: 36px;
  border: 3px solid transparent;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.selected {
  border-color: var(--ac-text, #262626);
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

/* Quick Actions */
.quick-actions-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.action-group {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 300px;
}

.url-input {
  flex: 1;
  height: 44px;
  padding: 0 16px;
  font-size: 14px;
  border: 1px solid var(--ac-border, #e0e0e0);
  border-radius: 8px;
  background: var(--ac-surface, #fff);
  color: var(--ac-text, #262626);
}

.url-input:focus {
  outline: none;
  border-color: var(--ac-accent, #d97757);
}

/* Buttons */
.btn-primary,
.btn-secondary {
  height: 44px;
  padding: 0 24px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-primary {
  background: var(--ac-accent, #d97757);
  color: var(--ac-accent-contrast, #ffffff);
}

.btn-primary:hover:not(:disabled) {
  background: var(--ac-accent-hover, #c4664a);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--ac-surface-muted, #f5f5f5);
  color: var(--ac-text, #262626);
}

.btn-secondary:hover {
  background: var(--ac-hover-bg, #e5e5e5);
}

.btn-sm {
  height: 36px;
  padding: 0 16px;
  font-size: 13px;
}

/* Tabs Section */
.tabs-section {
  background: var(--ac-surface, #ffffff);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.tabs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tabs-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.tabs-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
  background: var(--ac-surface-muted, #f5f5f5);
  border-radius: 14px;
  color: var(--ac-text-subtle, #737373);
}

.tabs-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--ac-text-muted, #a3a3a3);
}

.tabs-empty p {
  margin: 0 0 16px 0;
}

/* Tab List */
.tabs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--ac-surface-muted, #f9f9f9);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-item:hover {
  background: var(--ac-hover-bg, #e5e5e5);
}

.tab-item.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
}

.tab-favicon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

.tab-favicon-placeholder {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.tab-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tab-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ac-text, #262626);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-url {
  font-size: 12px;
  color: var(--ac-text-muted, #a3a3a3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active-badge {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  background: #3b82f6;
  color: white;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tab-close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--ac-text-muted, #a3a3a3);
  font-size: 18px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.tab-item:hover .tab-close-btn {
  opacity: 1;
}

.tab-close-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* Error Banner */
.error-banner {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
  font-size: 14px;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
  }

  .dashboard-title {
    font-size: 24px;
  }

  .session-info-card {
    padding: 16px;
  }

  .session-name {
    font-size: 20px;
  }

  .quick-actions-bar {
    flex-direction: column;
  }

  .action-group {
    min-width: 100%;
  }
}
</style>
