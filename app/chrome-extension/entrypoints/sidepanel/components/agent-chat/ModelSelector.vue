<template>
  <div class="model-selector" ref="selectorRef">
    <button class="selector-trigger" @click="isOpen = !isOpen">
      <ModelBadge
        :model-id="activeModel?.id"
        :model-name="activeModel?.name"
        :provider-id="activeProvider?.id"
        :capabilities="activeModel?.capabilities"
      />
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="dropdown-overlay" @click="isOpen = false"></div>
      <div v-if="isOpen" class="dropdown-menu" :style="dropdownStyle" ref="dropdownRef">
        <div class="dropdown-header">
          <span class="header-title">Select Model</span>
          <button class="settings-btn" @click="openSettings" title="AI Settings">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div class="dropdown-content">
          <template v-if="enabledProviders.length === 0">
            <div class="empty-state">
              <p>No providers enabled</p>
              <button class="setup-btn" @click="openSettings"> Configure Providers </button>
            </div>
          </template>

          <template v-else>
            <div v-for="provider in enabledProviders" :key="provider.id" class="provider-group">
              <div class="provider-header">
                <span class="provider-icon">{{ getProviderIcon(provider.id) }}</span>
                <span class="provider-name">{{ provider.name }}</span>
              </div>

              <button
                v-for="model in getModelsForProvider(provider.id)"
                :key="model.id"
                class="model-item"
                :class="{ active: activeModel?.id === model.id }"
                @click="selectModel(provider.id, model)"
              >
                <div class="model-info">
                  <div class="model-name">{{ model.name }}</div>
                  <div class="model-meta">
                    <span class="context">{{ formatContext(model.contextLength) }}</span>
                    <span v-if="model.pricing" class="pricing">
                      ${{ model.pricing.input }}/${{ model.pricing.output }}
                    </span>
                  </div>
                </div>
                <div class="model-caps">
                  <span v-if="model.capabilities.includes('vision')" class="cap" title="Vision"
                    >👁️</span
                  >
                  <span
                    v-if="model.capabilities.includes('function_calling')"
                    class="cap"
                    title="Tools"
                    >🔧</span
                  >
                  <span
                    v-if="model.capabilities.includes('reasoning')"
                    class="cap"
                    title="Reasoning"
                    >🧩</span
                  >
                </div>
              </button>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useAiCore } from '../../composables/useAiCore';
import ModelBadge from './ModelBadge.vue';

interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: string[];
  contextLength: number;
  pricing?: { input: number; output: number };
}

interface Provider {
  id: string;
  name: string;
  enabled: boolean;
}

const { enabledProviders, activeModel, activeProvider, modelsByProvider, setActiveModel } =
  useAiCore();

const isOpen = ref(false);
const selectorRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

const dropdownStyle = ref({
  position: 'fixed' as const,
  top: '0px',
  left: '0px',
  width: '300px',
  zIndex: '10000',
});

function getProviderIcon(providerId: string): string {
  const icons: Record<string, string> = {
    openai: '🤖',
    anthropic: '🧠',
    google: '✨',
    ollama: '🦙',
  };
  return icons[providerId] || '🔌';
}

function getModelsForProvider(providerId: string): Model[] {
  return modelsByProvider.value.get(providerId) || [];
}

function formatContext(length: number): string {
  if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M ctx`;
  if (length >= 1000) return `${(length / 1000).toFixed(0)}K ctx`;
  return `${length} ctx`;
}

function selectModel(providerId: string, model: Model) {
  setActiveModel(providerId, model.id);
  isOpen.value = false;
}

function openSettings() {
  chrome.runtime.openOptionsPage();
  isOpen.value = false;
}

function updateDropdownPosition() {
  if (!selectorRef.value || !isOpen.value) return;

  const rect = selectorRef.value.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  // Position above if not enough space below
  const spaceBelow = viewportHeight - rect.bottom;
  const dropdownHeight = 400;

  let top = rect.bottom + 4;
  if (spaceBelow < dropdownHeight && rect.top > spaceBelow) {
    top = rect.top - dropdownHeight - 4;
  }

  dropdownStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${rect.left}px`,
    width: '300px',
    zIndex: '10000',
  };
}

watch(isOpen, (open) => {
  if (open) {
    updateDropdownPosition();
  }
});

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isOpen.value) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', updateDropdownPosition);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', updateDropdownPosition);
});
</script>

<style scoped>
.model-selector {
  position: relative;
}

.selector-trigger {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

/* Dropdown */
.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.dropdown-menu {
  background: var(--ac-surface-primary, white);
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ac-border, #e2e8f0);
}

.header-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ac-text-primary, #1e293b);
}

.settings-btn {
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: var(--ac-text-secondary, #64748b);
  transition: all 0.15s;
}

.settings-btn:hover {
  background: var(--ac-surface-secondary, #f1f5f9);
  color: var(--ac-text-primary, #1e293b);
}

.settings-btn svg {
  width: 18px;
  height: 18px;
}

.dropdown-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--ac-text-secondary, #64748b);
}

.empty-state p {
  margin-bottom: 12px;
}

.setup-btn {
  padding: 8px 16px;
  background: var(--ac-primary, #3b82f6);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.setup-btn:hover {
  background: var(--ac-primary-dark, #2563eb);
}

.provider-group {
  margin-bottom: 12px;
}

.provider-group:last-child {
  margin-bottom: 0;
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--ac-text-tertiary, #94a3b8);
  letter-spacing: 0.5px;
}

.provider-icon {
  font-size: 12px;
}

.model-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.model-item:hover {
  background: var(--ac-surface-secondary, #f8fafc);
}

.model-item.active {
  background: var(--ac-primary-light, #eff6ff);
}

.model-info {
  flex: 1;
  min-width: 0;
}

.model-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ac-text-primary, #1e293b);
  margin-bottom: 2px;
}

.model-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: var(--ac-text-tertiary, #94a3b8);
}

.model-caps {
  display: flex;
  gap: 2px;
}

.cap {
  font-size: 12px;
  opacity: 0.8;
}
</style>
