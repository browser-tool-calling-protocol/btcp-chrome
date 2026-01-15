<template>
  <div class="userscripts-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">Userscripts</h1>
        <p class="page-description">Manage custom JavaScript and CSS injections</p>
      </div>
      <div class="header-actions">
        <label class="emergency-toggle">
          <input type="checkbox" v-model="emergencyDisabled" @change="saveEmergency" />
          <span>Emergency Disable All</span>
        </label>
      </div>
    </header>

    <!-- Create Section -->
    <section class="create-section">
      <h2 class="section-title">Create Userscript</h2>

      <div class="form-grid">
        <div class="form-group">
          <label>Name</label>
          <input v-model="form.name" placeholder="Optional name" />
        </div>
        <div class="form-group">
          <label>Run At</label>
          <select v-model="form.runAt">
            <option value="auto">Auto</option>
            <option value="document_start">Document Start</option>
            <option value="document_end">Document End</option>
            <option value="document_idle">Document Idle</option>
          </select>
        </div>
        <div class="form-group">
          <label>World</label>
          <select v-model="form.world">
            <option value="auto">Auto</option>
            <option value="ISOLATED">Isolated</option>
            <option value="MAIN">Main</option>
          </select>
        </div>
        <div class="form-group">
          <label>Mode</label>
          <select v-model="form.mode">
            <option value="auto">Auto</option>
            <option value="persistent">Persistent</option>
            <option value="css">CSS</option>
            <option value="once">Once</option>
          </select>
        </div>
      </div>

      <div class="checkbox-group">
        <label><input type="checkbox" v-model="form.allFrames" /> All Frames</label>
        <label><input type="checkbox" v-model="form.persist" /> Persist</label>
        <label><input type="checkbox" v-model="form.dnrFallback" /> DNR Fallback</label>
      </div>

      <div class="form-group">
        <label>URL Matches</label>
        <input v-model="form.matches" placeholder="*://*.example.com/*" />
      </div>

      <div class="form-group">
        <label>Excludes</label>
        <input v-model="form.excludes" placeholder="Optional exclusions" />
      </div>

      <div class="form-group">
        <label>Tags</label>
        <input v-model="form.tags" placeholder="Optional tags" />
      </div>

      <div class="form-group">
        <label>Script</label>
        <textarea v-model="form.script" placeholder="// Your code here" rows="8"></textarea>
      </div>

      <div class="form-actions">
        <button :disabled="submitting" class="btn-primary" @click="apply('auto')">
          Apply Script
        </button>
        <button :disabled="submitting" class="btn-secondary" @click="apply('once')">
          Run Once
        </button>
        <span v-if="lastResult" class="result-hint">{{ lastResult }}</span>
      </div>
    </section>

    <!-- List Section -->
    <section class="list-section">
      <div class="section-header">
        <h2 class="section-title">Saved Userscripts</h2>
        <button class="btn-secondary" @click="exportAll">Export All</button>
      </div>

      <div class="filter-bar">
        <input v-model="filters.query" @input="reload()" placeholder="Search..." />
        <select v-model="filters.status" @change="reload()">
          <option value="">All Status</option>
          <option value="enabled">Enabled</option>
          <option value="disabled">Disabled</option>
        </select>
        <input v-model="filters.domain" @input="reload()" placeholder="Filter by domain" />
      </div>

      <div class="scripts-table">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>World</th>
              <th>Run At</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="name-cell">{{ item.name || item.id }}</td>
              <td>
                <label class="status-toggle">
                  <input
                    type="checkbox"
                    :checked="item.status === 'enabled'"
                    @change="toggle(item)"
                  />
                  <span>{{ item.status }}</span>
                </label>
              </td>
              <td>{{ item.world }}</td>
              <td>{{ item.runAt }}</td>
              <td>{{ formatTime(item.updatedAt) }}</td>
              <td class="actions-cell">
                <button class="delete-btn" @click="remove(item)">Delete</button>
              </td>
            </tr>
            <tr v-if="items.length === 0">
              <td colspan="6" class="empty-row">No userscripts found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { TOOL_NAMES } from 'chrome-mcp-shared';
import { STORAGE_KEYS } from '@/common/constants';

interface ListItem {
  id: string;
  name?: string;
  status: 'enabled' | 'disabled';
  world: 'ISOLATED' | 'MAIN';
  runAt: 'document_start' | 'document_end' | 'document_idle';
  updatedAt: number;
}

const emergencyDisabled = ref(false);
const items = ref<ListItem[]>([]);
const filters = ref({ query: '', status: '', domain: '' });

const form = ref({
  name: '',
  runAt: 'auto',
  world: 'auto',
  mode: 'auto',
  allFrames: true,
  persist: true,
  dnrFallback: true,
  script: '',
  matches: '',
  excludes: '',
  tags: '',
});

