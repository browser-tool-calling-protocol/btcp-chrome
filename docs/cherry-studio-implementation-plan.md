# Cherry Studio-Inspired Implementation Plan

> Fresh implementation in Vue 3 for BTCP Chrome Extension, inspired by Cherry Studio patterns

## Overview

This plan transforms BTCP Chrome from a browser automation tool into a **multi-model AI assistant** with Cherry Studio-inspired architecture while maintaining the MIT license.

### Existing Assets to Leverage

| Component | Status | Location |
|-----------|--------|----------|
| Agent Chat UI | Ready | `sidepanel/components/AgentChat/` |
| Theme System (6 themes) | Ready | `sidepanel/composables/useAgentTheme.ts` |
| BTCP Client | Ready | `background/btcp-client.ts` |
| Semantic Engine | Ready | `background/semantic-similarity.ts` |
| Tool Executor (20+ tools) | Ready | `background/tools/` |
| Composables Pattern | Ready | `sidepanel/composables/` |

### What We're Building

```
┌─────────────────────────────────────────────────────────────┐
│                  BTCP AI Assistant                           │
├─────────────────────────────────────────────────────────────┤
│  Multi-Provider Support    │  Cherry Studio Patterns         │
│  ├─ OpenAI                 │  ├─ AiCore Middleware Chain     │
│  ├─ Anthropic              │  ├─ Provider Adapters           │
│  ├─ Google Gemini          │  ├─ Assistant Presets           │
│  ├─ Local (Ollama)         │  ├─ MinApp Framework            │
│  └─ Custom OpenAI-compat   │  └─ State Persistence           │
├─────────────────────────────────────────────────────────────┤
│  Chrome-Specific Features  │  Existing BTCP Features         │
│  ├─ Tab Context Awareness  │  ├─ Browser Automation Tools    │
│  ├─ Page Summarization     │  ├─ Semantic Search             │
│  ├─ Content Extraction     │  ├─ Record/Replay Workflows     │
│  └─ Form Assistance        │  └─ Element Marking             │
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: AI Core Infrastructure

**Goal**: Build the multi-provider AI foundation in the background script

### 1.1 Provider Adapter System

Create a unified interface for multiple AI providers:

```
app/chrome-extension/entrypoints/background/
└── ai-core/
    ├── index.ts                 # AiCoreService main class
    ├── types.ts                 # Shared types and interfaces
    ├── middleware/
    │   ├── index.ts             # Middleware chain runner
    │   ├── logging.ts           # Request/response logging
    │   ├── abort-handler.ts     # Cancellation support
    │   ├── stream-adapter.ts    # Unified streaming interface
    │   └── tool-call.ts         # Tool call processing
    └── providers/
        ├── base.ts              # BaseApiClient abstract class
        ├── openai.ts            # OpenAI adapter
        ├── anthropic.ts         # Anthropic adapter
        ├── google.ts            # Gemini adapter
        ├── ollama.ts            # Local Ollama adapter
        └── openai-compatible.ts # Generic OpenAI-compatible
```

**Types** (`ai-core/types.ts`):

```typescript
// Provider configuration
export interface ProviderConfig {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'custom';
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

// Model definition
export interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: ModelCapability[];
  contextLength: number;
  pricing?: { input: number; output: number };
}

export type ModelCapability =
  | 'text'
  | 'vision'
  | 'function_calling'
  | 'streaming'
  | 'reasoning';

// Completion request/response
export interface CompletionRequest {
  model: string;
  messages: Message[];
  tools?: Tool[];
  stream?: boolean;
  abortSignal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResponse {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
  usage?: { input: number; output: number };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}

// Middleware context
export interface MiddlewareContext {
  request: CompletionRequest;
  response?: CompletionResponse;
  provider: ProviderConfig;
  model: Model;
  aborted: boolean;
  error?: Error;
  metadata: Record<string, unknown>;
}

export interface Middleware {
  name: string;
  process(ctx: MiddlewareContext, next: () => Promise<void>): Promise<void>;
}
```

**AiCoreService** (`ai-core/index.ts`):

```typescript
export class AiCoreService {
  private providers: Map<string, ProviderConfig> = new Map();
  private clients: Map<string, BaseApiClient> = new Map();
  private middlewares: Middleware[] = [];

  constructor() {
    this.loadProvidersFromStorage();
    this.registerDefaultMiddlewares();
  }

