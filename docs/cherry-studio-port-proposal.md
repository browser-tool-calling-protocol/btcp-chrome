# Cherry Studio to Chrome Extension Port Proposal

> Executive Summary and Technical Roadmap for Porting Cherry Studio to BTCP Chrome

## Overview

This proposal outlines the strategy for transforming the BTCP Chrome extension into a full-featured multi-model AI assistant, inspired by [Cherry Studio](https://github.com/CherryHQ/cherry-studio) - a cross-platform desktop AI client with 20+ provider support and 300+ pre-configured assistants.

### What is Cherry Studio?

Cherry Studio is an Electron-based desktop application that provides:
- **Multi-Provider AI Access**: OpenAI, Anthropic, Google, Mistral, local models (Ollama, LM Studio), and custom endpoints
- **300+ Pre-configured Assistants**: Ready-to-use AI personas for coding, writing, research, etc.
- **MCP Integration**: Built-in Model Context Protocol server support
- **Document Processing**: Handle PDFs, images, Office files with AI analysis
- **Knowledge Management**: RAG-based document indexing and retrieval

### Why Port to Chrome Extension?

| Desktop App Limitation | Chrome Extension Advantage |
|------------------------|---------------------------|
| Separate application | Lives in the browser |
| No page context | Full access to current tab content |
| Manual content copy | Direct DOM interaction |
| External browser control | Native browser APIs |
| No login state access | Uses existing sessions |

---

## Architecture Comparison

### Cherry Studio (Electron)

```
┌─────────────────────────────────────────────────────┐
│                Cherry Studio (Electron)              │
├─────────────────────────────────────────────────────┤
│  Main Process          │  Renderer Process          │
│  ├─ Node.js            │  ├─ React UI               │
│  ├─ SQLite (Drizzle)   │  ├─ Redux Store            │
│  ├─ File System        │  ├─ 12-Page Architecture   │
│  └─ Native APIs        │  └─ 70+ Components         │
├─────────────────────────────────────────────────────┤
│             AiCore Service Layer                     │
│  ┌──────────┐ ┌─────────────┐ ┌─────────────────┐  │
│  │Middleware│→│Provider     │→│20+ API Clients  │  │
│  │Chain     │ │Adapters     │ │(OpenAI, Claude) │  │
│  └──────────┘ └─────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### BTCP Chrome Extension (Target)

```
┌─────────────────────────────────────────────────────┐
│              BTCP Chrome Extension                   │
├─────────────────────────────────────────────────────┤
│  Background Script      │  UI Contexts              │
│  ├─ Service Worker      │  ├─ Sidepanel (Vue 3)     │
│  ├─ IndexedDB           │  ├─ Options Page          │
│  ├─ chrome.storage      │  ├─ Popup                 │
│  └─ Native Messaging    │  └─ Content Scripts       │
├─────────────────────────────────────────────────────┤
│             AiCore Service Layer                     │
│  ┌──────────┐ ┌─────────────┐ ┌─────────────────┐  │
│  │Middleware│→│Provider     │→│API Clients      │  │
│  │Chain     │ │Adapters     │ │(OpenAI, Claude) │  │
│  └──────────┘ └─────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────┤
│           Chrome-Exclusive Features                  │
│  ├─ 20+ Browser Automation Tools (BTCP)             │
│  ├─ Semantic Search Engine (HNSW + SIMD WASM)       │
│  ├─ Tab/History/Bookmark Integration                │
│  └─ Content Script Injection                        │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Status

### Completed (80%)

| Component | Status | Location |
|-----------|--------|----------|
| **AiCore Service** | Done | `background/ai-core/index.ts` |
| **Provider Adapters** | Done | `background/ai-core/providers/` |
| **Middleware Chain** | Done | `background/ai-core/middleware/` |
| **Storage Layer** | Done | `background/ai-core/storage.ts` |
| **Built-in Assistants** | Done | `background/ai-core/assistants.ts` |
| **Type Definitions** | Done | `background/ai-core/types.ts` |
| **Options Page** | Done | `entrypoints/options/` |
| **Provider Config UI** | Done | `options/pages/ProvidersPage.vue` |
| **Model Config UI** | Done | `options/pages/ModelsPage.vue` |
| **Assistant Manager UI** | Done | `options/pages/AssistantsPage.vue` |
| **MinApp Framework** | Done | `background/minApps/` |
| **AssistantSelector** | Done | `sidepanel/components/AssistantSelector.vue` |
| **useAiCore Composable** | Done | `sidepanel/composables/useAiCore.ts` |

### Supported Providers

| Provider | Type | Implementation |
|----------|------|----------------|
| OpenAI | Cloud | `providers/openai.ts` |
| Anthropic | Cloud | `providers/anthropic.ts` |
| Google Gemini | Cloud | `providers/google.ts` |
| Ollama | Local | `providers/ollama.ts` |
| OpenAI-Compatible | Custom | `providers/base.ts` |

### Built-in Assistants

| Assistant | Category | Browser Tools |
|-----------|----------|---------------|
| General Assistant | general | - |
| Code Expert | coding | - |
| Browser Assistant | browser | navigate, click, fill, extract |
| Research Assistant | research | navigate, extract, tabs |
| Page Summarizer | productivity | extract_content |

### Built-in MinApps

| MinApp | Purpose | Status |
|--------|---------|--------|
| Page Summarizer | Summarize current page | Done |
| Tab Organizer | AI-powered tab grouping | Done |
| Content Extractor | Extract & analyze page | Done |
| Quick Translator | Inline translation | Done |

---

## Remaining Work (20%)

### Phase 1: UI Polish & Integration

**Priority: High**

1. **Chat UI Enhancement**
   - Add `ModelBadge.vue` showing active model in chat
   - Add `ThinkingBlock.vue` for reasoning/CoT display (o1, Claude)
   - Improve `MessageActions.vue` (copy, retry, branch)

2. **Popup MinApp Launcher**
   - Create `MinAppLauncher.vue` in popup
   - Grid of quick-action buttons
   - One-click access to MinApps

3. **Assistant Selector Polish**
   - Search/filter functionality
   - Category grouping
   - Create custom assistant flow

### Phase 2: Advanced Features

**Priority: Medium**

1. **Vision Support**
   - Image attachment in chat
   - Screenshot capture integration
   - Vision model routing

2. **Token Counting**
   - Real-time token display
   - Context window warnings
   - Usage tracking per provider

3. **Conversation Management**
   - Export/import conversations
   - Branching conversations
   - History search

### Phase 3: Enterprise Features

**Priority: Low**

1. **API Key Encryption**
   - Encrypt keys at rest
   - Session-based decryption
   - Biometric unlock (if available)

2. **Usage Analytics**
   - Token usage per model
   - Cost estimation
   - Usage limits

3. **Team Features**
   - Shared assistants
   - Template library
   - Admin controls

---

## Technical Specifications

### Directory Structure

```
app/chrome-extension/entrypoints/
├── background/
│   ├── ai-core/                    # AI Infrastructure
│   │   ├── index.ts                # AiCoreService class
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── storage.ts              # chrome.storage wrapper
│   │   ├── assistants.ts           # Built-in assistant presets
│   │   ├── defaults.ts             # Default provider configs
│   │   ├── handlers.ts             # Message handlers
│   │   ├── middleware/
│   │   │   ├── index.ts            # Middleware chain runner
│   │   │   ├── abort-handler.ts    # Cancellation support
│   │   │   ├── logging.ts          # Request/response logging
│   │   │   └── error-handler.ts    # Error handling
│   │   └── providers/
│   │       ├── base.ts             # BaseApiClient abstract
│   │       ├── openai.ts           # OpenAI adapter
│   │       ├── anthropic.ts        # Anthropic adapter
│   │       ├── google.ts           # Gemini adapter
│   │       ├── ollama.ts           # Local Ollama adapter
│   │       └── index.ts            # Factory & registry
│   ├── minApps/                    # MinApp Framework
│   │   ├── registry.ts             # Registration system
│   │   ├── types.ts                # MinApp interfaces
│   │   └── apps/
│   │       ├── page-summarizer.ts
│   │       ├── tab-organizer.ts
│   │       ├── content-extractor.ts
│   │       └── quick-translator.ts
│   └── tools/                      # BTCP Browser Tools (existing)
├── options/                        # Settings Page
│   ├── App.vue                     # Main layout
│   ├── pages/
│   │   ├── ProvidersPage.vue       # Provider management
│   │   ├── ModelsPage.vue          # Model configuration
│   │   ├── AssistantsPage.vue      # Assistant presets
│   │   ├── PreferencesPage.vue     # General settings
│   │   └── UserscriptsPage.vue     # Custom scripts
│   └── components/
├── sidepanel/                      # Main Chat UI
│   ├── components/
│   │   ├── AssistantSelector.vue   # Assistant picker
│   │   ├── AgentChat.vue           # Chat interface
│   │   └── agent-chat/             # Chat components
│   └── composables/
│       └── useAiCore.ts            # AI state management
└── popup/                          # Quick Actions
    └── components/
        └── MinAppLauncher.vue      # MinApp grid (TODO)
```

### Type System

```typescript
// Core Types (ai-core/types.ts)

interface ProviderConfig {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'custom';
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  enabled: boolean;
}

interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: ModelCapability[];
  contextLength: number;
  pricing?: { input: number; output: number };
}

type ModelCapability =
  | 'text'
  | 'vision'
  | 'function_calling'
  | 'streaming'
  | 'reasoning';

interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  category: AssistantCategory;
  preferredModel?: string;
  tools?: string[];
  isBuiltIn: boolean;
}

interface CompletionRequest {
  model: string;
  messages: Message[];
  tools?: Tool[];
  stream?: boolean;
  abortSignal?: AbortSignal;
}

interface CompletionResponse {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
  usage?: { input: number; output: number };
  finishReason: 'stop' | 'tool_calls' | 'length' | 'error';
}
```

### Communication Flow

```
┌────────────────────────────────────────────────────────────────┐
│                    User Interface Layer                         │
├────────────────────────────────────────────────────────────────┤
│  Sidepanel           │  Options Page        │  Popup           │
│  ├─ Chat UI          │  ├─ Provider Config  │  ├─ MinApp Grid  │
│  ├─ AssistantSelect  │  ├─ Model Config     │  └─ Quick Actions│
│  └─ ModelBadge       │  └─ Assistant Mgmt   │                  │
└─────────┬────────────┴──────────┬───────────┴────────┬─────────┘
          │                       │                    │
          │  chrome.runtime.sendMessage                │
          ▼                       ▼                    ▼
┌────────────────────────────────────────────────────────────────┐
│                   Background Service Worker                     │
├────────────────────────────────────────────────────────────────┤
│  Message Router                                                 │
│  ├─ AI_COMPLETE      → AiCoreService.complete()                │
│  ├─ AI_STREAM        → AiCoreService.streamComplete()          │
│  ├─ GET_PROVIDERS    → AiCoreService.listProviders()           │
│  ├─ GET_MODELS       → AiCoreService.listModels()              │
│  ├─ RUN_MINAPP       → MinAppRegistry.execute()                │
│  └─ TOOL_CALL        → BrowserToolExecutor (existing BTCP)     │
└─────────┬────────────────────────────────────────────┬─────────┘
          │                                            │
          ▼                                            ▼
┌─────────────────────────┐          ┌───────────────────────────┐
│  AiCore Middleware      │          │  BTCP Tool System          │
│  ├─ Abort Handler       │          │  ├─ Navigation Tools       │
│  ├─ Logging             │          │  ├─ Interaction Tools      │
│  └─ Error Handler       │          │  ├─ Content Tools          │
└─────────┬───────────────┘          │  └─ Tab Management Tools   │
          │                          └───────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Adapters                             │
├─────────────────────────────────────────────────────────────────┤
│  OpenAI     │  Anthropic  │  Google    │  Ollama   │  Custom    │
│  Client     │  Client     │  Client    │  Client   │  Client    │
└─────────────┴─────────────┴────────────┴───────────┴────────────┘
          │             │           │           │           │
          ▼             ▼           ▼           ▼           ▼
     api.openai.com  api.anthropic  googleapis  localhost   custom
```

---

## Platform Adaptations

| Cherry Studio Feature | Chrome Extension Adaptation |
|-----------------------|----------------------------|
| Electron IPC | `chrome.runtime.sendMessage` |
| SQLite (Drizzle) | IndexedDB (native/Dexie) |
| Electron Store | `chrome.storage.local/sync` |
| Node.js File System | File System Access API |
| Desktop Notifications | `chrome.notifications` API |
| System Tray | Browser action badge |
| Multiple Windows | Tabs + sidepanel |
| Native Menus | Context menus API |
| Auto-updates | Chrome Web Store |

---

## Browser-Exclusive Features

The Chrome extension port adds capabilities impossible in the desktop app:

### 1. Real Browser Context

```typescript
// Access current page content directly
const pageContent = await extractPageContent(tabId);

// Interact with any web page
await clickElement(selector);
await fillForm(fields);

// Use existing login sessions
// No need for users to re-authenticate
```

### 2. Semantic Search Across Browser Data

```typescript
// Search all indexed content with AI
const results = await semanticSearch({
  query: "emails about project deadline",
  sources: ['tabs', 'history', 'bookmarks']
});
```

### 3. Native Browser Automation

```typescript
// 20+ BTCP tools available to AI
const tools = [
  'chrome_navigate',
  'chrome_click_element',
  'chrome_fill_or_select',
  'chrome_screenshot',
  'chrome_get_web_content',
  'chrome_get_interactive_elements',
  // ... and more
];
```

### 4. Cross-Site Operations

```typescript
// Work across multiple sites in a single session
await navigate('https://gmail.com');
await extractEmails();
await navigate('https://calendar.google.com');
await createEvent(emailData);
```

---

## Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Provider Support | 5+ providers | 5 (Done) |
| Built-in Assistants | 10+ presets | 5 (50%) |
| MinApps | 5+ apps | 4 (80%) |
| Options Page Pages | 5 pages | 5 (Done) |
| Chat UI Components | Full featured | 80% |
| Test Coverage | >70% | TBD |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| API Rate Limits | Service degradation | Request queuing, response caching |
| Large Contexts | Memory/performance | Token counting, smart truncation |
| Cross-Origin Issues | Blocked requests | CSP configuration, background proxy |
| Storage Limits | Data loss | IndexedDB for large data, cleanup |
| Provider API Changes | Broken functionality | Abstraction layer, adapter pattern |
| Extension Rejection | Can't publish | Follow Chrome Web Store policies |

---

## Next Steps

### Immediate (Next Sprint)

1. [ ] Create `MinAppLauncher.vue` in popup
2. [ ] Add `ModelBadge.vue` to chat header
3. [ ] Implement `ThinkingBlock.vue` for reasoning display
4. [ ] Polish AssistantSelector with search/filter
5. [ ] Add 5 more built-in assistants

### Short-term

1. [ ] Image attachment support
2. [ ] Token counting display
3. [ ] Conversation export/import
4. [ ] Integration testing suite
5. [ ] Performance optimization

### Long-term

1. [ ] Plugin/extension system
2. [ ] Knowledge base (RAG) integration
3. [ ] Team/enterprise features
4. [ ] Custom model fine-tuning support
5. [ ] Cross-browser support (Firefox, Edge)

---

## References

- [Cherry Studio GitHub](https://github.com/CherryHQ/cherry-studio)
- [Cherry Studio Adoption Research](./cherry-studio-adoption.md)
- [Implementation Plan](./cherry-studio-implementation-plan.md)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [MCP Specification](https://modelcontextprotocol.io/)

---

## Appendix: Feature Mapping

### Cherry Studio Pages to Chrome Extension

| Cherry Studio Page | Extension Location | Implementation |
|-------------------|-------------------|----------------|
| Home (Chat) | Sidepanel | `sidepanel/App.vue` |
| Assistants | Options + Sidepanel | `AssistantsPage.vue`, `AssistantSelector.vue` |
| Settings | Options Page | `options/pages/` |
| MinApps | Popup + Background | `minApps/`, `MinAppLauncher.vue` |
| Knowledge | Background | Leverage existing semantic search |
| Store | External | Link to web store |
| History | Sidepanel Tab | Existing `ConversationList.vue` |
| Launchpad | Popup | Command palette (future) |

### Cherry Studio Services to Chrome Extension

| Service | Location | Status |
|---------|----------|--------|
| ApiService | `ai-core/providers/` | Done |
| ModelService | `ai-core/index.ts` | Done |
| AssistantService | `ai-core/assistants.ts` | Done |
| ProviderService | `ai-core/index.ts` | Done |
| StreamProcessingService | `ai-core/middleware/` | Done |
| CacheService | `ai-core/storage.ts` | Partial |
| TokenService | - | TODO |
| TranslateService | `minApps/quick-translator.ts` | Done |
| KnowledgeService | `semantic-similarity.ts` | Existing |