const submitting = ref(false);
const lastResult = ref('');

function formatTime(ts?: number) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

async function saveEmergency() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.USERSCRIPTS_DISABLED]: emergencyDisabled.value,
  });
}

async function loadEmergency() {
  const v = await chrome.storage.local.get([STORAGE_KEYS.USERSCRIPTS_DISABLED]);
  emergencyDisabled.value = !!(v as Record<string, boolean>)[STORAGE_KEYS.USERSCRIPTS_DISABLED];
}

async function callTool(name: string, args: Record<string, unknown>) {
  const res = await chrome.runtime.sendMessage({
    type: 'call_tool',
    name,
    args,
  });
  if (!res || !res.success) throw new Error(res?.error || 'call failed');
  return res.result;
}

async function reload() {
  const result = await callTool(TOOL_NAMES.BROWSER.USERSCRIPT, {
    action: 'list',
    args: { ...filters.value },
  });
  try {
    const txt = (result?.content?.[0]?.text as string) || '{}';
    const data = JSON.parse(txt);
    items.value = data.items || [];
  } catch (e) {
    console.warn('parse list failed', e);
  }
}

async function apply(mode: 'auto' | 'once') {
  if (!form.value.script.trim()) return;
  submitting.value = true;
  lastResult.value = '';
  try {
    const args: Record<string, unknown> = {
      script: form.value.script,
      name: form.value.name || undefined,
      runAt: form.value.runAt,
      world: form.value.world,
      allFrames: !!form.value.allFrames,
      persist: !!form.value.persist,
      dnrFallback: !!form.value.dnrFallback,
      mode,
    };
    if (form.value.matches.trim())
      args.matches = form.value.matches.split(',').map((s) => s.trim());
    if (form.value.excludes.trim())
      args.excludes = form.value.excludes.split(',').map((s) => s.trim());
    if (form.value.tags.trim()) args.tags = form.value.tags.split(',').map((s) => s.trim());

    const result = await callTool(TOOL_NAMES.BROWSER.USERSCRIPT, { action: 'create', args });
    lastResult.value = (result?.content?.[0]?.text as string) || '';
    await reload();
  } catch (e: unknown) {
    lastResult.value = 'Error: ' + ((e as Error)?.message || String(e));
  } finally {
    submitting.value = false;
  }
}

async function toggle(item: ListItem) {
  try {
    await callTool(TOOL_NAMES.BROWSER.USERSCRIPT, {
      action: item.status === 'enabled' ? 'disable' : 'enable',
      args: { id: item.id },
    });
    await reload();
  } catch (e) {
    console.warn('toggle failed', e);
  }
}

async function remove(item: ListItem) {
  if (!confirm('Are you sure you want to delete this userscript?')) return;
  try {
    await callTool(TOOL_NAMES.BROWSER.USERSCRIPT, { action: 'remove', args: { id: item.id } });
    await reload();
  } catch (e) {
    console.warn('remove failed', e);
  }
}

async function exportAll() {
  try {
    const res = await callTool(TOOL_NAMES.BROWSER.USERSCRIPT, { action: 'export', args: {} });
    const txt = (res?.content?.[0]?.text as string) || '{}';
    const blob = new Blob([txt], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'userscripts-export.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.warn('export failed', e);
  }
}

onMounted(async () => {
  await loadEmergency();
  await reload();
});
</script>

<style scoped>
.userscripts-page {
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

.emergency-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 13px;
  color: #dc2626;
  cursor: pointer;
}

.emergency-toggle input {
  margin: 0;
}

/* Sections */
.create-section,
.list-section {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.section-header .section-title {
  margin: 0;
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 12px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-group textarea {
  font-family: 'Monaco', 'Menlo', monospace;
  resize: vertical;
}

.checkbox-group {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.btn-primary {
  padding: 10px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 16px;
  background: #f1f5f9;
  color: #475569;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #e2e8f0;
}

.result-hint {
  font-size: 13px;
  color: #64748b;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-bar input,
.filter-bar select {
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
}

.filter-bar input {
  flex: 1;
}

/* Table */
.scripts-table {
  overflow-x: auto;
}

.scripts-table table {
  width: 100%;
  border-collapse: collapse;
}

.scripts-table th,
.scripts-table td {
  padding: 12px;
  text-align: left;
  font-size: 13px;
  border-bottom: 1px solid #f1f5f9;
}

.scripts-table th {
  font-weight: 500;
  color: #64748b;
  background: #f8fafc;
}

.name-cell {
  font-weight: 500;
}

.status-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.status-toggle input {
  margin: 0;
}

.actions-cell {
  text-align: right;
}

.delete-btn {
  padding: 4px 10px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.delete-btn:hover {
  background: #fecaca;
}

.empty-row {
  text-align: center;
  color: #64748b;
  padding: 32px !important;
}

@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
