<template>
  <div class="options-page" :class="{ 'dark-mode': isDarkMode }">
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">🌐</span>
          <span class="logo-text">BTCP</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <div class="nav-section-title">AI Configuration</div>
          <button
            v-for="item in aiNavItems"
            :key="item.id"
            :class="['nav-item', { active: currentPage === item.id }]"
            @click="currentPage = item.id"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </div>

        <div class="nav-section">
          <div class="nav-section-title">Tools</div>
          <button
            v-for="item in toolNavItems"
            :key="item.id"
            :class="['nav-item', { active: currentPage === item.id }]"
            @click="currentPage = item.id"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </button>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button class="theme-toggle" @click="toggleDarkMode">
          {{ isDarkMode ? '☀️' : '🌙' }}
        </button>
        <span class="version">v1.0.0</span>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <KeepAlive>
        <component :is="currentPageComponent" />
      </KeepAlive>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import ProvidersPage from './pages/ProvidersPage.vue';
import ModelsPage from './pages/ModelsPage.vue';
import AssistantsPage from './pages/AssistantsPage.vue';
import PreferencesPage from './pages/PreferencesPage.vue';
import UserscriptsPage from './pages/UserscriptsPage.vue';

type PageId = 'providers' | 'models' | 'assistants' | 'preferences' | 'userscripts';

interface NavItem {
  id: PageId;
  icon: string;
  label: string;
}

const aiNavItems: NavItem[] = [
  { id: 'providers', icon: '🔌', label: 'AI Providers' },
  { id: 'models', icon: '🤖', label: 'Models' },
  { id: 'assistants', icon: '👤', label: 'Assistants' },
  { id: 'preferences', icon: '⚙️', label: 'Preferences' },
];

const toolNavItems: NavItem[] = [{ id: 'userscripts', icon: '📜', label: 'Userscripts' }];

const currentPage = ref<PageId>('providers');
const isDarkMode = ref(false);

const pageComponents = {
  providers: ProvidersPage,
  models: ModelsPage,
  assistants: AssistantsPage,
  preferences: PreferencesPage,
  userscripts: UserscriptsPage,
};

const currentPageComponent = computed(() => pageComponents[currentPage.value]);

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('btcp-dark-mode', isDarkMode.value ? 'true' : 'false');
}

onMounted(() => {
  // Load dark mode preference
  const saved = localStorage.getItem('btcp-dark-mode');
  if (saved === 'true') {
    isDarkMode.value = true;
  } else if (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    isDarkMode.value = true;
  }
});
</script>

<style>
/* Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  line-height: 1.5;
}

#app {
  height: 100%;
}
</style>

<style scoped>
.options-page {
  display: flex;
  height: 100vh;
  background: #f8fafc;
  color: #1e293b;
}

.options-page.dark-mode {
  background: #0f172a;
  color: #e2e8f0;
}

/* Sidebar */
.sidebar {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.dark-mode .sidebar {
  background: #1e293b;
  border-color: #334155;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
}

.dark-mode .sidebar-header {
  border-color: #334155;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  color: #3b82f6;
}

.sidebar-nav {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: #64748b;
  padding: 8px 12px;
  letter-spacing: 0.5px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: inherit;
  transition: all 0.15s ease;
  text-align: left;
}

.nav-item:hover {
  background: #f1f5f9;
}

.dark-mode .nav-item:hover {
  background: #334155;
}

.nav-item.active {
  background: #eff6ff;
  color: #3b82f6;
  font-weight: 500;
}

.dark-mode .nav-item.active {
  background: #1e3a5f;
  color: #60a5fa;
}

.nav-icon {
  font-size: 16px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dark-mode .sidebar-footer {
  border-color: #334155;
}

.theme-toggle {
  padding: 8px;
  border: none;
  background: #f1f5f9;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
}

.dark-mode .theme-toggle {
  background: #334155;
}

.version {
  font-size: 12px;
  color: #94a3b8;
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}
</style>
