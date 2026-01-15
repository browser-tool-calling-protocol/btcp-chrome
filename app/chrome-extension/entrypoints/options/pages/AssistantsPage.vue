<template>
  <div class="assistants-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Assistants</h1>
        <p class="page-description">Pre-configured AI personas for different tasks</p>
      </div>
      <button class="btn-primary" @click="showCreateModal = true">
        <span>+</span> Create Assistant
      </button>
    </header>

    <!-- Category Tabs -->
    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat.category"
        :class="['category-tab', { active: selectedCategory === cat.category }]"
        @click="selectedCategory = cat.category"
      >
        {{ formatCategory(cat.category) }}
        <span class="count">{{ cat.count }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading">Loading assistants...</div>

    <div v-else class="assistants-grid">
      <div
        v-for="assistant in filteredAssistants"
        :key="assistant.id"
        class="assistant-card"
        :class="{ active: activeAssistantId === assistant.id }"
        @click="selectAssistant(assistant)"
      >
        <div class="assistant-header">
          <span class="assistant-icon">{{ assistant.icon }}</span>
          <div v-if="activeAssistantId === assistant.id" class="active-indicator"></div>
        </div>
        <h3 class="assistant-name">{{ assistant.name }}</h3>
        <p class="assistant-description">{{ assistant.description }}</p>

        <div v-if="assistant.tools?.length" class="assistant-tools">
          <span class="tool-badge">{{ assistant.tools.length }} tools</span>
        </div>

        <div class="assistant-actions">
          <button
            v-if="!assistant.isBuiltIn"
            class="action-btn delete"
            @click.stop="handleDelete(assistant.id)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Create Assistant Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal">
        <header class="modal-header">
          <h2>Create Custom Assistant</h2>
          <button class="close-btn" @click="closeCreateModal">&times;</button>
        </header>
        <form @submit.prevent="handleCreate" class="modal-body">
          <div class="form-row">
            <div class="form-group icon-group">
              <label>Icon</label>
              <button type="button" class="icon-picker" @click="showIconPicker = !showIconPicker">
                {{ createForm.icon }}
              </button>
              <div v-if="showIconPicker" class="icon-dropdown">
                <button
                  v-for="icon in availableIcons"
                  :key="icon"
                  type="button"
                  @click="
                    createForm.icon = icon;
                    showIconPicker = false;
                  "
                >
                  {{ icon }}
                </button>
              </div>
            </div>
            <div class="form-group flex-1">
              <label>Name</label>
              <input v-model="createForm.name" required placeholder="My Assistant" />
            </div>
          </div>

          <div class="form-group">
            <label>Description</label>
            <input v-model="createForm.description" placeholder="What this assistant does" />
          </div>

          <div class="form-group">
            <label>Category</label>
            <select v-model="createForm.category">
              <option value="general">General</option>
              <option value="coding">Coding</option>
              <option value="writing">Writing</option>
              <option value="research">Research</option>
              <option value="productivity">Productivity</option>
              <option value="browser">Browser</option>
            </select>
          </div>

          <div class="form-group">
            <label>System Prompt</label>
            <textarea
              v-model="createForm.systemPrompt"
              required
              rows="6"
              placeholder="You are a helpful assistant that..."
            ></textarea>
          </div>

          <div class="form-group">
            <label>Temperature ({{ createForm.temperature }})</label>
            <input
              type="range"
              v-model.number="createForm.temperature"
              min="0"
              max="1"
              step="0.1"
            />
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" @click="closeCreateModal">Cancel</button>
            <button type="submit" class="btn-primary">Create Assistant</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  category: string;
  tools?: string[];
  temperature?: number;
  isBuiltIn: boolean;
}

interface Category {
  category: string;
  count: number;
}

const assistants = ref<Assistant[]>([]);
const categories = ref<Category[]>([]);
const loading = ref(true);
const selectedCategory = ref('');
const activeAssistantId = ref<string | null>(null);
const showCreateModal = ref(false);
const showIconPicker = ref(false);

const availableIcons = [
  '💬',
  '👨‍💻',
  '✍️',
  '🔬',
  '🌐',
  '📄',
  '📝',
  '📋',
  '🗂️',
  '📊',
  '🤖',
  '🎯',
  '💡',
  '🔧',
];

const createForm = ref({
  name: '',
  description: '',
  icon: '🤖',
  category: 'general',
  systemPrompt: '',
  temperature: 0.7,
});

