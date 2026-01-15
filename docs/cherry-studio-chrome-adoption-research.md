# Cherry Studio Chrome Extension Adoption Research

## Executive Summary

Cherry Studio is a cross-platform Electron desktop AI client supporting 20+ LLM providers with 300+ pre-configured assistants. This document analyzes how its architecture and features can be adapted for the BTCP Chrome extension.

---

## 1. UI/UX Concepts

### 1.1 Main Interface Structure

Cherry Studio uses a **12-page modular architecture**:

| Page | Purpose | Chrome Extension Equivalent |
|------|---------|---------------------------|
| **Home** | Primary chat interface | Sidepanel main view |
| **Assistants** | Pre-configured AI personas | Assistant selector in popup |
| **Settings** | Provider/model configuration | Options page |
| **Store** | Plugin/assistant marketplace | Web-based store link |
| **MinApps** | Lightweight embedded tools | Popup mini-tools |
| **Knowledge** | RAG document management | Background indexing |
| **Files** | File management + WebDAV | Extension file handling |
| **Notes** | Note-taking with AI | Optional sidepanel tab |
| **Paintings** | Image generation gallery | Not applicable |
| **Translate** | Translation utility | Quick action tool |
| **History** | Conversation archives | IndexedDB history view |
| **Launchpad** | Quick feature access | Popup command palette |

### 1.2 Chat Interface Components

```
┌──────────────────────────────────────────────┐
│  ChatNavbar (model selector, assistant info) │
├──────────────────────────────────────────────┤
│                                              │
│  Messages/                                   │
│  ├── MessageBubble                           │
│  ├── CodeViewer (syntax highlighting)        │
│  ├── MarkdownRenderer                        │
│  └── ThinkingEffect (reasoning display)      │
│                                              │
├──────────────────────────────────────────────┤
│  Inputbar/                                   │
│  ├── RichTextEditor (Tiptap)                 │
│  ├── FileAttachment                          │
│  ├── ModelSelector                           │
│  └── SendButton                              │
└──────────────────────────────────────────────┘
```

### 1.3 Design System Components (70+)

Key reusable components for Chrome extension:

**Essential Components:**
- `ModelSelector` - Dropdown for switching AI models
- `Avatar` / `EmojiIcon` - Visual assistant identification
- `CodeViewer` - Syntax-highlighted code blocks
- `MarkdownShadowDOMRenderer` - Isolated markdown rendering
- `ThinkingEffect` - Reasoning/chain-of-thought display
- `Spinner` / `IndicatorLight` - Loading states
- `VirtualList` - Efficient long message list rendering

**Advanced Components:**
- `ContextMenu` - Right-click actions
- `DraggableList` - Reorderable items
- `CollapsibleSearchBar` - Space-efficient search
- `EmojiPicker` - Custom assistant icons
- `ErrorBoundary` - Graceful error handling

### 1.4 Theming System

- Light/Dark mode toggle
- Transparent window option (N/A for extension)
- Community-created themes
- CSS variables for customization

**Recommended for Chrome Extension:**
```css
:root {
  --primary-color: #7c3aed;
  --bg-primary: #ffffff;
  --bg-secondary: #f3f4f6;
  --text-primary: #1f2937;
  --border-color: #e5e7eb;
}

[data-theme="dark"] {
  --bg-primary: #1f2937;
  --bg-secondary: #111827;
  --text-primary: #f9fafb;
  --border-color: #374151;
}
```

---

## 2. Core Functions

### 2.1 Service Architecture (45+ Services)

**AI/Model Services:**
| Service | Function | Chrome Adaptation |
|---------|----------|-------------------|
| `ApiService` | Multi-provider API calls | Background script API layer |
| `ModelService` | Model configuration | Shared state management |
| `AssistantService` | Assistant CRUD operations | IndexedDB + sync storage |
| `ProviderService` | Provider management | Options page configuration |
| `StreamProcessingService` | SSE stream handling | Fetch streaming in background |

