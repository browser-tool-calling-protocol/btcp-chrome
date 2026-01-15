<template>
  <div class="options-page" :class="{ dark: isDarkMode }">
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <span class="logo-icon">🌐</span>
          <span class="logo-text">BTCP</span>
        </div>
      </div>

      <nav class="sidebar-nav" role="navigation" aria-label="Main navigation">
        <div class="nav-section">
          <div class="nav-section-title" id="ai-config-title">AI Configuration</div>
          <div role="group" aria-labelledby="ai-config-title">
            <button
              v-for="item in aiNavItems"
              :key="item.id"
              :class="['nav-item', { active: currentPage === item.id }]"
              :aria-current="currentPage === item.id ? 'page' : undefined"
              @click="currentPage = item.id"
            >
              <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </button>
          </div>
        </div>

        <div class="nav-section">
          <div class="nav-section-title" id="tools-title">Tools</div>
          <div role="group" aria-labelledby="tools-title">
            <button
              v-for="item in toolNavItems"
              :key="item.id"
              :class="['nav-item', { active: currentPage === item.id }]"
              :aria-current="currentPage === item.id ? 'page' : undefined"
              @click="currentPage = item.id"
            >
              <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
              <span class="nav-label">{{ item.label }}</span>
            </button>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <button
          class="theme-toggle"
          @click="toggleDarkMode"
          :aria-label="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
          :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          <span class="theme-icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
        </button>
        <span class="version">v1.0.0</span>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <Transition name="page" mode="out-in">
        <KeepAlive>
          <component :is="currentPageComponent" :key="currentPage" />
        </KeepAlive>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
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

// Apply dark class to document for design tokens
watch(
  isDarkMode,
  (dark) => {
    document.documentElement.classList.toggle('dark', dark);
  },
  { immediate: true },
);

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
@import '../shared/design-tokens.css';

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
  font-family: var(--font-family);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background: var(--bg-page);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}
</style>

<style scoped>
.options-page {
  display: flex;
  height: 100vh;
  background: var(--bg-page);
  color: var(--text-primary);
}

/* Sidebar */
.sidebar {
  width: 260px;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition:
    background-color var(--transition-normal),
    border-color var(--transition-normal);
}

.sidebar-header {
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-default);
}

.logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.logo-icon {
  font-size: 28px;
  line-height: 1;
}

.logo-text {
  font-size: var(--text-xl);
  font-weight: var(--font-bold);
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-3);
  overflow-y: auto;
}

.nav-section {
  margin-bottom: var(--space-6);
}

.nav-section:last-child {
  margin-bottom: 0;
}

.nav-section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
  color: var(--text-tertiary);
  padding: var(--space-2) var(--space-3);
  letter-spacing: 0.05em;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3) var(--space-3);
  border: none;
  background: transparent;
  border-radius: var(--radius-lg);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-normal);
  color: var(--text-secondary);
  transition: var(--transition-all);
  text-align: left;
  position: relative;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: var(--interactive-primary);
  border-radius: var(--radius-full);
  transition: height var(--transition-normal);
}

.nav-item:hover {
  background: var(--bg-surface-secondary);
  color: var(--text-primary);
}

.nav-item:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.nav-item.active {
  background: var(--color-primary-50);
  color: var(--interactive-primary);
  font-weight: var(--font-medium);
}

.dark .nav-item.active {
  background: rgba(59, 130, 246, 0.15);
  color: var(--color-primary-400);
}

.nav-item.active::before {
  height: 24px;
}

.nav-icon {
  font-size: 18px;
  line-height: 1;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: var(--space-4);
  border-top: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-default);
  background: var(--bg-surface-secondary);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition-all);
}

.theme-toggle:hover {
  background: var(--bg-surface-tertiary);
  border-color: var(--border-hover);
  transform: scale(1.05);
}

.theme-toggle:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.theme-icon {
  font-size: 18px;
  line-height: 1;
}

.version {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* Main Content */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-8);
  background: var(--bg-page);
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