const filteredAssistants = computed(() => {
  if (!selectedCategory.value) return assistants.value;
  return assistants.value.filter((a) => a.category === selectedCategory.value);
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
    '': 'All',
  };
  return labels[category] || category;
}

async function selectAssistant(assistant: Assistant) {
  try {
    await chrome.runtime.sendMessage({
      type: 'AI_SET_ACTIVE_ASSISTANT',
      payload: { assistantId: assistant.id },
    });
    activeAssistantId.value = assistant.id;
  } catch (error) {
    console.error('Failed to set active assistant:', error);
  }
}

async function handleCreate() {
  const now = Date.now();
  const assistant: Assistant = {
    id: `custom-${now}`,
    name: createForm.value.name,
    description: createForm.value.description,
    icon: createForm.value.icon,
    category: createForm.value.category,
    systemPrompt: createForm.value.systemPrompt,
    temperature: createForm.value.temperature,
    isBuiltIn: false,
  };

  try {
    await chrome.runtime.sendMessage({
      type: 'AI_CREATE_ASSISTANT',
      payload: { assistant },
    });
    await loadAssistants();
    closeCreateModal();
  } catch (error) {
    alert('Failed to create assistant: ' + (error as Error).message);
  }
}

async function handleDelete(assistantId: string) {
  if (!confirm('Are you sure you want to delete this assistant?')) return;

  try {
    await chrome.runtime.sendMessage({
      type: 'AI_DELETE_ASSISTANT',
      payload: { assistantId },
    });
    await loadAssistants();
  } catch (error) {
    alert('Failed to delete assistant: ' + (error as Error).message);
  }
}

function closeCreateModal() {
  showCreateModal.value = false;
  showIconPicker.value = false;
  createForm.value = {
    name: '',
    description: '',
    icon: '🤖',
    category: 'general',
    systemPrompt: '',
    temperature: 0.7,
  };
}

async function loadAssistants() {
  loading.value = true;
  try {
    const [assistantsRes, activeRes] = await Promise.all([
      chrome.runtime.sendMessage({ type: 'AI_LIST_ASSISTANTS' }),
      chrome.runtime.sendMessage({ type: 'AI_GET_ACTIVE_ASSISTANT' }),
    ]);

    if (assistantsRes.success) {
      assistants.value = assistantsRes.data;

      // Build category counts
      const counts = new Map<string, number>();
      for (const a of assistants.value) {
        counts.set(a.category, (counts.get(a.category) || 0) + 1);
      }
      categories.value = [
        { category: '', count: assistants.value.length },
        ...Array.from(counts.entries()).map(([category, count]) => ({ category, count })),
      ];
    }

    if (activeRes.success && activeRes.data) {
      activeAssistantId.value = activeRes.data.id;
    }
  } catch (error) {
    console.error('Failed to load assistants:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(loadAssistants);
</script>

<style scoped>
.assistants-page {
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
}

.btn-primary:hover {
  background: #2563eb;
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.category-tab:hover {
  background: #f8fafc;
}

.category-tab.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.category-tab .count {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 11px;
}

.category-tab.active .count {
  background: rgba(255, 255, 255, 0.2);
}

.loading {
  text-align: center;
  padding: 48px;
  color: #64748b;
}

.assistants-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.assistant-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.assistant-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.assistant-card.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.assistant-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.assistant-icon {
  font-size: 32px;
}

.active-indicator {
  width: 10px;
  height: 10px;
  background: #22c55e;
  border-radius: 50%;
}

.assistant-name {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.assistant-description {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 12px;
  line-height: 1.4;
}

.assistant-tools {
  margin-bottom: 12px;
}

.tool-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #f1f5f9;
  color: #475569;
  font-size: 11px;
  border-radius: 4px;
}

.assistant-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}

.assistant-card:hover .assistant-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px 10px;
  font-size: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.action-btn.delete {
  background: #fee2e2;
  color: #dc2626;
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
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
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
}

.modal-body {
  padding: 24px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group.flex-1 {
  flex: 1;
}

.form-group.icon-group {
  position: relative;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.icon-picker {
  width: 50px;
  height: 42px;
  font-size: 24px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
}

.icon-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.icon-dropdown button {
  width: 32px;
  height: 32px;
  font-size: 18px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
}

.icon-dropdown button:hover {
  background: #f1f5f9;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
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
</style>
