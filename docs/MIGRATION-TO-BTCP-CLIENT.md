# Migration Guide: btcp-chrome to BTCP Client Architecture

This document outlines the migration strategy for transitioning btcp-chrome from the current MCP (Model Context Protocol) over native messaging architecture to use the [btcp-client](https://github.com/browser-tool-calling-protocol/btcp-client) library and BTCP (Browser Tool Calling Protocol).

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Comparison](#architecture-comparison)
3. [Migration Phases](#migration-phases)
4. [Implementation Details](#implementation-details)
5. [API Mapping](#api-mapping)
6. [Code Examples](#code-examples)
7. [Migration Checklist](#migration-checklist)

---

## Executive Summary

### Current State

```
AI Client (Claude) ─── MCP/HTTP ───► Native Server ─── Native Messaging ───► Chrome Extension
                    (port 12306)    (Fastify)         (Background Script)
```

The current architecture uses:
- **MCP Protocol** over HTTP/SSE for AI client communication
- **Native Messaging** for Chrome extension communication
- **Native Server** as an intermediary bridge

### Target State

```
AI Agent ─── HTTP Streaming ───► BTCP Server ◄─── HTTP Streaming ─── Chrome Extension
              (POST/SSE)          (Broker)           (SSE/POST)        (btcp-client)
```

The new architecture:
- **Chrome Extension** becomes a pure tool provider shell using btcp-client
- **BTCP Server** (external, to be implemented) acts as the message broker
- **AI Agent** connects to BTCP Server to discover and invoke tools
- **No Native Messaging** - uses HTTP streaming (SSE) instead

### Key Benefits

| Aspect | Current | Target |
|--------|---------|--------|
| Extension Role | Full tool implementation + native host | Thin shell with btcp-client |
| Communication | Native Messaging (Chrome-specific) | HTTP Streaming (universal) |
| Protocol | MCP | BTCP (JSON-RPC 2.0) |
| Server | Required native server binary | Standard HTTP BTCP server |
| Cross-browser | Chrome only | Any browser supporting extensions |

---

## Architecture Comparison

### Current Architecture (MCP + Native Messaging)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CURRENT ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    MCP/HTTP     ┌─────────────────────┐              │
│  │   AI Client  │ ◄─────────────► │   Native Server     │              │
│  │   (Claude)   │   port 12306    │  (mcp-chrome-bridge) │              │
│  └──────────────┘                 └──────────┬──────────┘              │
│                                              │                          │
│                                    Native Messaging                     │
│                                              │                          │
│                                              ▼                          │
│                          ┌───────────────────────────────────┐         │
│                          │        Chrome Extension           │         │
│                          │    (chrome-mcp-server)            │         │
│                          │                                   │         │
│                          │  ┌─────────────────────────────┐ │         │
│                          │  │   Background Script          │ │         │
│                          │  │   - native-host.ts           │ │         │
│                          │  │   - tools/index.ts           │ │         │
│                          │  │   - BaseBrowserToolExecutor  │ │         │
│                          │  └─────────────┬───────────────┘ │         │
│                          │                │                  │         │
│                          │                ▼                  │         │
│                          │  ┌─────────────────────────────┐ │         │
│                          │  │   Content Scripts            │ │         │
│                          │  │   - click-helper.js          │ │         │
│                          │  │   - accessibility-tree.js    │ │         │
│                          │  │   - etc.                     │ │         │
│                          │  └─────────────────────────────┘ │         │
│                          └───────────────────────────────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Target Architecture (BTCP)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TARGET ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐                ┌──────────────┐                      │
│  │   AI Agent   │   HTTP POST    │              │    SSE Events        │
│  │   (Claude)   │ ──────────────►│  BTCP Server │◄───────────────────┐ │
│  │              │◄────────────── │   (Broker)   │                    │ │
│  └──────────────┘   SSE Events   │              │    HTTP POST       │ │
│                                  └──────────────┘────────────────┐   │ │
│                                                                  │   │ │
│                                                                  ▼   │ │
│                          ┌───────────────────────────────────────────┐ │
│                          │        Chrome Extension (Shell)           │ │
│                          │                                           │ │
│                          │  ┌─────────────────────────────────────┐ │ │
│                          │  │   Background Script                  │ │ │
│                          │  │                                      │ │ │
│                          │  │  ┌───────────────────────────────┐  │ │ │
│                          │  │  │   btcp-client (BTCPClient)    │  │ │ │
│                          │  │  │   - connect()                 │  │ │ │
│                          │  │  │   - registerTools()           │  │ │ │
│                          │  │  │   - getExecutor()             │  │ │ │
│                          │  │  └───────────────────────────────┘  │ │ │
│                          │  │                │                     │ │ │
│                          │  │                ▼                     │ │ │
│                          │  │  ┌───────────────────────────────┐  │ │ │
│                          │  │  │   Tool Executor Adapter       │  │ │ │
│                          │  │  │   (wraps existing tools)      │  │ │ │
│                          │  │  └───────────────────────────────┘  │ │ │
│                          │  │                │                     │ │ │
│                          │  └────────────────┼─────────────────────┘ │ │
│                          │                   ▼                       │ │
│                          │  ┌─────────────────────────────────────┐ │ │
│                          │  │   Content Scripts (unchanged)       │ │ │
│                          │  └─────────────────────────────────────┘ │ │
│                          └───────────────────────────────────────────┘ │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Migration Phases

### Phase 1: Add btcp-client Dependency

**Goal:** Integrate btcp-client into the Chrome extension without breaking existing functionality.

**Tasks:**
1. Add `@browser-tool-calling-protocol/btcp-client` as a dependency
2. Create a new BTCP client module alongside existing native host
3. Implement connection management with auto-reconnect

**Duration indicator:** Foundation work - should be completed first

### Phase 2: Create Tool Adapter Layer

**Goal:** Create an adapter that maps existing tool implementations to BTCP's ToolExecutor interface.

**Tasks:**
1. Create `BTCPToolAdapter` class that wraps existing tools
2. Convert `TOOL_SCHEMAS` to `BTCPToolDefinition` format
3. Implement tool handler registration with btcp-client

**Duration indicator:** Core integration work

### Phase 3: Implement Dual-Mode Operation

**Goal:** Support both MCP (native messaging) and BTCP modes simultaneously.

**Tasks:**
1. Add configuration toggle for connection mode
2. Implement feature flag for BTCP mode
3. Test both modes in parallel

**Duration indicator:** Compatibility work

### Phase 4: Deprecate Native Messaging

**Goal:** Remove native messaging dependency and native server requirement.

**Tasks:**
1. Mark native messaging as deprecated
2. Update documentation
3. Provide migration path for existing users

**Duration indicator:** Cleanup work

### Phase 5: Full BTCP Migration

**Goal:** Chrome extension operates purely as a BTCP tool provider shell.

**Tasks:**
1. Remove native messaging code
2. Remove native server from monorepo (or repurpose as BTCP server)
3. Simplify extension architecture

**Duration indicator:** Final phase

---

## Implementation Details

### 1. Package Structure Changes

```
btcp-chrome/
├── packages/
│   ├── shared/                    # KEEP: Tool schemas (convert to BTCP format)
│   └── wasm-simd/                 # KEEP: SIMD acceleration
│
├── app/
│   ├── native-server/             # DEPRECATE: No longer needed
│   │                              # OR: Convert to BTCP server reference implementation
│   │
│   └── chrome-extension/
│       └── entrypoints/
│           └── background/
│               ├── native-host.ts       # DEPRECATE
│               ├── btcp-client.ts       # NEW: BTCP client integration
│               ├── btcp-tool-adapter.ts # NEW: Tool adapter layer
│               └── tools/               # KEEP: Tool implementations
│                   ├── index.ts         # MODIFY: Export for BTCP adapter
│                   ├── base-browser.ts  # KEEP: Base executor
│                   └── browser/*.ts     # KEEP: Individual tools
```

### 2. New Files to Create

#### `app/chrome-extension/entrypoints/background/btcp-client.ts`

```typescript
import { BTCPClient, BTCPClientConfig, BTCPToolDefinition } from '@browser-tool-calling-protocol/btcp-client';
import { createBTCPToolAdapter } from './btcp-tool-adapter';
import { BTCP_TOOL_DEFINITIONS } from './btcp-tool-definitions';

interface BTCPConnectionConfig {
  serverUrl: string;
  sessionId?: string;
  autoReconnect?: boolean;
  debug?: boolean;
}

let client: BTCPClient | null = null;

export async function initializeBTCPClient(config: BTCPConnectionConfig): Promise<void> {
  const clientConfig: BTCPClientConfig = {
    serverUrl: config.serverUrl,
    sessionId: config.sessionId,
    autoReconnect: config.autoReconnect ?? true,
    reconnectDelay: 1000,
    maxReconnectAttempts: 10,
    connectionTimeout: 30000,
    debug: config.debug ?? false,
  };

  client = new BTCPClient(clientConfig);

  // Set up event listeners
  client.on('connected', () => {
    console.log('[BTCP] Connected to server');
    registerTools();
  });

  client.on('disconnected', () => {
    console.log('[BTCP] Disconnected from server');
  });

  client.on('error', (error) => {
    console.error('[BTCP] Error:', error);
  });

  // Connect to server
  await client.connect();
}

async function registerTools(): Promise<void> {
  if (!client) return;

  // Register tool definitions
  await client.registerTools(BTCP_TOOL_DEFINITIONS);

  // Set up tool executor with adapter
  const executor = client.getExecutor();
  const toolAdapter = createBTCPToolAdapter();

  // Register handler for each tool
  for (const tool of BTCP_TOOL_DEFINITIONS) {
    executor.registerHandler(tool.name, async (params) => {
      return await toolAdapter.execute(tool.name, params);
    });
  }

  console.log(`[BTCP] Registered ${BTCP_TOOL_DEFINITIONS.length} tools`);
}

export function getBTCPClient(): BTCPClient | null {
  return client;
}

export async function disconnectBTCPClient(): Promise<void> {
  if (client) {
    await client.disconnect();
    client = null;
  }
}
```

#### `app/chrome-extension/entrypoints/background/btcp-tool-adapter.ts`

```typescript
import { BTCPToolCallResponse, createTextContent, createImageContent } from '@browser-tool-calling-protocol/btcp-client';
import { handleCallTool } from './tools/index';
import type { ToolResult } from '@/common/tool-handler';

export interface BTCPToolAdapter {
  execute(toolName: string, params: Record<string, unknown>): Promise<BTCPToolCallResponse>;
}

export function createBTCPToolAdapter(): BTCPToolAdapter {
  return {
    async execute(toolName: string, params: Record<string, unknown>): Promise<BTCPToolCallResponse> {
      try {
        // Call existing tool implementation
        const result: ToolResult = await handleCallTool({
          name: toolName,
          args: params,
        });

        // Convert MCP ToolResult to BTCP response format
        return convertToBTCPResponse(result);
      } catch (error) {
        return {
          content: [createTextContent(`Error executing tool: ${error instanceof Error ? error.message : String(error)}`)],
          isError: true,
        };
      }
    },
  };
}

function convertToBTCPResponse(mcpResult: ToolResult): BTCPToolCallResponse {
  // MCP and BTCP have similar content structures
  const content = mcpResult.content.map((item) => {
    if (item.type === 'text') {
      return createTextContent(item.text);
    } else if (item.type === 'image') {
      return createImageContent(item.data, item.mimeType);
    }
    // Handle other content types as needed
    return createTextContent(JSON.stringify(item));
  });

  return {
    content,
    isError: mcpResult.isError,
  };
}
```

#### `app/chrome-extension/entrypoints/background/btcp-tool-definitions.ts`

```typescript
import { BTCPToolDefinition, JsonSchema } from '@browser-tool-calling-protocol/btcp-client';
import { TOOL_SCHEMAS } from 'chrome-mcp-shared';

/**
 * Convert MCP tool schemas to BTCP tool definitions
 */
export function convertMCPToBTCPToolDefinitions(): BTCPToolDefinition[] {
  return TOOL_SCHEMAS.map((mcpTool) => ({
    name: mcpTool.name,
    description: mcpTool.description,
    inputSchema: mcpTool.inputSchema as JsonSchema,
    // Add examples if available
    examples: generateToolExamples(mcpTool.name),
  }));
}

function generateToolExamples(toolName: string): BTCPToolDefinition['examples'] {
  // Tool-specific examples for better AI understanding
  const exampleMap: Record<string, BTCPToolDefinition['examples']> = {
    chrome_navigate: [
      {
        name: 'Navigate to URL',
        params: { url: 'https://example.com' },
        description: 'Navigate to a specific URL in the current tab',
      },
    ],
    chrome_click_element: [
      {
        name: 'Click by selector',
        params: { selector: 'button.submit' },
        description: 'Click an element using CSS selector',
      },
      {
        name: 'Click by ref',
        params: { ref: 'e1' },
        description: 'Click an element using accessibility tree reference',
      },
    ],
    // Add more examples for other tools
  };

  return exampleMap[toolName] || [];
}

export const BTCP_TOOL_DEFINITIONS = convertMCPToBTCPToolDefinitions();
```

### 3. Files to Modify

#### `app/chrome-extension/entrypoints/background/index.ts`

```typescript
// Add BTCP client initialization
import { initializeBTCPClient, disconnectBTCPClient } from './btcp-client';

// Configuration from storage or environment
const BTCP_CONFIG = {
  serverUrl: 'http://localhost:3000', // BTCP server URL
  autoReconnect: true,
  debug: true,
};

// Feature flag for BTCP mode
const USE_BTCP_MODE = true; // Toggle this during migration

async function initialize() {
  if (USE_BTCP_MODE) {
    // Initialize BTCP client
    await initializeBTCPClient(BTCP_CONFIG);
  } else {
    // Existing native messaging initialization
    await initializeNativeHost();
  }
}

// Service worker lifecycle
chrome.runtime.onStartup.addListener(() => {
  initialize();
});

chrome.runtime.onInstalled.addListener(() => {
  initialize();
});
```

#### `app/chrome-extension/entrypoints/background/tools/index.ts`

```typescript
// Existing code - enhance exports for BTCP adapter

import * as browserTools from './browser';
import { flowRunTool, listPublishedFlowsTool } from './record-replay';
import type { ToolCallParam, ToolResult } from '@/common/tool-handler';

// Combine all tools
const tools = {
  ...browserTools,
  flowRunTool,
  listPublishedFlowsTool,
};

// Create tool lookup map
const toolsMap = new Map<string, { name: string; execute: (args: any) => Promise<ToolResult> }>(
  Object.values(tools).map((tool: any) => [tool.name, tool])
);

/**
 * Handle tool call - used by both native messaging and BTCP adapter
 */
export const handleCallTool = async (param: ToolCallParam): Promise<ToolResult> => {
  const tool = toolsMap.get(param.name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Tool ${param.name} not found` }],
      isError: true,
    };
  }

  return await tool.execute(param.args);
};

// NEW: Export tool registry for BTCP adapter
export const getRegisteredTools = () => Array.from(toolsMap.values());
export const getToolByName = (name: string) => toolsMap.get(name);
```

---

## API Mapping

### Tool Definition Mapping

| MCP (Current) | BTCP (Target) | Notes |
|---------------|---------------|-------|
| `name: string` | `name: string` | Direct mapping |
| `description: string` | `description: string` | Direct mapping |
| `inputSchema: object` | `inputSchema: JsonSchema` | Same JSON Schema format |
| N/A | `examples?: BTCPToolExample[]` | NEW: Add examples for better AI understanding |

### Tool Result Mapping

| MCP ToolResult | BTCP Response | Notes |
|----------------|---------------|-------|
| `content: TextContent[]` | `content: BTCPContent[]` | Similar structure |
| `content: ImageContent[]` | `content: BTCPContent[]` | Similar structure |
| `isError: boolean` | `isError: boolean` | Direct mapping |

### Message Protocol Mapping

| MCP Message | BTCP Message | Notes |
|-------------|--------------|-------|
| `CallToolRequest` | `tools/call` (JSON-RPC) | Different envelope |
| `CallToolResult` | `BTCPToolCallResponse` | Similar content |
| `ListToolsRequest` | `tools/list` (JSON-RPC) | Tool discovery |
| N/A | `tools/register` | NEW: Tools register with server |

---

## Code Examples

### Before: Native Messaging Flow

```typescript
// Native Server receives MCP call
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const result = await sendToExtension({
    type: 'call_tool',
    payload: { name: request.params.name, args: request.params.arguments },
  });
  return result;
});