**Data Services:**
| Service | Function | Chrome Adaptation |
|---------|----------|-------------------|
| `KnowledgeService` | RAG document indexing | Offscreen doc for embeddings |
| `CacheService` | Response caching | IndexedDB cache layer |
| `BackupService` | WebDAV/S3 sync | Chrome sync API + external |
| `TokenService` | Token counting | WASM tokenizer |

**Utility Services:**
| Service | Function | Chrome Adaptation |
|---------|----------|-------------------|
| `TranslateService` | Translation features | Inline tool |
| `WebSearchService` | Web search integration | Content script scraping |
| `LoggerService` | Centralized logging | Console + remote logging |

### 2.2 AI Core Architecture

Cherry Studio uses a **3-layer AI processing architecture**:

```
┌─────────────────────────────────────────────────────┐
│                  AiCoreService                       │
│         (Unified business logic entry point)         │
│  • executeCompletions()                              │
│  • translateText()                                   │
│  • generateImage()                                   │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│               Middleware Chain                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ Logging  │→│ Abort    │→│ FinalChunkConsumer   │ │
│  │ MW       │ │ Handler  │ │ MW                   │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐ │
│  │ Tag      │→│ Tool     │→│ Stream Adapter       │ │
│  │ Parser   │ │ Call MW  │ │ MW                   │ │
│  └──────────┘ └──────────┘ └──────────────────────┘ │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│            XxxApiClient (Provider Adapters)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ OpenAI   │ │ Anthropic│ │ Google   │ │ Ollama │ │
│  │ Client   │ │ Client   │ │ Client   │ │ Client │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
└─────────────────────────────────────────────────────┘
```

**Chrome Extension Adaptation:**

```typescript
// background/ai-core/index.ts
export class AiCoreService {
  private middlewares: Middleware[] = [];
  private clients: Map<string, ApiClient> = new Map();

  async executeCompletion(params: CompletionParams): Promise<CompletionResult> {
    const context = this.createContext(params);

    // Run through middleware chain
    for (const middleware of this.middlewares) {
      await middleware.process(context);
      if (context.aborted) break;
    }

    return context.result;
  }

  registerClient(providerId: string, client: ApiClient) {
    this.clients.set(providerId, client);
  }

  registerMiddleware(middleware: Middleware) {
    this.middlewares.push(middleware);
  }
}
```

### 2.3 State Management (Redux + Persist)

**Store Slices:**
```typescript
// Chrome extension store structure
const store = {
  assistants: AssistantsState,    // Custom assistant configs
  llm: LlmState,                  // Model/provider settings
  settings: SettingsState,        // App preferences
  knowledge: KnowledgeState,      // Document embeddings
  memory: MemoryState,            // Conversation memory
  mcp: McpState,                  // MCP server configs
  websearch: WebSearchState,      // Search provider settings
};

// Persistence strategy (exclude ephemeral data)
const persistConfig = {
  key: 'btcp-chrome',
  storage: chromeStorage,  // chrome.storage.local
  blacklist: ['messages', 'activeStreams'],
};
```

### 2.4 MCP (Model Context Protocol) Integration

Cherry Studio has built-in MCP support:

```typescript
interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  timeout: number;
  disabledTools: string[];
}

// Built-in MCP servers
const BUILTIN_MCP_SERVERS = [
  'memory',
  'sequential-thinking',
  'brave-search',
  'fetch',
  'filesystem',
  'python',
  'browser'  // ← Our BTCP extension provides this!
];
```

---

## 3. Custom App Architecture (MinApps)

### 3.1 MinApp Concept

MinApps are lightweight, embeddable tools within Cherry Studio. For Chrome extension:

```typescript
interface MinApp {
  id: string;
  name: string;
  icon: string;
  description: string;
  component: React.ComponentType;
  permissions: MinAppPermission[];
  config?: MinAppConfig;
}

type MinAppPermission =
  | 'tabs'          // Access browser tabs
  | 'history'       // Read browser history
  | 'bookmarks'     // Access bookmarks
  | 'storage'       // Local storage
  | 'activeTab'     // Current tab access
  | 'ai'            // AI model access
  | 'network';      // Network requests

interface MinAppConfig {
  defaultModel?: string;
  systemPrompt?: string;
  tools?: string[];
}
```

