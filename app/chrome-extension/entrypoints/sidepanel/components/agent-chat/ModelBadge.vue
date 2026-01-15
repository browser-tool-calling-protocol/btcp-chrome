<template>
  <div class="model-badge" :class="{ clickable }" @click="handleClick">
    <span class="provider-icon">{{ providerIcon }}</span>
    <span class="model-name">{{ displayName }}</span>
    <div v-if="capabilities.length" class="capabilities">
      <span v-for="cap in displayCapabilities" :key="cap.key" class="cap-icon" :title="cap.label">
        {{ cap.icon }}
      </span>
    </div>
    <svg v-if="clickable" class="chevron" viewBox="0 0 20 20" fill="currentColor">
      <path
        fill-rule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clip-rule="evenodd"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelId?: string;
  modelName?: string;
  providerId?: string;
  capabilities?: string[];
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  capabilities: () => [],
  clickable: false,
});

const emit = defineEmits<{
  (e: 'click'): void;
}>();

const providerIcon = computed(() => {
  const icons: Record<string, string> = {
    openai: '🤖',
    anthropic: '🧠',
    google: '✨',
    ollama: '🦙',
  };
  return icons[props.providerId || ''] || '🔌';
});

const displayName = computed(() => {
  if (props.modelName) return props.modelName;
  if (!props.modelId) return 'No model';
  // Format model ID for display
  return props.modelId
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .substring(0, 20);
});

const displayCapabilities = computed(() => {
  const capMap: Record<string, { icon: string; label: string }> = {
    vision: { icon: '👁️', label: 'Vision' },
    function_calling: { icon: '🔧', label: 'Tool Use' },
    reasoning: { icon: '🧩', label: 'Reasoning' },
    streaming: { icon: '⚡', label: 'Streaming' },
  };

  return props.capabilities
    .filter((cap) => cap !== 'text') // Don't show text capability
    .map((cap) => ({
      key: cap,
      ...(capMap[cap] || { icon: '•', label: cap }),
    }));
});

function handleClick() {
  if (props.clickable) {
    emit('click');
  }
}
</script>

<style scoped>
.model-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--ac-surface-secondary, #f1f5f9);
  border-radius: 16px;
  font-size: 12px;
  color: var(--ac-text-secondary, #475569);
}

.model-badge.clickable {
  cursor: pointer;
  transition: all 0.15s;
}

.model-badge.clickable:hover {
  background: var(--ac-surface-tertiary, #e2e8f0);
}

.provider-icon {
  font-size: 14px;
}

.model-name {
  font-weight: 500;
  color: var(--ac-text-primary, #1e293b);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capabilities {
  display: flex;
  gap: 2px;
}

.cap-icon {
  font-size: 12px;
  opacity: 0.7;
}

.chevron {
  width: 14px;
  height: 14px;
  opacity: 0.5;
}
</style>
