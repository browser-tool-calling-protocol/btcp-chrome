<template>
  <div class="assistant-selector" ref="selectorRef">
    <button class="selector-trigger" @click="isOpen = !isOpen">
      <span class="assistant-icon">{{ activeAssistant?.icon || '🤖' }}</span>
      <span class="assistant-name">{{ activeAssistant?.name || 'Select Assistant' }}</span>
      <svg class="chevron" :class="{ open: isOpen }" viewBox="0 0 20 20" fill="currentColor">
        <path
          fill-rule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="dropdown-overlay" @click="isOpen = false"></div>
      <div v-if="isOpen" class="dropdown-menu" :style="dropdownStyle" ref="dropdownRef">
        <div class="dropdown-header">
          <input
            v-model="searchQuery"
            placeholder="Search assistants..."
            class="search-input"
            @click.stop
          />
        </div>

        <div class="dropdown-content">
          <div
            v-for="[category, categoryAssistants] in filteredAssistants"
            :key="category"
            class="category-group"
          >
            <div class="category-header">{{ formatCategory(category) }}</div>
            <button
              v-for="assistant in categoryAssistants"
              :key="assistant.id"
              class="assistant-item"
              :class="{ active: activeAssistant?.id === assistant.id }"
              @click="selectAssistant(assistant)"
            >
              <span class="item-icon">{{ assistant.icon }}</span>
              <div class="item-content">
                <div class="item-name">{{ assistant.name }}</div>
                <div class="item-description">{{ assistant.description }}</div>
              </div>
              <div v-if="activeAssistant?.id === assistant.id" class="active-check">✓</div>
            </button>
          </div>

          <div v-if="filteredAssistants.size === 0" class="empty-state"> No assistants found </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAiCore } from '../composables/useAiCore';

interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  category: string;
  isBuiltIn: boolean;
}

const { assistants, activeAssistant, setActiveAssistant, assistantsByCategory } = useAiCore();

const isOpen = ref(false);
const searchQuery = ref('');
const selectorRef = ref<HTMLElement | null>(null);
const dropdownRef = ref<HTMLElement | null>(null);

const dropdownStyle = ref({
  position: 'fixed' as const,
  top: '0px',
  left: '0px',
  width: '320px',
  zIndex: '10000',
});

const filteredAssistants = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const filtered = new Map<string, Assistant[]>();

  for (const [category, items] of assistantsByCategory.value) {
    const matching = items.filter(
      (a) => a.name.toLowerCase().includes(query) || a.description.toLowerCase().includes(query),
    );
    if (matching.length > 0) {
      filtered.set(category, matching);
    }
  }

  return filtered;
});

function formatCategory(category: string): string {
  const labels: Record<string, string> = {
    general: 'General',
    coding: 'Coding',
    writing: 'Writing',
    research: 'Research',
    productivity: 'Productivity',
    browser: 'Browser',
    custom: 'Custom',
  };
  return labels[category] || category;
}

function selectAssistant(assistant: Assistant) {
  setActiveAssistant(assistant.id);
  isOpen.value = false;
  searchQuery.value = '';
}

function updateDropdownPosition() {
  if (!selectorRef.value || !isOpen.value) return;

  const rect = selectorRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: '320px',
    zIndex: '10000',
  };
}

watch(isOpen, (open) => {
  if (open) {
    updateDropdownPosition();
    searchQuery.value = '';
  }
});

// Close on escape
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
.assistant-selector {
  position: relative;
}

.selector-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--ac-surface-secondary, #f1f5f9);
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}

.selector-trigger:hover {
  background: var(--ac-surface-tertiary, #e2e8f0);
}

.assistant-icon {
  font-size: 16px;
}

.assistant-name {
  font-weight: 500;
  color: var(--ac-text-primary, #1e293b);
}

.chevron {
  width: 16px;
  height: 16px;
  color: var(--ac-text-secondary, #64748b);
  transition: transform 0.2s;
}

.chevron.open {
  transform: rotate(180deg);
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
  padding: 12px;
  border-bottom: 1px solid var(--ac-border, #e2e8f0);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--ac-surface-secondary, #f8fafc);
  border: 1px solid var(--ac-border, #e2e8f0);
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.search-input:focus {
  border-color: var(--ac-primary, #3b82f6);
}

.dropdown-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.category-group {
  margin-bottom: 12px;
}

.category-group:last-child {
  margin-bottom: 0;
}

.category-header {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--ac-text-tertiary, #94a3b8);
  padding: 4px 8px;
  letter-spacing: 0.5px;
}

.assistant-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.assistant-item:hover {
  background: var(--ac-surface-secondary, #f8fafc);
}

.assistant-item.active {
  background: var(--ac-primary-light, #eff6ff);
}

.item-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ac-text-primary, #1e293b);
  margin-bottom: 2px;
}

.item-description {
  font-size: 11px;
  color: var(--ac-text-secondary, #64748b);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.active-check {
  color: var(--ac-primary, #3b82f6);
  font-weight: 600;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: var(--ac-text-tertiary, #94a3b8);
  font-size: 13px;
}
</style>
