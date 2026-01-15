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
      <label class="toggle" :class="{ disabled: !canEnable }">
        <input
          type="checkbox"
          :checked="provider.enabled"
          @change="toggleEnabled"
          :disabled="!canEnable"
          :aria-label="`Enable ${provider.name}`"
        />
        <span class="toggle-track">
          <span class="toggle-thumb"></span>
        </span>
      </label>
    </div>

    <div class="card-body">
      <div class="form-group">
        <label :for="`api-key-${provider.id}`">API Key</label>
        <div class="input-group">
          <input
            :id="`api-key-${provider.id}`"
            :type="showApiKey ? 'text' : 'password'"
            :value="localApiKey"
            @input="localApiKey = ($event.target as HTMLInputElement).value"
            @blur="saveApiKey"
            placeholder="Enter your API key"
            class="input"
            autocomplete="off"
          />
          <button
            class="input-addon-btn"
            @click="showApiKey = !showApiKey"
            :aria-label="showApiKey ? 'Hide API key' : 'Show API key'"
            type="button"
          >
            <svg v-if="showApiKey" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
              />
              <path
                d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"
              />
            </svg>
            <svg v-else viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path
                fill-rule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <div v-if="provider.type === 'local' || provider.type === 'custom'" class="form-group">
        <label :for="`base-url-${provider.id}`">Base URL</label>
        <input
          :id="`base-url-${provider.id}`"
          type="text"
          :value="localBaseUrl"
          @input="localBaseUrl = ($event.target as HTMLInputElement).value"
          @blur="saveBaseUrl"
          placeholder="API endpoint URL"
          class="input"
        />
      </div>

      <div class="card-actions">
        <button
          class="btn-test"
          @click="$emit('test', provider.id)"
          :disabled="testing || !canTest"
        >
          <svg v-if="testing" class="spinner" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-dasharray="32"
              stroke-dashoffset="12"
            />
          </svg>
          <svg v-else viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fill-rule="evenodd"
              d="M5.05 3.636a1 1 0 010 1.414 7 7 0 000 9.9 1 1 0 11-1.414 1.414 9 9 0 010-12.728 1 1 0 011.414 0zm9.9 0a1 1 0 011.414 0 9 9 0 010 12.728 1 1 0 11-1.414-1.414 7 7 0 000-9.9 1 1 0 010-1.414zM7.879 6.464a1 1 0 010 1.414 3 3 0 000 4.243 1 1 0 11-1.415 1.414 5 5 0 010-7.07 1 1 0 011.415 0zm4.242 0a1 1 0 011.415 0 5 5 0 010 7.072 1 1 0 01-1.415-1.415 3 3 0 000-4.242 1 1 0 010-1.415zM10 9a1 1 0 011 1v.01a1 1 0 11-2 0V10a1 1 0 011-1z"
              clip-rule="evenodd"
            />
          </svg>
          {{ testing ? 'Testing...' : 'Test Connection' }}
        </button>
      </div>
    </div>

    <Transition name="warning">
      <div v-if="!canEnable" class="warning">
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
        <span>Add an API key to enable this provider</span>
      </div>
    </Transition>
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
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: var(--transition-all);
}

.provider-card:hover {
  box-shadow: var(--shadow-sm);
}

.provider-card.enabled {
  border-color: var(--interactive-primary);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.15);
}

.provider-card.testing {
  opacity: 0.7;
  pointer-events: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-default);
  background: var(--bg-surface-secondary);
}

.provider-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.provider-icon {
  font-size: 32px;
  line-height: 1;
}

.provider-name {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-1) 0;
}

.provider-type {
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Toggle Switch */
.toggle {
  position: relative;
  display: inline-flex;
  cursor: pointer;
}

.toggle.disabled {
  cursor: not-allowed;
}

.toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  position: relative;
  width: 48px;
  height: 26px;
  background: var(--color-neutral-300);
  border-radius: var(--radius-full);
  transition: var(--transition-normal);
}

.toggle-thumb {
  position: absolute;
  width: 20px;
  height: 20px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: var(--transition-normal);
  box-shadow: var(--shadow-sm);
}

.toggle input:checked + .toggle-track {
  background: var(--interactive-primary);
}

.toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(22px);
}

.toggle input:focus-visible + .toggle-track {
  box-shadow: var(--focus-ring);
}

.toggle input:disabled + .toggle-track {
  opacity: 0.5;
}

/* Card Body */
.card-body {
  padding: var(--space-4);
}

.form-group {
  margin-bottom: var(--space-3);
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  transition: var(--transition-all);
}

.input::placeholder {
  color: var(--text-tertiary);
}

.input:hover {
  border-color: var(--border-hover);
}

.input:focus {
  outline: none;
  border-color: var(--border-focus);
  box-shadow: var(--focus-ring);
}

.input-group {
  display: flex;
  gap: var(--space-2);
}

.input-group .input {
  flex: 1;
}

.input-addon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  flex-shrink: 0;
  background: var(--bg-surface-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: var(--transition-all);
}

.input-addon-btn:hover {
  background: var(--bg-surface-tertiary);
  color: var(--text-secondary);
  border-color: var(--border-hover);
}

.input-addon-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.input-addon-btn svg {
  width: 18px;
  height: 18px;
}

.card-actions {
  margin-top: var(--space-4);
}

.btn-test {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-4);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition-all);
}

.btn-test svg {
  width: 16px;
  height: 16px;
}

.btn-test .spinner {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-test:hover:not(:disabled) {
  background: var(--bg-surface-secondary);
  border-color: var(--border-hover);
  color: var(--text-primary);
}

.btn-test:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Warning */
.warning {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-warning-50);
  color: var(--color-warning-600);
  font-size: var(--text-xs);
  border-top: 1px solid var(--color-warning-100);
}

.warning svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.warning-enter-active,
.warning-leave-active {
  transition: all 200ms ease;
}

.warning-enter-from,
.warning-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