// Extension handles native message
nativePort.onMessage.addListener(async (message) => {
  if (message.type === 'call_tool') {
    const result = await handleCallTool(message.payload);
    nativePort.postMessage({ responseToRequestId: message.requestId, payload: result });
  }
});
```

### After: BTCP Flow

```typescript
// Extension connects to BTCP server
const client = new BTCPClient({
  serverUrl: 'http://localhost:3000',
  autoReconnect: true,
});

await client.connect();
await client.registerTools(BTCP_TOOL_DEFINITIONS);

// Tool execution handled via executor
const executor = client.getExecutor();
executor.registerHandler('chrome_click_element', async (params) => {
  // Existing tool implementation
  const result = await clickTool.execute(params);
  return convertToBTCPResponse(result);
});
```

### Tool Implementation (Unchanged)

```typescript
// Existing tool implementations remain the same
class ClickTool extends BaseBrowserToolExecutor {
  name = TOOL_NAMES.BROWSER.CLICK;

  async execute(args: ClickToolParams): Promise<ToolResult> {
    const tab = await this.getActiveTabOrThrow();
    await this.injectContentScript(tab.id!, ['inject-scripts/click-helper.js']);

    const result = await this.sendMessageToTab(tab.id!, {
      action: TOOL_MESSAGE_TYPES.CLICK_ELEMENT,
      selector: args.selector,
    });

    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      isError: false,
    };
  }
}
```

---

## Migration Checklist

### Phase 1: Setup

- [ ] Add `@browser-tool-calling-protocol/btcp-client` to `app/chrome-extension/package.json`
- [ ] Create `btcp-client.ts` module
- [ ] Create `btcp-tool-adapter.ts` module
- [ ] Create `btcp-tool-definitions.ts` module
- [ ] Add BTCP server URL configuration to extension settings
- [ ] Update extension manifest if needed (CSP for HTTP connections)

### Phase 2: Integration

- [ ] Convert `TOOL_SCHEMAS` to `BTCPToolDefinition[]` format
- [ ] Implement `BTCPToolAdapter` wrapping existing tools
- [ ] Register all tools with btcp-client executor
- [ ] Test tool registration with BTCP server
- [ ] Test tool execution roundtrip

### Phase 3: Dual-Mode

- [ ] Add feature flag for BTCP vs native messaging mode
- [ ] Create configuration UI for server URL
- [ ] Test both modes work correctly
- [ ] Add telemetry for migration tracking
- [ ] Document dual-mode operation

### Phase 4: Deprecation

- [ ] Add deprecation warnings to native messaging code
- [ ] Update README and documentation
- [ ] Create user migration guide
- [ ] Set deprecation timeline

### Phase 5: Cleanup

- [ ] Remove `native-host.ts` and related code
- [ ] Remove `app/native-server/` or repurpose
- [ ] Remove native messaging permissions from manifest
- [ ] Update `packages/shared/` to use BTCP types
- [ ] Final testing and release

---

## BTCP Server Requirements

The Chrome extension will connect to a BTCP server. The server must implement:

### Required Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/events` | GET | SSE stream for server→client messages |
| `/message` | POST | Client→server message transmission |
| `/health` | GET | Health check |