  // Provider management
  registerProvider(config: ProviderConfig): void;
  removeProvider(id: string): void;
  getProvider(id: string): ProviderConfig | undefined;
  listProviders(): ProviderConfig[];

  // Model operations
  listModels(providerId?: string): Model[];
  getModel(modelId: string): Model | undefined;

  // Completion execution
  async complete(request: CompletionRequest): Promise<CompletionResponse>;
  async *streamComplete(request: CompletionRequest): AsyncGenerator<StreamChunk>;

  // Middleware chain
  use(middleware: Middleware): void;

  // Persistence
  private async loadProvidersFromStorage(): Promise<void>;
  private async saveProvidersToStorage(): Promise<void>;
}
```

### 1.2 Default Providers

Pre-configure popular providers with sensible defaults:

```typescript
// ai-core/providers/defaults.ts
export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'cloud',
    baseUrl: 'https://api.openai.com/v1',
    enabled: false, // User must add API key
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    type: 'cloud',
    baseUrl: 'https://api.anthropic.com/v1',
    enabled: false,
  },
  {
    id: 'google',
    name: 'Google AI',
    type: 'cloud',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    enabled: false,
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    type: 'local',
    baseUrl: 'http://localhost:11434/v1',
    enabled: false,
  },
];

export const DEFAULT_MODELS: Record<string, Model[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', capabilities: ['text', 'vision', 'function_calling', 'streaming'], contextLength: 128000 },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', capabilities: ['text', 'vision', 'function_calling', 'streaming'], contextLength: 128000 },
    { id: 'o1', name: 'o1', capabilities: ['text', 'reasoning'], contextLength: 200000 },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', capabilities: ['text', 'vision', 'function_calling', 'streaming'], contextLength: 200000 },
    { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', capabilities: ['text', 'vision', 'function_calling', 'streaming', 'reasoning'], contextLength: 200000 },
  ],
  google: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', capabilities: ['text', 'vision', 'function_calling', 'streaming'], contextLength: 1000000 },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', capabilities: ['text', 'vision', 'function_calling', 'streaming', 'reasoning'], contextLength: 2000000 },
  ],
};
```

### 1.3 Storage Layer

Use `chrome.storage.local` with a structured schema:

```typescript
// ai-core/storage.ts
export interface AiCoreStorage {
  providers: ProviderConfig[];
  customModels: Model[];
  assistants: Assistant[];
  activeProviderId: string;
  activeModelId: string;
  preferences: {
    defaultTemperature: number;
    defaultMaxTokens: number;
    streamingEnabled: boolean;
  };
}

