<template>
  <div class="providers-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">AI Providers</h1>
        <p class="page-description">Configure API keys and enable providers to use AI models</p>
      </div>
      <button class="btn-primary" @click="showAddCustom = true">
        <span>+</span> Add Custom Provider
      </button>
    </header>

    <div v-if="loading" class="loading">Loading providers...</div>

    <div v-else class="providers-grid">
      <ProviderCard
        v-for="provider in providers"
        :key="provider.id"
        :provider="provider"
        :testing="testingProvider === provider.id"
        @update="handleUpdateProvider"
        @test="handleTestProvider"
      />
    </div>

    <!-- Add Custom Provider Modal -->
    <div v-if="showAddCustom" class="modal-overlay" @click.self="showAddCustom = false">
      <div class="modal">
        <header class="modal-header">
          <h2>Add Custom Provider</h2>
          <button class="close-btn" @click="showAddCustom = false">&times;</button>
        </header>
        <form @submit.prevent="handleAddCustomProvider" class="modal-body">
          <div class="form-group">
            <label>Provider Name</label>
            <input v-model="customProviderForm.name" required placeholder="e.g., Together AI" />
          </div>
          <div class="form-group">
            <label>Base URL</label>
            <input
              v-model="customProviderForm.baseUrl"
              required
              placeholder="https://api.together.xyz/v1"
            />
            <span class="hint">OpenAI-compatible API endpoint</span>
          </div>
          <div class="form-group">
            <label>API Key</label>
            <input v-model="customProviderForm.apiKey" type="password" placeholder="Your API key" />
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="showAddCustom = false">
              Cancel
            </button>
            <button type="submit" class="btn-primary">Add Provider</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
const testingProvider = ref<string | null>(null);

const customProviderForm = ref({
  name: '',
  baseUrl: '',
  apiKey: '',
});

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
      alert('Connection successful!');
    } else {
      alert('Connection failed. Please check your API key and settings.');
    }
  } catch (error) {
    alert('Connection test failed: ' + (error as Error).message);
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
  } catch (error) {
    alert('Failed to add provider: ' + (error as Error).message);
  }
}

onMounted(loadProviders);
</script>

<style scoped>
.providers-page {
  max-width: 1200px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.page-description {
  color: #64748b;
  font-size: 14px;
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #64748b;
}

/* Buttons */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-secondary {
  padding: 10px 16px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.hint {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
