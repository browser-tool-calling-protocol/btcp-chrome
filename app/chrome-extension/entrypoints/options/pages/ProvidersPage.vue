<template>
  <div class="providers-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">AI Providers</h1>
        <p class="page-description">Configure API keys and enable providers to use AI models</p>
      </div>
      <button class="btn btn-primary" @click="showAddCustom = true">
        <svg class="btn-icon-svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
          />
        </svg>
        Add Custom Provider
      </button>
    </header>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="skeleton-grid">
        <div v-for="i in 4" :key="i" class="skeleton-card">
          <div class="skeleton skeleton-header"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line short"></div>
        </div>
      </div>
    </div>

    <!-- Providers Grid -->
    <TransitionGroup v-else name="card" tag="div" class="providers-grid">
      <ProviderCard
        v-for="provider in providers"
        :key="provider.id"
        :provider="provider"
        :testing="testingProvider === provider.id"
        @update="handleUpdateProvider"
        @test="handleTestProvider"
      />
    </TransitionGroup>

    <!-- Add Custom Provider Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showAddCustom"
          class="modal-overlay"
          @click.self="showAddCustom = false"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div class="modal" ref="modalRef">
            <header class="modal-header">
              <h2 id="modal-title">Add Custom Provider</h2>
              <button class="close-btn" @click="showAddCustom = false" aria-label="Close dialog">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
            </header>
            <form @submit.prevent="handleAddCustomProvider" class="modal-body">
              <div class="form-group">
                <label for="provider-name">Provider Name</label>
                <input
                  id="provider-name"
                  v-model="customProviderForm.name"
                  required
                  placeholder="e.g., Together AI"
                  class="input"
                />
              </div>
              <div class="form-group">
                <label for="provider-url">Base URL</label>
                <input
                  id="provider-url"
                  v-model="customProviderForm.baseUrl"
                  required
                  placeholder="https://api.together.xyz/v1"
                  class="input"
                />
                <span class="hint">OpenAI-compatible API endpoint</span>
              </div>
              <div class="form-group">
                <label for="provider-key">API Key</label>
                <div class="input-with-icon">
                  <input
                    id="provider-key"
                    v-model="customProviderForm.apiKey"
                    :type="showApiKey ? 'text' : 'password'"
                    placeholder="Your API key"
                    class="input"
                  />
                  <button
                    type="button"
                    class="input-icon-btn"
                    @click="showApiKey = !showApiKey"
                    :aria-label="showApiKey ? 'Hide API key' : 'Show API key'"
                  >
                    <svg v-if="showApiKey" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                      />
                      <path
                        d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z"
                      />
                    </svg>
                    <svg v-else viewBox="0 0 20 20" fill="currentColor">
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
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" @click="showAddCustom = false">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary">Add Provider</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast notifications -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.show" :class="['toast', toast.type]">
          <span class="toast-icon">{{ toast.type === 'success' ? '✓' : '✗' }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import ProviderCard from '../components/ProviderCard.vue';

interface Provider {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'custom';
  baseUrl: string;
  apiKey?: string;
  enabled: boolean;
  icon?: string;
}

const providers = ref<Provider[]>([]);
const loading = ref(true);
const showAddCustom = ref(false);
const showApiKey = ref(false);
const testingProvider = ref<string | null>(null);
const modalRef = ref<HTMLElement | null>(null);

const customProviderForm = ref({
  name: '',
  baseUrl: '',
  apiKey: '',
});

const toast = ref({
  show: false,
  message: '',
  type: 'success' as 'success' | 'error',
});

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 3000);
}

async function loadProviders() {
  loading.value = true;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'AI_LIST_PROVIDERS',
    });
    if (response.success) {
      providers.value = response.data;
    }
  } catch (error) {
    console.error('Failed to load providers:', error);
  } finally {
    loading.value = false;
  }
}

async function handleUpdateProvider(provider: Provider) {
  try {
    await chrome.runtime.sendMessage({
      type: 'AI_UPDATE_PROVIDER',
      payload: {
        providerId: provider.id,
        updates: provider,
      },
    });
    await loadProviders();
  } catch (error) {
    console.error('Failed to update provider:', error);
    showToast('Failed to update provider', 'error');
  }
}