export const aiCoreStorage = {
  async get<K extends keyof AiCoreStorage>(key: K): Promise<AiCoreStorage[K]>;
  async set<K extends keyof AiCoreStorage>(key: K, value: AiCoreStorage[K]): Promise<void>;
  async getAll(): Promise<AiCoreStorage>;

  // Reactive updates (for UI sync)
  onChange(callback: (changes: Partial<AiCoreStorage>) => void): () => void;
};
```

### 1.4 Deliverables

| File | Purpose |
|------|---------|
| `ai-core/index.ts` | Main AiCoreService class |
| `ai-core/types.ts` | TypeScript interfaces |
| `ai-core/storage.ts` | chrome.storage wrapper |
| `ai-core/middleware/*.ts` | Middleware implementations |
| `ai-core/providers/*.ts` | Provider adapters |

---

## Phase 2: Model Configuration UI

**Goal**: Build the settings interface for provider and model management

### 2.1 Options Page Structure

```
app/chrome-extension/entrypoints/options/
├── App.vue                    # Main layout with sidebar
├── main.ts                    # Entry point
├── pages/
│   ├── ProvidersPage.vue      # Provider management
│   ├── ModelsPage.vue         # Model configuration
│   ├── AssistantsPage.vue     # Assistant presets
│   └── PreferencesPage.vue    # General settings
├── components/
│   ├── ProviderCard.vue       # Provider config card
│   ├── ModelSelector.vue      # Grouped model dropdown
│   ├── ApiKeyInput.vue        # Secure API key input
│   └── CustomModelForm.vue    # Add custom model form
└── composables/
    ├── useProviders.ts        # Provider state
    └── useModels.ts           # Model state
```

### 2.2 Provider Configuration UI

```vue
<!-- options/pages/ProvidersPage.vue -->
<template>
  <div class="providers-page">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-xl font-semibold">AI Providers</h1>
      <button @click="showAddCustom = true" class="btn-primary">
        Add Custom Provider
      </button>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ProviderCard
        v-for="provider in providers"
        :key="provider.id"
        :provider="provider"
        @update="updateProvider"
        @test="testConnection"
      />
    </div>

    <CustomProviderModal
      v-if="showAddCustom"
      @close="showAddCustom = false"
      @add="addProvider"
    />
  </div>
</template>
```

### 2.3 Model Selector Component

Reusable model selector with capability filtering:

```vue
<!-- components/ModelSelector.vue -->
<template>
  <div class="model-selector">
    <select v-model="selectedModel" class="w-full">
      <optgroup
        v-for="provider in enabledProviders"
        :key="provider.id"
        :label="provider.name"
      >
        <option
          v-for="model in getModelsForProvider(provider.id)"
          :key="model.id"
          :value="model.id"
          :disabled="!meetsCapabilities(model)"
        >
          {{ model.name }}
          <span v-if="model.capabilities.includes('vision')">👁</span>
          <span v-if="model.capabilities.includes('reasoning')">🧠</span>
        </option>
      </optgroup>
    </select>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: string;
  requiredCapabilities?: ModelCapability[];
}
</script>
```

### 2.4 Deliverables

| File | Purpose |
|------|---------|
| `options/App.vue` | Options page layout |
| `options/pages/*.vue` | Configuration pages |
| `options/components/*.vue` | Reusable form components |
| `wxt.config.ts` update | Register options page |

---

## Phase 3: Assistant Presets

**Goal**: Implement pre-configured AI personas like Cherry Studio's 300+ assistants

### 3.1 Assistant Data Structure

```typescript
// shared/types/assistant.ts
export interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;              // Emoji or icon name
  systemPrompt: string;
  category: AssistantCategory;

  // Optional configurations
  preferredModel?: string;
  temperature?: number;
  tools?: string[];          // Enabled BTCP tools

  // Metadata
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

export type AssistantCategory =
  | 'general'
  | 'coding'
  | 'writing'
  | 'research'
  | 'productivity'
  | 'browser'      // Chrome-specific
  | 'custom';

export const BUILTIN_ASSISTANTS: Assistant[] = [
  {
    id: 'general',
    name: 'General Assistant',
    description: 'Helpful AI assistant for any task',
    icon: '💬',
    systemPrompt: 'You are a helpful AI assistant.',
    category: 'general',
    isBuiltIn: true,
  },
  {
    id: 'coder',
    name: 'Code Expert',
    description: 'Expert programmer and code reviewer',
    icon: '👨‍💻',
    systemPrompt: `You are an expert programmer. Help with:
- Writing clean, efficient code
- Debugging issues
- Code reviews and best practices
- Explaining complex concepts`,
    category: 'coding',
    isBuiltIn: true,
  },
  {
    id: 'browser-helper',
    name: 'Browser Assistant',
    description: 'Helps automate and navigate web pages',
    icon: '🌐',
    systemPrompt: `You are a browser automation assistant with access to Chrome browser tools.
You can help users:
- Navigate web pages
- Extract information from pages
- Fill out forms
- Take screenshots
- Manage tabs

Use the available browser tools to accomplish tasks.`,
    category: 'browser',
    tools: ['navigate', 'click', 'fill', 'extract_content', 'screenshot'],
    isBuiltIn: true,
  },
  {
    id: 'researcher',
    name: 'Research Assistant',
    description: 'Helps research topics across multiple tabs',
    icon: '🔍',
    systemPrompt: `You are a research assistant that helps gather and synthesize information.
You can open multiple tabs, extract content, and compile research findings.`,
    category: 'research',
    tools: ['navigate', 'extract_content', 'tab_management'],
    isBuiltIn: true,
  },
  {
    id: 'summarizer',
    name: 'Page Summarizer',
    description: 'Summarizes web page content',
    icon: '📝',
    systemPrompt: `You summarize web pages concisely. Extract key points and present them clearly.`,
    category: 'productivity',
    tools: ['extract_content'],
    isBuiltIn: true,
  },
];
```

### 3.2 Assistant Selector UI

```vue
<!-- sidepanel/components/AssistantSelector.vue -->
<template>
  <div class="assistant-selector">
    <button @click="isOpen = !isOpen" class="selector-trigger">
      <span class="text-lg">{{ activeAssistant?.icon }}</span>
      <span class="font-medium">{{ activeAssistant?.name }}</span>
      <ChevronDownIcon class="w-4 h-4" />
    </button>

    <div v-if="isOpen" class="selector-dropdown">
      <div v-for="category in categories" :key="category">
        <div class="category-header">{{ formatCategory(category) }}</div>
        <div
          v-for="assistant in getAssistantsByCategory(category)"
          :key="assistant.id"
          @click="selectAssistant(assistant)"
          class="assistant-item"
        >
          <span class="text-lg">{{ assistant.icon }}</span>
          <div>
            <div class="font-medium">{{ assistant.name }}</div>
            <div class="text-xs text-gray-500">{{ assistant.description }}</div>
          </div>
        </div>
      </div>

      <button @click="showCreate = true" class="create-btn">
        + Create Custom Assistant
      </button>
    </div>
  </div>
</template>
```

### 3.3 Deliverables

| File | Purpose |
|------|---------|
| `shared/types/assistant.ts` | Assistant type definitions |
| `shared/data/builtin-assistants.ts` | Pre-configured assistants |
| `sidepanel/components/AssistantSelector.vue` | Selection UI |
| `options/pages/AssistantsPage.vue` | Assistant management |

---

## Phase 4: Enhanced Chat UI

**Goal**: Upgrade the existing AgentChat with Cherry Studio-inspired features

### 4.1 Chat Enhancements

Build on existing `AgentChat.vue` with:

```
sidepanel/components/AgentChat/
├── (existing components)
├── ModelBadge.vue           # Show active model
├── ThinkingBlock.vue        # Reasoning/CoT display
├── CodeBlock.vue            # Enhanced syntax highlighting
├── AttachmentPreview.vue    # File/image previews
└── MessageActions.vue       # Copy, retry, branch actions
```

### 4.2 Thinking/Reasoning Display

For models with reasoning (o1, Claude with extended thinking):

```vue
<!-- ThinkingBlock.vue -->
<template>
  <div class="thinking-block" :class="{ collapsed: !isExpanded }">
    <button @click="isExpanded = !isExpanded" class="thinking-toggle">
      <BrainIcon class="w-4 h-4" />
      <span>{{ isExpanded ? 'Hide' : 'Show' }} reasoning</span>
      <span class="text-xs text-gray-500">
        ({{ thinkingTokens }} tokens)
      </span>
    </button>

    <div v-if="isExpanded" class="thinking-content">
      <div v-for="(step, i) in thinkingSteps" :key="i" class="thinking-step">
        {{ step }}
      </div>
    </div>
  </div>
</template>
```

### 4.3 Enhanced Input Bar

Add model selector and capabilities to existing composer:

```vue
<!-- Enhance AgentComposer.vue -->
<template>
  <div class="agent-composer">
    <!-- Top bar with model/assistant selection -->
    <div class="composer-toolbar">
      <AssistantSelector v-model="activeAssistant" />
      <ModelSelector
        v-model="activeModel"
        :required-capabilities="requiredCapabilities"
      />
    </div>

    <!-- Existing input area -->
    <div class="composer-input">
      <textarea
        ref="inputRef"
        v-model="input"
        @keydown="handleKeydown"
        placeholder="Ask anything..."
      />

      <!-- Attachments -->
      <div v-if="attachments.length" class="attachments">
        <AttachmentChip
          v-for="att in attachments"
          :key="att.id"
          :attachment="att"
          @remove="removeAttachment(att.id)"
        />
      </div>
    </div>

    <!-- Actions row -->
    <div class="composer-actions">
      <button @click="openFilePicker" title="Attach file">
        <PaperclipIcon />
      </button>
      <button @click="captureScreenshot" title="Screenshot">
        <CameraIcon />
      </button>
      <div class="flex-1" />
      <button
        @click="send"
        :disabled="!canSend"
        class="send-btn"
      >
        Send
      </button>
    </div>
  </div>
</template>
```

### 4.4 Deliverables

| File | Purpose |
|------|---------|
| `AgentChat/ModelBadge.vue` | Active model display |
| `AgentChat/ThinkingBlock.vue` | Reasoning visualization |
| `AgentChat/MessageActions.vue` | Message interactions |
| Enhanced `AgentComposer.vue` | Model/assistant selection |

---

## Phase 5: MinApp Framework

**Goal**: Build extensible mini-applications for browser-specific AI tasks

### 5.1 MinApp Architecture

```
app/chrome-extension/entrypoints/
├── background/
│   └── minApps/
│       ├── registry.ts         # MinApp registration
│       ├── executor.ts         # Execution sandbox
│       └── apps/
│           ├── page-summarizer.ts
│           ├── tab-organizer.ts
│           ├── form-filler.ts
│           └── research-assistant.ts
└── popup/
    └── components/
        └── MinAppLauncher.vue  # Quick launch UI
```

### 5.2 MinApp Interface

```typescript
// background/minApps/types.ts
export interface MinApp {
  id: string;
  name: string;
  description: string;
  icon: string;

  // Required Chrome permissions
  permissions: chrome.permissions.Permissions;

  // AI configuration
  defaultModel?: string;
  systemPrompt: string;
  tools: string[];

  // Execution
  execute(context: MinAppContext): Promise<MinAppResult>;
}

export interface MinAppContext {
  // Chrome APIs
  activeTab: chrome.tabs.Tab;
  selectedText?: string;
  pageContent?: string;

  // AI access
  aiCore: AiCoreService;

  // User input
  userInput?: string;
}

export interface MinAppResult {
  success: boolean;
  output?: string;
  actions?: MinAppAction[];
  error?: string;
}
```

### 5.3 Built-in MinApps

**Page Summarizer**:
```typescript
export const pageSummarizerApp: MinApp = {
  id: 'page-summarizer',
  name: 'Summarize Page',
  description: 'Get a quick summary of the current page',
  icon: '📄',
  permissions: { permissions: ['activeTab'] },
  systemPrompt: 'Summarize the following web page content concisely...',
  tools: ['extract_content'],

  async execute(ctx) {
    const content = await extractPageContent(ctx.activeTab.id);
    const summary = await ctx.aiCore.complete({
      model: this.defaultModel || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: `Summarize:\n\n${content}` }
      ]
    });
    return { success: true, output: summary.content };
  }
};
```

**Tab Organizer**:
```typescript
export const tabOrganizerApp: MinApp = {
  id: 'tab-organizer',
  name: 'Organize Tabs',
  description: 'AI-powered tab grouping and cleanup',
  icon: '🗂️',
  permissions: { permissions: ['tabs', 'tabGroups'] },
  systemPrompt: 'Analyze tabs and suggest logical groupings...',
  tools: ['tab_management'],

  async execute(ctx) {
    const tabs = await chrome.tabs.query({});
    // Use AI to categorize and group
    // Return grouped results
  }
};
```

### 5.4 MinApp Launcher UI

```vue
<!-- popup/components/MinAppLauncher.vue -->
<template>
  <div class="minapp-launcher">
    <h3 class="text-sm font-medium mb-3">Quick Actions</h3>

    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="app in minApps"
        :key="app.id"
        @click="launchApp(app)"
        class="minapp-btn"
      >
        <span class="text-xl">{{ app.icon }}</span>
        <span class="text-xs">{{ app.name }}</span>
      </button>
    </div>
  </div>
</template>
```

### 5.5 Deliverables

| File | Purpose |
|------|---------|
| `background/minApps/types.ts` | MinApp interfaces |
| `background/minApps/registry.ts` | Registration system |
| `background/minApps/apps/*.ts` | Built-in MinApps |
| `popup/components/MinAppLauncher.vue` | Launch UI |

---

## Phase 6: Integration & Polish

**Goal**: Connect all pieces and refine the user experience

### 6.1 Unified State Management

Create composables that connect to background services:

```typescript
// sidepanel/composables/useAiCore.ts
export function useAiCore() {
  const activeProvider = ref<ProviderConfig | null>(null);
  const activeModel = ref<Model | null>(null);
  const activeAssistant = ref<Assistant | null>(null);

  // Sync with background storage
  onMounted(async () => {
    const storage = await chrome.storage.local.get(['activeProviderId', 'activeModelId', 'activeAssistantId']);
    // Load active selections
  });

  // Watch for changes
  chrome.storage.onChanged.addListener((changes) => {
    // Update reactive state
  });

  async function complete(messages: Message[]) {
    return sendToBackground('AI_COMPLETE', {
      model: activeModel.value?.id,
      messages,
      assistant: activeAssistant.value,
    });
  }

  return {
    activeProvider,
    activeModel,
    activeAssistant,
    complete,
  };
}
```

### 6.2 Background Message Handlers

```typescript
// background/ai-core/handlers.ts
export function registerAiCoreHandlers(aiCore: AiCoreService) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
      case 'AI_COMPLETE':
        handleComplete(aiCore, msg.payload, sendResponse);
        return true; // async response

      case 'AI_STREAM':
        handleStream(aiCore, msg.payload, sender.tab?.id);
        return false;

      case 'GET_PROVIDERS':
        sendResponse(aiCore.listProviders());
        return false;

      case 'GET_MODELS':
        sendResponse(aiCore.listModels(msg.providerId));
        return false;
    }
  });
}
```

### 6.3 Theme Extensions

Add AI-specific theme tokens:

```css
/* New theme tokens for AI features */
:root {
  /* Reasoning/thinking blocks */
  --ac-thinking-bg: rgba(99, 102, 241, 0.1);
  --ac-thinking-border: rgba(99, 102, 241, 0.3);

  /* Model capability badges */
  --ac-badge-vision: #10b981;
  --ac-badge-reasoning: #8b5cf6;
  --ac-badge-tools: #f59e0b;

  /* MinApp launcher */
  --ac-minapp-bg: var(--ac-surface-secondary);
  --ac-minapp-hover: var(--ac-surface-tertiary);
}
```

### 6.4 Deliverables

| File | Purpose |
|------|---------|
| `sidepanel/composables/useAiCore.ts` | AI state management |
| `background/ai-core/handlers.ts` | Message handlers |
| Theme CSS updates | AI-specific tokens |
| Documentation | Usage guide |

---

## Implementation Order

### Sprint 1: Foundation (Phase 1)
1. Create `ai-core/` directory structure
2. Implement `AiCoreService` with middleware chain
3. Add OpenAI provider adapter
4. Add storage layer
5. **Test**: Verify API calls work from background

### Sprint 2: Configuration (Phase 2)
1. Create options page entry point
2. Build provider configuration UI
3. Build model selector component
4. Add API key management
5. **Test**: Configure provider, see models

### Sprint 3: Assistants (Phase 3)
1. Define assistant types
2. Add built-in assistant presets
3. Build assistant selector UI
4. Integrate with chat
5. **Test**: Switch assistants, see prompts applied

### Sprint 4: Chat Upgrade (Phase 4)
1. Add model badge to chat
2. Build thinking/reasoning display
3. Enhance message actions
4. Upgrade composer with selectors
5. **Test**: Full chat flow with model switching

### Sprint 5: MinApps (Phase 5)
1. Create MinApp framework
2. Implement page summarizer
3. Implement tab organizer
4. Build launcher UI
5. **Test**: Launch MinApps from popup

### Sprint 6: Polish (Phase 6)
1. Unified state management
2. Background handlers
3. Theme extensions
4. Testing & bug fixes
5. Documentation

---

## File Structure Summary

```
app/chrome-extension/entrypoints/
├── background/
│   ├── ai-core/                    # NEW: AI infrastructure
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── storage.ts
│   │   ├── handlers.ts
│   │   ├── middleware/
│   │   └── providers/
│   └── minApps/                    # NEW: MinApp framework
│       ├── registry.ts
│       ├── executor.ts
│       └── apps/
├── options/                        # NEW: Options page
│   ├── App.vue
│   ├── main.ts
│   ├── pages/
│   └── components/
├── popup/
│   └── components/
│       └── MinAppLauncher.vue      # NEW
├── sidepanel/
│   ├── components/
│   │   ├── AssistantSelector.vue   # NEW
│   │   └── AgentChat/
│   │       ├── ModelBadge.vue      # NEW
│   │       ├── ThinkingBlock.vue   # NEW
│   │       └── (existing...)
│   └── composables/
│       └── useAiCore.ts            # NEW
└── shared/
    └── types/
        └── assistant.ts            # NEW
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Providers supported | 5+ (OpenAI, Anthropic, Google, Ollama, custom) |
| Built-in assistants | 10+ presets |
| MinApps | 5+ browser utilities |
| API response time | <500ms for model list |
| Theme consistency | 100% token usage |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| API rate limits | Implement request queuing, caching |
| Large context sizes | Token counting, truncation |
| Cross-origin issues | Proper CSP configuration |
| Storage limits | IndexedDB for large data |
| Provider API changes | Abstract behind adapters |

---

## References

- [Cherry Studio GitHub](https://github.com/CherryHQ/cherry-studio) - Architecture inspiration
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [OpenAI API Docs](https://platform.openai.com/docs/)
