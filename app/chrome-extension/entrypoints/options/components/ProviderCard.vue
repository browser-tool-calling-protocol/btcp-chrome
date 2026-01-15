<template>
  <div class="provider-card" :class="{ enabled: provider.enabled, testing }">
    <div class="card-header">
      <div class="provider-info">
        <span class="provider-icon">{{ provider.icon || getDefaultIcon(provider.id) }}</span>
        <div>
          <h3 class="provider-name">{{ provider.name }}</h3>
          <span class="provider-type">{{ formatType(provider.type) }}</span>
        </div>
      </div>
      <label class="toggle">
        <input
          type="checkbox"
          :checked="provider.enabled"
          @change="toggleEnabled"
          :disabled="!canEnable"
        />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="card-body">
      <div class="form-group">
        <label>API Key</label>
        <div class="api-key-input">
          <input
            :type="showApiKey ? 'text' : 'password'"
            :value="localApiKey"
            @input="localApiKey = ($event.target as HTMLInputElement).value"
            @blur="saveApiKey"
            placeholder="Enter your API key"
          />
          <button class="visibility-btn" @click="showApiKey = !showApiKey">
            {{ showApiKey ? '👁️' : '👁️‍🗨️' }}
          </button>
        </div>
      </div>

      <div v-if="provider.type === 'local' || provider.type === 'custom'" class="form-group">
        <label>Base URL</label>
        <input
          type="text"
          :value="localBaseUrl"
          @input="localBaseUrl = ($event.target as HTMLInputElement).value"
          @blur="saveBaseUrl"
          placeholder="API endpoint URL"
        />
      </div>

      <div class="card-actions">
        <button
          class="btn-test"
          @click="$emit('test', provider.id)"
          :disabled="testing || !canTest"
        >
          {{ testing ? 'Testing...' : 'Test Connection' }}
        </button>
      </div>
    </div>

    <div v-if="!canEnable" class="warning"> Add an API key to enable this provider </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface Provider {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'custom';
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  icon?: string;
}

const props = defineProps<{
  provider: Provider;
  testing?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update', provider: Provider): void;
  (e: 'test', providerId: string): void;
}>();

const showApiKey = ref(false);
const localApiKey = ref(props.provider.apiKey || '');
const localBaseUrl = ref(props.provider.baseUrl);

// Watch for external changes
watch(
  () => props.provider.apiKey,
  (val) => {
    localApiKey.value = val || '';
  },
);

watch(
  () => props.provider.baseUrl,
  (val) => {
    localBaseUrl.value = val;
  },
);

const canEnable = computed(() => {
  // Local providers don't need API keys
  if (props.provider.type === 'local') return true;
  // Others need API keys
  return !!localApiKey.value;
});

const canTest = computed(() => {
  // Local providers can test without keys
  if (props.provider.type === 'local') return true;
  return !!localApiKey.value;
});

function getDefaultIcon(providerId: string): string {
  const icons: Record<string, string> = {
    openai: '🤖',
    anthropic: '🧠',
    google: '✨',
    ollama: '🦙',
  };
  return icons[providerId] || '🔌';
}

function formatType(type: string): string {
  const labels: Record<string, string> = {
    cloud: 'Cloud API',
    local: 'Local',
    custom: 'Custom',
  };
  return labels[type] || type;
}

function toggleEnabled() {
  emit('update', {
    ...props.provider,
    enabled: !props.provider.enabled,
    apiKey: localApiKey.value,
    baseUrl: localBaseUrl.value,
  });
}

function saveApiKey() {
  if (localApiKey.value !== props.provider.apiKey) {
    emit('update', {
      ...props.provider,
      apiKey: localApiKey.value,
    });
  }
}

function saveBaseUrl() {
  if (localBaseUrl.value !== props.provider.baseUrl) {
    emit('update', {
      ...props.provider,
      baseUrl: localBaseUrl.value,
    });
  }
}
</script>

<style scoped>
.provider-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.provider-card.enabled {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.2);
}

.provider-card.testing {
  opacity: 0.7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.provider-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-icon {
  font-size: 28px;
}

.provider-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.provider-type {
  font-size: 12px;
  color: #64748b;
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

.toggle input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Card Body */
.card-body {
  padding: 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 4px;
}

.form-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
}

.api-key-input {
  display: flex;
  gap: 8px;
}

.api-key-input input {
  flex: 1;
}

.visibility-btn {
  padding: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.visibility-btn:hover {
  background: #e2e8f0;
}

.card-actions {
  margin-top: 16px;
}

.btn-test {
  width: 100%;
  padding: 8px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-test:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.warning {
  padding: 12px 16px;
  background: #fef3c7;
  color: #92400e;
  font-size: 12px;
  border-top: 1px solid #fcd34d;
}
</style>