### Query Parameters

- `sessionId`: Session identifier for routing
- `clientType`: `browser` or `agent`
- `version`: Protocol version

### Message Types

```typescript
// Tool Registration
{
  jsonrpc: '2.0',
  method: 'tools/register',
  params: {
    tools: BTCPToolDefinition[]
  },
  id: string
}

// Tool Call (server → browser)
{
  jsonrpc: '2.0',
  method: 'tools/call',
  params: {
    name: string,
    arguments: Record<string, unknown>
  },
  id: string
}

// Tool Response (browser → server)
{
  jsonrpc: '2.0',
  result: BTCPToolCallResponse,
  id: string
}
```

---

## Appendix: Complete File Tree After Migration

```
btcp-chrome/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── tools.ts              # Tool schemas (BTCP format)
│   │       ├── btcp-types.ts         # NEW: BTCP-specific types
│   │       ├── types.ts              # Shared types
│   │       └── constants.ts
│   └── wasm-simd/                    # Unchanged
│
├── app/
│   ├── btcp-server/                  # NEW: Reference BTCP server (optional)
│   │   └── src/
│   │       ├── index.ts
│   │       ├── session-manager.ts
│   │       └── message-broker.ts
│   │
│   └── chrome-extension/
│       ├── entrypoints/
│       │   ├── background/
│       │   │   ├── index.ts                 # Entry point
│       │   │   ├── btcp-client.ts           # NEW: BTCP client integration
│       │   │   ├── btcp-tool-adapter.ts     # NEW: Tool adapter
│       │   │   ├── btcp-tool-definitions.ts # NEW: Tool definitions
│       │   │   ├── native-host.ts           # DEPRECATED: Remove in Phase 5
│       │   │   └── tools/
│       │   │       ├── index.ts             # Tool router
│       │   │       ├── base-browser.ts      # Base executor
│       │   │       └── browser/             # Tool implementations
│       │   │           ├── common.ts
│       │   │           ├── interaction.ts
│       │   │           ├── screenshot.ts
│       │   │           └── ...
│       │   └── ...
│       └── ...
│
└── docs/
    ├── MIGRATION-TO-BTCP-CLIENT.md   # This document
    └── BTCP-SERVER-SPEC.md           # NEW: Server specification
```

---

## References

- [btcp-client Repository](https://github.com/browser-tool-calling-protocol/btcp-client)
- [Browser Tool Calling Protocol Specification](https://github.com/browser-tool-calling-protocol/spec)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
