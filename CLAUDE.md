# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome MCP Server is a Chrome extension-based Model Context Protocol (MCP) server that enables AI assistants to control and automate Chrome browsers. Unlike Playwright-based solutions, it uses the user's actual browser with existing login states and configurations.

## Build Commands

```bash
# Install dependencies
pnpm install

# Build all packages (shared → native → extension)
pnpm build

# Build individual packages
pnpm build:shared      # Build shared types/tools package first
pnpm build:native      # Build native server (requires shared)
pnpm build:extension   # Build Chrome extension (requires shared)
pnpm build:wasm        # Build Rust SIMD WebAssembly module

# Development mode
pnpm dev               # Run all packages in watch mode
pnpm dev:shared        # Watch shared package
pnpm dev:native        # Watch native server
pnpm dev:extension     # Watch Chrome extension (WXT dev server)
```

## Testing

```bash
# Chrome extension tests (Vitest)
cd app/chrome-extension
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm vitest run tests/record-replay-v3/trigger-manager.test.ts  # Single test file

# Native server tests (Jest)
cd app/native-server
pnpm test              # Run all tests with coverage
pnpm test:watch        # Watch mode
```

## Linting and Formatting

```bash
pnpm lint              # Run ESLint across all packages
pnpm lint:fix          # Auto-fix lint issues
pnpm format            # Run Prettier
```

## Architecture

### Monorepo Structure

```
packages/
├── shared/           # chrome-mcp-shared: Tool schemas, MCP types, constants
└── wasm-simd/        # Rust SIMD-optimized vector math (WebAssembly)

app/
├── native-server/    # mcp-chrome-bridge: MCP server + native messaging host
└── chrome-extension/ # chrome-mcp-server: Vue 3 extension (WXT framework)
```

### Communication Flow

```
AI Client (Claude/etc) ─── HTTP/SSE ───► Native Server ─── Native Messaging ───► Chrome Extension
                         (port 12306)     (Fastify)                              (Background Script)
```

1. **AI Client** connects via MCP protocol to `http://127.0.0.1:12306/mcp`
2. **Native Server** (`app/native-server`) receives tool calls and routes them through Chrome's native messaging
3. **Chrome Extension** (`app/chrome-extension`) executes browser operations via Chrome APIs

### Key Components

**Native Server (`app/native-server/src/`)**

- `native-messaging-host.ts` - Chrome native messaging protocol implementation
- `server/` - Fastify HTTP server for MCP over HTTP/SSE
- `mcp/` - MCP protocol handlers (stdio and HTTP modes)
- `agent/` - Claude Agent SDK integration for AI chat features

**Chrome Extension (`app/chrome-extension/entrypoints/`)**

- `background/` - Main orchestrator: native-host communication, tool execution, semantic search
- `background/tools/` - Browser automation tool implementations (20+ tools)
- `sidepanel/` - Workflow management UI and agent chat
- `popup/` - Extension popup interface
- `offscreen/` - Isolated context for AI model inference
- `web-editor-v2/` - Visual flow editor for automations

**Shared Package (`packages/shared/src/`)**

- `tools.ts` - Tool schemas with Zod validation
- `types.ts` - Native messaging and MCP type definitions
- `node-spec.ts` - Record/replay workflow node specifications

### Adding New Tools

1. Define schema in `packages/shared/src/tools.ts`
2. Implement tool in `app/chrome-extension/entrypoints/background/tools/browser/`
3. Register in tool index at `app/chrome-extension/entrypoints/background/tools/index.ts`

### Semantic Search Architecture

The extension includes an AI-powered semantic search engine:

- **Model**: Runs Transformers.js models (e.g., multilingual-e5-small) in Web Workers
- **Vector DB**: HNSW index via `hnswlib-wasm-static` stored in IndexedDB
- **SIMD Acceleration**: Rust-compiled WebAssembly (`packages/wasm-simd`) for 4-8x faster cosine similarity

### Native Messaging Protocol

Messages between native server and extension use Chrome's native messaging with JSON-encoded payloads:

- Request: `{ type: 'TOOL_CALL', toolName: string, params: object, requestId: string }`
- Response: `{ requestId: string, result?: object, error?: string }`

## File Conventions

- Extension uses WXT framework conventions (`entrypoints/`, `public/`, etc.)
- Tool implementations extend `BaseBrowserToolExecutor` pattern
- Shared types use Zod schemas for runtime validation
- Native server uses Fastify with TypeScript