async function handleTestProvider(providerId: string) {
  testingProvider.value = providerId;
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'AI_TEST_PROVIDER',
      payload: { providerId },
    });
    if (response.success && response.data) {
      showToast('Connection successful!', 'success');
    } else {
      showToast('Connection failed. Check your API key.', 'error');
    }
  } catch (error) {
    showToast('Connection test failed', 'error');
  } finally {
    testingProvider.value = null;
  }
}

async function handleAddCustomProvider() {
  const id = `custom-${Date.now()}`;
  const newProvider: Provider = {
    id,
    name: customProviderForm.value.name,
    type: 'custom',
    baseUrl: customProviderForm.value.baseUrl,
    apiKey: customProviderForm.value.apiKey,
    enabled: false,
    icon: '🔧',
  };

  try {
    await chrome.runtime.sendMessage({
      type: 'AI_UPDATE_PROVIDER',
      payload: {
        providerId: id,
        updates: newProvider,
      },
    });
    await loadProviders();
    showAddCustom.value = false;
    customProviderForm.value = { name: '', baseUrl: '', apiKey: '' };
    showToast('Provider added successfully!', 'success');
  } catch (error) {
    showToast('Failed to add provider', 'error');
  }
}

// Focus trap for modal
watch(showAddCustom, async (open) => {
  if (open) {
    await nextTick();
    const firstInput = modalRef.value?.querySelector('input');
    firstInput?.focus();
  }
});

// Handle escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showAddCustom.value) {
    showAddCustom.value = false;
  }
}

onMounted(() => {
  loadProviders();
  document.addEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.providers-page {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-6);
  gap: var(--space-4);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.page-description {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-4);
}

/* Loading skeleton */
.loading-state {
  animation: fade-in 200ms ease;
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-4);
}

.skeleton-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-surface-secondary) 25%,
    var(--bg-surface-tertiary) 50%,
    var(--bg-surface-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-md);
}

.skeleton-header {
  height: 24px;
  width: 60%;
  margin-bottom: var(--space-4);
}

.skeleton-line {
  height: 16px;
  width: 100%;
  margin-bottom: var(--space-2);
}

.skeleton-line.short {
  width: 40%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Card animations */
.card-enter-active,
.card-leave-active {
  transition: all 200ms ease;
}

.card-enter-from,
.card-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.card-move {
  transition: transform 200ms ease;
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  line-height: var(--leading-tight);
  border-radius: var(--radius-lg);
  border: none;
  cursor: pointer;
  transition: var(--transition-all);
  white-space: nowrap;
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn-primary {
  background: var(--interactive-primary);
  color: var(--text-inverse);
}

.btn-primary:hover {
  background: var(--interactive-primary-hover);
}

.btn-primary:active {
  background: var(--interactive-primary-active);
  transform: scale(0.98);
}

.btn-secondary {
  background: var(--interactive-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover {
  background: var(--interactive-secondary-hover);
  border-color: var(--border-hover);
}

.btn-icon-svg {
  width: 16px;
  height: 16px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-4);
}

.modal {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-2xl);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-default);
}

.modal-header h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: var(--transition-all);
}

.close-btn:hover {
  background: var(--bg-surface-secondary);
  color: var(--text-primary);
}

.close-btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  padding: var(--space-6);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 200ms ease;
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition:
    transform 200ms ease,
    opacity 200ms ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal {
  transform: scale(0.95);
  opacity: 0;
}

.modal-leave-to .modal {
  transform: scale(0.95);
  opacity: 0;
}

/* Form */
.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
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

.input-with-icon {
  position: relative;
}

.input-with-icon .input {
  padding-right: 44px;
}

.input-icon-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: var(--transition-all);
}

.input-icon-btn:hover {
  background: var(--bg-surface-secondary);
  color: var(--text-secondary);
}

.input-icon-btn svg {
  width: 18px;
  height: 18px;
}

.hint {
  display: block;
  font-size: var(--text-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-1);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

/* Toast */
.toast {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-toast);
}

.toast.success {
  border-color: var(--color-success-500);
}

.toast.success .toast-icon {
  color: var(--color-success-500);
}

.toast.error {
  border-color: var(--color-error-500);
}

.toast.error .toast-icon {
  color: var(--color-error-500);
}

.toast-icon {
  font-weight: var(--font-bold);
}

.toast-message {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 200ms ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(16px);
}
</style>