### 3.2 Proposed Chrome Extension MinApps

| MinApp | Purpose | Implementation |
|--------|---------|---------------|
| **Page Summarizer** | Summarize current page | Content script + AI |
| **Tab Manager** | AI-powered tab organization | Tabs API + embeddings |
| **Quick Translate** | Selection translation | Context menu + API |
| **Code Explainer** | Explain selected code | Content script + model |
| **Form Filler** | AI-assisted form completion | Content script + DOM |
| **Screenshot Chat** | Chat about screenshots | Capture + vision model |
| **Research Assistant** | Multi-tab research | Tab groups + RAG |

### 3.3 MinApp Registry Pattern

```typescript
// background/minApps/registry.ts
class MinAppRegistry {
  private apps: Map<string, MinApp> = new Map();

  register(app: MinApp) {
    this.validatePermissions(app.permissions);
    this.apps.set(app.id, app);
  }

  async execute(appId: string, context: ExecutionContext) {
    const app = this.apps.get(appId);
    if (!app) throw new Error(`MinApp ${appId} not found`);

    // Check permissions
    const granted = await this.checkPermissions(app.permissions);
    if (!granted) throw new Error('Permissions denied');

    return app.execute(context);
  }
}
```

---

## 4. Custom Models System

### 4.1 Provider Architecture

Cherry Studio supports 20+ providers through a unified interface:

```typescript
interface Provider {
  id: string;
  name: string;
  type: 'cloud' | 'local' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  models: Model[];
  capabilities: ProviderCapability[];
}

interface Model {
  id: string;
  name: string;
  provider: string;
  capabilities: ModelCapability[];
  pricing?: {
    input: number;   // per 1M tokens
    output: number;  // per 1M tokens
  };
  contextLength: number;
  endpoint_type: 'openai' | 'anthropic' | 'google' | 'custom';
}

type ModelCapability =
  | 'text'
  | 'vision'
  | 'embedding'
  | 'reasoning'
  | 'function_calling'
  | 'web_search'
  | 'rerank';
```

### 4.2 Supported Providers

**Cloud Providers:**
- OpenAI (GPT-4o, o1, etc.)
- Anthropic (Claude 3.5, 4)
- Google (Gemini Pro, Flash)
- Azure OpenAI
- AWS Bedrock
- Vertex AI
- Mistral
- Perplexity
- OpenRouter
- Cerebras
- XAI (Grok)

**Local Providers:**
- Ollama
- LM Studio
- GPUStack

**Custom Providers:**
- Any OpenAI-compatible API
- Custom endpoints

### 4.3 Chrome Extension Model Configuration

```typescript
// options/models/CustomModelForm.tsx
interface CustomModelConfig {
  name: string;
  provider: 'openai-compatible' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;

  // Optional overrides
  headers?: Record<string, string>;
  contextLength?: number;
  capabilities?: ModelCapability[];

  // Pricing (for usage tracking)
  pricing?: {
    input: number;
    output: number;
  };
}

// Validation schema (Zod)
const customModelSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(['openai-compatible', 'custom']),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  headers: z.record(z.string()).optional(),
  contextLength: z.number().positive().optional(),
  capabilities: z.array(z.enum([
    'text', 'vision', 'embedding', 'reasoning',
    'function_calling', 'web_search', 'rerank'
  ])).optional(),
});
```

### 4.4 Model Selection UI Pattern

