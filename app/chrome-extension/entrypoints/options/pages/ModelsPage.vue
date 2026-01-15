<template>
  <div class="models-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Models</h1>
        <p class="page-description"
          >View and manage available AI models from your enabled providers</p
        >
      </div>
    </header>

    <!-- Provider Filter -->
    <div class="filter-bar">
      <select v-model="selectedProvider" class="filter-select">
        <option value="">All Providers</option>
        <option v-for="provider in enabledProviders" :key="provider.id" :value="provider.id">
          {{ provider.name }}
        </option>
      </select>

      <select v-model="capabilityFilter" class="filter-select">
        <option value="">All Capabilities</option>
        <option value="vision">Vision</option>
        <option value="function_calling">Function Calling</option>
        <option value="reasoning">Reasoning</option>
        <option value="streaming">Streaming</option>
      </select>
    </div>

    <div v-if="loading" class="loading">Loading models...</div>

    <div v-else-if="filteredModels.length === 0" class="empty-state">
      <p v-if="enabledProviders.length === 0">
        No providers enabled. Go to AI Providers to enable a provider first.
      </p>
      <p v-else>No models match your filters.</p>
    </div>

    <div v-else class="models-list">
      <div
        v-for="model in filteredModels"
        :key="model.id"
        class="model-card"
        :class="{ active: activeModelId === model.id }"
        @click="selectModel(model)"
      >
        <div class="model-header">
          <div class="model-info">
            <h3 class="model-name">{{ model.name }}</h3>
            <span class="model-provider">{{ getProviderName(model.providerId) }}</span>
          </div>
          <div v-if="activeModelId === model.id" class="active-badge">Active</div>
        </div>

        <p v-if="model.description" class="model-description">{{ model.description }}</p>

        <div class="model-meta">
          <div class="capabilities">
            <span
              v-for="cap in model.capabilities"
              :key="cap"
              class="capability-badge"
              :class="cap"
            >
              {{ formatCapability(cap) }}
            </span>
          </div>

          <div class="model-stats">
            <span class="stat">
              <strong>{{ formatNumber(model.contextLength) }}</strong> context
            </span>
            <span v-if="model.pricing" class="stat">
              ${{ model.pricing.input }}/${{ model.pricing.output }} per 1M
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: string[];
  contextLength: number;
  pricing?: { input: number; output: number };
  description?: string;
}

interface Provider {
  id: string;
  name: string;
  enabled: boolean;
}

const models = ref<Model[]>([]);
const providers = ref<Provider[]>([]);
const loading = ref(true);
const selectedProvider = ref('');
const capabilityFilter = ref('');
const activeModelId = ref<string | null>(null);
const activeProviderId = ref<string | null>(null);

const enabledProviders = computed(() => providers.value.filter((p) => p.enabled));

const filteredModels = computed(() => {
  let result = models.value;

  if (selectedProvider.value) {
    result = result.filter((m) => m.providerId === selectedProvider.value);
  }

  if (capabilityFilter.value) {
    result = result.filter((m) => m.capabilities.includes(capabilityFilter.value));
  }

  return result;
});

function getProviderName(providerId: string): string {
  const provider = providers.value.find((p) => p.id === providerId);
  return provider?.name || providerId;
}

function formatCapability(cap: string): string {
  const labels: Record<string, string> = {
    text: 'Text',
    vision: '👁️ Vision',
    function_calling: '🔧 Tools',
    streaming: '⚡ Stream',
    reasoning: '🧠 Reason',
  };
  return labels[cap] || cap;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return String(num);
}

async function selectModel(model: Model) {
  try {
    await chrome.runtime.sendMessage({
      type: 'AI_SET_ACTIVE_MODEL',
      payload: {
        providerId: model.providerId,
        modelId: model.id,
      },
    });
    activeModelId.value = model.id;
    activeProviderId.value = model.providerId;
  } catch (error) {
    console.error('Failed to set active model:', error);
  }
}

async function loadData() {
  loading.value = true;
  try {
    const [providersRes, modelsRes, activeRes] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'AI_LIST_PROVIDERS' }),
      chrome.runtime.sendMessage({ type: 'AI_LIST_MODELS' }),
      chrome.runtime.sendMessage({ type: 'AI_GET_ACTIVE_MODEL' }),
    ]);

    if (providersRes.success) providers.value = providersRes.data;
    if (modelsRes.success) models.value = modelsRes.data;
    if (activeRes.success && activeRes.data) {
      activeModelId.value = activeRes.data.model?.id || null;
      activeProviderId.value = activeRes.data.provider?.id || null;
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped>
.models-page {
  max-width: 1200px;
}

.page-header {
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

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.filter-select {
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: #3b82f6;
}

.loading,
.empty-state {
  text-align: center;
  padding: 48px;
  color: #64748b;
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
}

.model-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.model-card.active {
  border-color: #3b82f6;
  background: #f8fafc;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 2px 0;
}

.model-provider {
  font-size: 12px;
  color: #64748b;
}

.active-badge {
  padding: 4px 10px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 500;
  border-radius: 12px;
}

.model-description {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
}

.model-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.capabilities {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.capability-badge {
  padding: 3px 8px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  border-radius: 4px;
}

.capability-badge.vision {
  background: #dcfce7;
  color: #166534;
}

.capability-badge.function_calling {
  background: #fef3c7;
  color: #92400e;
}

.capability-badge.reasoning {
  background: #ede9fe;
  color: #6d28d9;
}

.capability-badge.streaming {
  background: #dbeafe;
  color: #1d4ed8;
}

.model-stats {
  display: flex;
  gap: 16px;
}

.stat {
  font-size: 12px;
  color: #64748b;
}

.stat strong {
  color: #334155;
}
</style>
