# BTCP Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue.svg)](https://www.typescriptlang.org/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://developer.chrome.com/docs/extensions/)

> **Turn your Chrome browser into an AI-controlled automation tool** - Let AI assistants take control of your browser using the Browser Tool Calling Protocol (BTCP).

**Documentation**: [English](README.md) | [Migration Guide](docs/MIGRATION-TO-BTCP-CLIENT.md)

---

## What is BTCP Chrome?

BTCP Chrome is a Chrome extension that exposes browser automation tools to AI assistants using the **Browser Tool Calling Protocol (BTCP)**. Unlike traditional browser automation tools (like Playwright), it uses your actual Chrome browser with existing login states, configurations, and user data.

The extension connects to a [BTCP Server](https://github.com/browser-tool-calling-protocol/btcp-server) which acts as a broker between AI agents and browser tools.

## Architecture

```
AI Agent ─── HTTP/SSE ───► BTCP Server ◄─── HTTP/SSE ─── Chrome Extension
              (POST)         (Broker)         (SSE/POST)    (btcp-client)
```

- **Chrome Extension** acts as a tool provider, registering 20+ browser automation tools
- **BTCP Server** (external) brokers communication between AI agents and tools
- **AI Agent** discovers and invokes tools through the BTCP server

## Core Features

- **Use Your Actual Browser**: Seamlessly integrate with your existing browser environment (configurations, login states, cookies)
- **Chatbot/Model Agnostic**: Works with any AI agent that supports BTCP
- **No Native Server Required**: Pure extension-based architecture using HTTP/SSE
- **20+ Browser Tools**: Screenshots, navigation, interaction, network monitoring, semantic search, and more
- **Semantic Search**: Built-in vector database for intelligent tab content discovery
- **SIMD-Accelerated AI**: Custom WebAssembly SIMD optimization for faster vector operations
- **Auto-Reconnect**: Resilient connection with exponential backoff

## Comparison with Playwright-based Solutions

| Aspect | Playwright-based | BTCP Chrome Extension |
|--------|------------------|----------------------|
| **Resource Usage** | Requires launching separate browser process | Uses your existing Chrome browser |
| **User Session** | Requires re-login | Automatically uses existing login state |
| **Browser Environment** | Clean environment, no user settings | Fully preserves user environment |
| **API Access** | Limited to Playwright API | Full access to Chrome native APIs |
| **Startup Speed** | Requires launching browser | Only needs extension activation |

## Quick Start

### Prerequisites

- Chrome/Chromium browser
- A running [BTCP Server](https://github.com/browser-tool-calling-protocol/btcp-server) instance

### Installation

1. **Download the Chrome extension** from the [releases page](https://github.com/browser-tool-calling-protocol/btcp-chrome/releases)

2. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the downloaded extension folder

3. **Connect to BTCP Server**
   - Click the extension icon to open the popup
   - Enter your BTCP server URL (default: `http://localhost:3000`)
   - Click "Connect"

The extension will automatically register all available tools with the BTCP server.

## Available Tools

Complete tool list: [TOOLS.md](docs/TOOLS.md)

<details>
<summary><strong>Browser Management (6 tools)</strong></summary>

- `get_windows_and_tabs` - List all browser windows and tabs
- `chrome_navigate` - Navigate to URLs and control viewport
- `chrome_switch_tab` - Switch the current active tab
- `chrome_close_tabs` - Close specific tabs or windows
- `chrome_go_back_or_forward` - Browser navigation control
- `chrome_inject_script` - Inject content scripts into web pages
- `chrome_send_command_to_inject_script` - Send commands to injected content scripts
</details>

<details>
<summary><strong>Screenshots & Visual (1 tool)</strong></summary>

- `chrome_screenshot` - Advanced screenshot capture with element targeting, full-page support, and custom dimensions
</details>

<details>
<summary><strong>Network Monitoring (4 tools)</strong></summary>

- `chrome_network_capture_start/stop` - webRequest API network capture
- `chrome_network_debugger_start/stop` - Debugger API with response bodies
- `chrome_network_request` - Send custom HTTP requests
</details>

<details>
<summary><strong>Content Analysis (4 tools)</strong></summary>

- `search_tabs_content` - AI-powered semantic search across browser tabs
- `chrome_get_web_content` - Extract HTML/text content from pages
- `chrome_get_interactive_elements` - Find clickable elements
- `chrome_console` - Capture and retrieve console output from browser tabs
</details>

<details>
<summary><strong>Interaction (3 tools)</strong></summary>

- `chrome_click_element` - Click elements using CSS selectors
- `chrome_fill_or_select` - Fill forms and select options
- `chrome_keyboard` - Simulate keyboard input and shortcuts
</details>

<details>
<summary><strong>Data Management (5 tools)</strong></summary>

- `chrome_history` - Search browser history with time filters
- `chrome_bookmark_search` - Find bookmarks by keywords
- `chrome_bookmark_add` - Add new bookmarks with folder support
- `chrome_bookmark_delete` - Delete bookmarks
</details>

## Development

### Build Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Build individual packages
pnpm build:shared      # Build shared types/tools package
pnpm build:extension   # Build Chrome extension
pnpm build:wasm        # Build Rust SIMD WebAssembly module

# Development mode
pnpm dev               # Run all packages in watch mode
```

### Testing

```bash
cd app/chrome-extension
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
```

### Project Structure

```
packages/
├── shared/           # Tool schemas, types, constants
└── wasm-simd/        # Rust SIMD-optimized vector math (WebAssembly)

app/
└── chrome-extension/ # Vue 3 extension (WXT framework)
    └── entrypoints/
        └── background/
            ├── btcp-client.ts       # BTCP client connection
            ├── btcp-tool-adapter.ts # Tool adapter layer
            └── tools/               # Tool implementations
```

## Usage Examples

### AI summarizes webpage and draws diagram in Excalidraw

Prompt: [excalidraw-prompt](prompt/excalidraw-prompt.md)

https://github.com/user-attachments/assets/fd17209b-303d-48db-9e5e-3717141df183

### AI analyzes and replicates images in Excalidraw

Prompt: [excalidraw-prompt](prompt/excalidraw-prompt.md) | [content-analyze](prompt/content-analize.md)

https://github.com/user-attachments/assets/60d12b1a-9b74-40f4-994c-95e8fa1fc8d3

### AI modifies webpage styles and removes ads

Prompt: [modify-web-prompt](prompt/modify-web.md)

https://github.com/user-attachments/assets/69cb561c-2e1e-4665-9411-4a3185f9643e

### AI captures network requests

Query: What is the search API for Xiaohongshu and what does the response look like?

https://github.com/user-attachments/assets/dc7e5cab-b9af-4b9a-97ce-18e4837318d9

### AI analyzes browsing history

Query: Analyze my browsing history from the past month

https://github.com/user-attachments/assets/31b2e064-88c6-4adb-96d7-50748b826eae

### Web page conversation

Query: Translate and summarize the current web page

https://github.com/user-attachments/assets/aa8ef2a1-2310-47e6-897a-769d85489396

### AI takes screenshots

Query: Take a screenshot of Hugging Face's homepage

https://github.com/user-attachments/assets/65c6eee2-6366-493d-a3bd-2b27529ff5b3

### AI manages bookmarks

Query: Add the current page to bookmarks and put it in an appropriate folder

https://github.com/user-attachments/assets/15a7d04c-0196-4b40-84c2-bafb5c26dfe0

### AI closes tabs

Query: Close all shadcn-related web pages

https://github.com/user-attachments/assets/83de4008-bb7e-494d-9b0f-98325cfea592

## Related Projects

- [BTCP Server](https://github.com/browser-tool-calling-protocol/btcp-server) - The BTCP message broker
- [BTCP Client](https://github.com/browser-tool-calling-protocol/btcp-client) - Client library for tool providers
- [BTCP Specification](https://github.com/browser-tool-calling-protocol/spec) - Protocol specification

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](docs/CONTRIBUTING.md) for guidelines.

## Roadmap

- [ ] Authentication
- [ ] Recording and Playback
- [ ] Workflow Automation
- [ ] Firefox Extension Support

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Documentation

- [Architecture Design](docs/ARCHITECTURE.md) - Technical architecture documentation
- [Tools API](docs/TOOLS.md) - Complete tool API documentation
- [Migration Guide](docs/MIGRATION-TO-BTCP-CLIENT.md) - Migration from MCP to BTCP
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issue solutions