```typescript
// components/ModelSelector.tsx
interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  filter?: {
    capabilities?: ModelCapability[];
    providers?: string[];
  };
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  filter
}) => {
  const { providers, models } = useModels();

  const filteredModels = useMemo(() => {
    return models.filter(model => {
      if (filter?.capabilities) {
        return filter.capabilities.every(cap =>
          model.capabilities.includes(cap)
        );
      }
      if (filter?.providers) {
        return filter.providers.includes(model.provider);
      }
      return true;
    });
  }, [models, filter]);

  return (
    <Select value={value} onChange={onChange}>
      {providers.map(provider => (
        <OptGroup key={provider.id} label={provider.name}>
          {filteredModels
            .filter(m => m.provider === provider.id)
            .map(model => (
              <Option key={model.id} value={model.id}>
                <ModelIdWithTags model={model} />
              </Option>
            ))
          }
        </OptGroup>
      ))}
    </Select>
  );
};
```

---

## 5. Implementation Recommendations

### 5.1 Phase 1: Core Infrastructure

1. **Adapt aiCore architecture** for background script
2. **Implement provider adapters** (start with OpenAI-compatible)
3. **Set up Redux store** with chrome.storage persistence
4. **Build model selector component**

### 5.2 Phase 2: UI Components

1. **Port essential components** (ModelSelector, CodeViewer, MarkdownRenderer)
2. **Implement chat interface** in sidepanel
3. **Create settings/options page** for model configuration
4. **Add assistant management**

### 5.3 Phase 3: Advanced Features

1. **Custom model support** with validation
2. **MinApp framework** for extensibility
3. **Knowledge base integration** (leverage existing semantic search)
4. **MCP server discovery** (connect to Cherry Studio MCP servers)

### 5.4 Chrome-Specific Considerations

| Cherry Studio Feature | Chrome Extension Adaptation |
|----------------------|----------------------------|
| Electron IPC | Chrome messaging API |
| Node.js file system | File System Access API |
| SQLite (Drizzle) | IndexedDB (Dexie) |
| Electron Store | chrome.storage.local/sync |
| Desktop notifications | chrome.notifications API |
| System tray | Browser action badge |
| Multiple windows | Tabs + sidepanel |

### 5.5 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│  Popup                    │  Sidepanel                       │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐ │
│  │ Quick Actions       │  │  │ Full Chat Interface         │ │
│  │ • Model Selector    │  │  │ • Messages List             │ │
│  │ • MinApp Launcher   │  │  │ • Input Bar                 │ │
│  │ • Assistant Picker  │  │  │ • Assistant Config          │ │
│  └─────────────────────┘  │  └─────────────────────────────┘ │
├───────────────────────────┴─────────────────────────────────┤
│                     Background Script                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ AiCore      │ │ Provider    │ │ MinApp Registry         │ │
│  │ Service     │ │ Adapters    │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ Redux Store │ │ Message     │ │ BTCP Client             │ │
│  │ (Persist)   │ │ Queue       │ │ (Browser Tools)         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Offscreen Document                       │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Transformers.js • Embeddings • WASM SIMD                │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Content Scripts                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Page Interaction • DOM Extraction • Form Filling        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Key Takeaways

### From Cherry Studio to Chrome Extension:

1. **Multi-model architecture is essential** - Support for 20+ providers through unified interface
2. **Middleware pattern is powerful** - Enables logging, abort handling, tool calling without coupling
3. **Assistant presets add value** - Pre-configured personas increase usability
4. **MinApps provide extensibility** - Lightweight embedded tools for specific tasks
5. **State persistence is critical** - Cross-session continuity via chrome.storage
6. **MCP integration is native** - Cherry Studio already supports MCP, enabling bidirectional communication

### Unique Chrome Extension Advantages:

- **Real browser context** - Access to actual tabs, history, bookmarks
- **Content script injection** - Deep page interaction
- **Native browser APIs** - Screenshots, notifications, downloads
- **Service worker persistence** - Always-on background processing
- **Cross-site operation** - Work across any website

---

## References

- Cherry Studio GitHub: https://github.com/CherryHQ/cherry-studio
- Cherry Studio Docs: https://cherry-ai.com/
- MCP Specification: https://modelcontextprotocol.io/
