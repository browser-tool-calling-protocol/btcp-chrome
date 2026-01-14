# Agent Browser Tools Specification

> Redesigned tool interface inspired by [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser)

This document specifies a new tool interface for the Chrome MCP Server that adopts the agent-browser command style for improved AI agent compatibility.

## Table of Contents

- [Design Principles](#design-principles)
- [Element Reference System](#element-reference-system)
- [Tool Categories](#tool-categories)
- [Complete Tool Reference](#complete-tool-reference)
- [Migration Guide](#migration-guide)

---

## Design Principles

### 1. Simple, Action-Based Naming

```
OLD: chrome_navigate, chrome_click_element, chrome_fill_or_select
NEW: navigate, click, fill
```

### 2. Consistent Parameter Naming

All tools use consistent parameter names:
- `selector` - CSS selector or `@ref` reference
- `tabId` - Target tab ID
- `timeout` - Operation timeout in milliseconds

### 3. Element References (`@ref`)

Every interactive element receives a stable reference ID (`@e1`, `@e2`, etc.) from the `snapshot` command that can be used in subsequent operations.

### 4. Semantic Locators

Built-in support for accessibility-based element finding:
- `role:button` - Find by ARIA role
- `text:Submit` - Find by visible text
- `label:Email` - Find by label
- `placeholder:Enter email` - Find by placeholder

### 5. Unified Response Format

All tools return consistent response structures:
```typescript
interface ToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

---

## Element Reference System

### How References Work

1. Call `snapshot` to capture the page's accessibility tree
2. Each interactive element receives a reference: `@e1`, `@e2`, `@e3`, etc.
3. Use these references in subsequent commands: `click @e3`, `fill @e5 "hello"`
4. References are tab-scoped and expire when the page changes significantly

### Reference Map Storage

```typescript
interface RefMapEntry {
  selector: string;       // CSS selector for element retrieval
  role: string;           // ARIA role (button, textbox, link, etc.)
  name: string;           // Accessible name
  index: number;          // Disambiguation index for duplicate role+name
  frameId?: number;       // Frame ID for iframe support
  boundingBox?: {         // Element position
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

### Selector Resolution Priority

1. `@ref` references (highest priority)
2. Semantic locators (`role:`, `text:`, `label:`, etc.)
3. CSS selectors
4. XPath expressions (prefix with `xpath=`)
5. Coordinates `{ x, y }`

---

## Tool Categories

| Category | Tools |
|----------|-------|
| **Snapshot & Query** | `snapshot`, `query`, `locator` |
| **Navigation** | `navigate`, `back`, `forward`, `reload`, `url`, `title` |
| **Interaction** | `click`, `dblclick`, `fill`, `type`, `press`, `hover`, `drag`, `scroll`, `upload` |
| **Forms** | `check`, `uncheck`, `select`, `clear`, `focus` |
| **Wait** | `wait` |
| **Tabs & Windows** | `tab_new`, `tab_list`, `tab_switch`, `tab_close`, `window_new` |
| **Storage** | `cookies`, `storage`, `auth_state` |
| **Network** | `request`, `capture`, `route` |
| **Media** | `screenshot`, `pdf`, `record` |
| **Emulation** | `viewport`, `device`, `geolocation`, `permissions` |
| **Execution** | `evaluate`, `console` |
| **Browser Data** | `history`, `bookmarks` |
| **Dialogs** | `dialog` |

---

## Complete Tool Reference

### Snapshot & Query Tools

#### `snapshot`

Capture an accessibility tree of the page with element references.

```typescript
{
  name: "snapshot",
  description: "Capture accessibility tree with element references (@e1, @e2, etc.) for subsequent interactions",
  inputSchema: {
    type: "object",
    properties: {
      // Filtering
      mode: {
        type: "string",
        enum: ["full", "interactive", "focused"],
        default: "full",
        description: "full: all elements, interactive: actionable elements only, focused: subtree from focused element"
      },
      depth: {
        type: "number",
        description: "Maximum tree depth (default: unlimited)"
      },

      // Scoping
      selector: {
        type: "string",
        description: "Scope to elements within this selector or @ref"
      },

      // Output control
      compact: {
        type: "boolean",
        default: false,
        description: "Compact output, filter unnamed containers"
      },
      include_text: {
        type: "boolean",
        default: true,
        description: "Include text content in output"
      },
      include_bounds: {
        type: "boolean",
        default: false,
        description: "Include bounding box coordinates"
      },

      // Targeting
      tabId: { type: "number" },
      frameId: { type: "number" }
    }
  }
}
```

**Output Format:**
```
Page: Example Domain (https://example.com)
Viewport: 1280x720

- document "Example Domain"
  - heading "Example Domain" [ref=@e1] [level=1]
  - paragraph: "This domain is for use in illustrative examples..."
  - link "More information..." [ref=@e2]
  - group "Navigation" [ref=@e3]
    - button "Home" [ref=@e4]
    - button "About" [ref=@e5]
    - textbox "Search" [ref=@e6] [placeholder="Search..."]
```

---

#### `query`

Query elements using semantic locators without capturing full snapshot.

```typescript
{
  name: "query",
  description: "Find elements using semantic locators (role, text, label, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      by: {
        type: "string",
        enum: ["role", "text", "label", "placeholder", "alt", "title", "testid"],
        description: "Locator strategy"
      },
      value: {
        type: "string",
        description: "Value to match"
      },
      options: {
        type: "object",
        properties: {
          exact: { type: "boolean", default: false, description: "Exact text match" },
          name: { type: "string", description: "For role: filter by accessible name" },
          level: { type: "number", description: "For role=heading: heading level" },
          checked: { type: "boolean", description: "For checkbox/radio: checked state" },
          pressed: { type: "boolean", description: "For button: pressed state" },
          expanded: { type: "boolean", description: "For expandable: expanded state" },
          include_hidden: { type: "boolean", default: false }
        }
      },
      nth: {
        type: "number",
        description: "Select nth match (0-indexed). Use -1 for last."
      },

      // What to return
      return: {
        type: "string",
        enum: ["ref", "count", "text", "attribute", "bounds", "all"],
        default: "ref",
        description: "What to return: ref (element reference), count, text content, attribute value, bounds, or all info"
      },
      attribute: {
        type: "string",
        description: "Attribute name when return=attribute"
      },

      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["by", "value"]
  }
}
```

**Examples:**
```json
// Find submit button
{ "by": "role", "value": "button", "options": { "name": "Submit" } }

// Find by text
{ "by": "text", "value": "Sign in", "options": { "exact": true } }

// Find email input by label
{ "by": "label", "value": "Email address" }

// Count all links
{ "by": "role", "value": "link", "return": "count" }

// Get text of first heading
{ "by": "role", "value": "heading", "nth": 0, "return": "text" }
```

---

#### `locator`

Create a locator chain for complex element selection.

```typescript
{
  name: "locator",
  description: "Create chained locator for complex element selection",
  inputSchema: {
    type: "object",
    properties: {
      chain: {
        type: "array",
        description: "Array of locator steps to chain",
        items: {
          type: "object",
          properties: {
            method: {
              type: "string",
              enum: ["role", "text", "label", "placeholder", "testid", "css", "xpath", "nth", "first", "last", "filter", "within"]
            },
            value: { type: "string" },
            options: { type: "object" }
          },
          required: ["method"]
        }
      },
      action: {
        type: "string",
        enum: ["get_ref", "click", "fill", "check", "hover"],
        description: "Optional action to perform on located element"
      },
      fill_value: {
        type: "string",
        description: "Value for fill action"
      },

      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["chain"]
  }
}
```

**Examples:**
```json
// Find button within a specific form
{
  "chain": [
    { "method": "role", "value": "form", "options": { "name": "Login" } },
    { "method": "within" },
    { "method": "role", "value": "button", "options": { "name": "Submit" } }
  ]
}

// Get second item in a list
{
  "chain": [
    { "method": "role", "value": "listitem" },
    { "method": "nth", "value": "1" }
  ]
}

// Filter buttons by text content
{
  "chain": [
    { "method": "role", "value": "button" },
    { "method": "filter", "options": { "hasText": "Save" } }
  ],
  "action": "click"
}
```

---

### Navigation Tools

#### `navigate`

Navigate to a URL or control browser history.

```typescript
{
  name: "navigate",
  description: "Navigate to URL, go back/forward, or reload",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to navigate to. Omit for back/forward/reload."
      },
      action: {
        type: "string",
        enum: ["goto", "back", "forward", "reload"],
        default: "goto",
        description: "Navigation action"
      },
      wait_until: {
        type: "string",
        enum: ["load", "domcontentloaded", "networkidle"],
        default: "load",
        description: "When to consider navigation complete"
      },
      timeout: {
        type: "number",
        default: 30000,
        description: "Navigation timeout in milliseconds"
      },

      // Window/tab control
      new_tab: {
        type: "boolean",
        default: false,
        description: "Open URL in new tab"
      },
      new_window: {
        type: "boolean",
        default: false,
        description: "Open URL in new window"
      },
      window_size: {
        type: "object",
        properties: {
          width: { type: "number", default: 1280 },
          height: { type: "number", default: 720 }
        }
      },
      background: {
        type: "boolean",
        default: false,
        description: "Don't focus the tab/window"
      },

      // Headers
      headers: {
        type: "object",
        description: "Extra HTTP headers for this navigation"
      },

      tabId: { type: "number" },
      windowId: { type: "number" }
    }
  }
}
```

---

#### `url`

Get current page URL.

```typescript
{
  name: "url",
  description: "Get current page URL",
  inputSchema: {
    type: "object",
    properties: {
      tabId: { type: "number" }
    }
  }
}
```

---

#### `title`

Get current page title.

```typescript
{
  name: "title",
  description: "Get current page title",
  inputSchema: {
    type: "object",
    properties: {
      tabId: { type: "number" }
    }
  }
}
```

---

### Interaction Tools

#### `click`

Click on an element.

```typescript
{
  name: "click",
  description: "Click on an element using @ref, selector, or coordinates",
  inputSchema: {
    type: "object",
    properties: {
      // Target (one of these required)
      selector: {
        type: "string",
        description: "@ref, CSS selector, or semantic locator (role:button, text:Submit, etc.)"
      },
      coordinates: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" }
        },
        description: "Click at specific coordinates"
      },

      // Click options
      button: {
        type: "string",
        enum: ["left", "right", "middle"],
        default: "left"
      },
      click_count: {
        type: "number",
        default: 1,
        description: "Number of clicks (2 for double-click)"
      },
      modifiers: {
        type: "array",
        items: {
          type: "string",
          enum: ["Alt", "Control", "Meta", "Shift"]
        },
        description: "Modifier keys to hold during click"
      },

      // Behavior
      force: {
        type: "boolean",
        default: false,
        description: "Force click even if element is not visible"
      },
      no_wait_after: {
        type: "boolean",
        default: false,
        description: "Don't wait for navigation after click"
      },
      timeout: {
        type: "number",
        default: 5000
      },

      tabId: { type: "number" },
      frameId: { type: "number" }
    }
  }
}
```

---

#### `dblclick`

Double-click on an element.

```typescript
{
  name: "dblclick",
  description: "Double-click on an element",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string" },
      coordinates: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" }
        }
      },
      modifiers: {
        type: "array",
        items: { type: "string", enum: ["Alt", "Control", "Meta", "Shift"] }
      },
      timeout: { type: "number", default: 5000 },
      tabId: { type: "number" },
      frameId: { type: "number" }
    }
  }
}
```

---

#### `hover`

Hover over an element.

```typescript
{
  name: "hover",
  description: "Hover over an element to trigger hover states",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string" },
      coordinates: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" }
        }
      },
      timeout: { type: "number", default: 5000 },
      tabId: { type: "number" },
      frameId: { type: "number" }
    }
  }
}
```

---

#### `fill`

Fill a form field with a value.

```typescript
{
  name: "fill",
  description: "Fill an input, textarea, or contenteditable element",
  inputSchema: {
    type: "object",
    properties: {
      selector: {
        type: "string",
        description: "@ref, CSS selector, or semantic locator"
      },
      value: {
        type: "string",
        description: "Text to fill"
      },

      // Options
      clear: {
        type: "boolean",
        default: true,
        description: "Clear existing value before filling"
      },
      force: {
        type: "boolean",
        default: false,
        description: "Force fill even if element not editable"
      },
      timeout: { type: "number", default: 5000 },

      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["selector", "value"]
  }
}
```

---

#### `type`

Type text character by character (with key events).

```typescript
{
  name: "type",
  description: "Type text with realistic key events (character by character)",
  inputSchema: {
    type: "object",
    properties: {
      selector: {
        type: "string",
        description: "@ref or selector. If omitted, types to focused element."
      },
      text: {
        type: "string",
        description: "Text to type"
      },
      delay: {
        type: "number",
        default: 50,
        description: "Delay between keystrokes in milliseconds"
      },

      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["text"]
  }
}
```

---

#### `press`

Press keyboard keys or key combinations.

```typescript
{
  name: "press",
  description: "Press keyboard keys or combinations",
  inputSchema: {
    type: "object",
    properties: {
      selector: {
        type: "string",
        description: "Target element. If omitted, sends to focused element."
      },
      key: {
        type: "string",
        description: "Key or combination: Enter, Tab, Escape, Control+c, Shift+Tab, etc."
      },
      repeat: {
        type: "number",
        default: 1,
        description: "Number of times to press"
      },
      delay: {
        type: "number",
        default: 0,
        description: "Delay between repeated presses"
      },

      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["key"]
  }
}
```

**Key names:**
- Letters: `a`-`z`, `A`-`Z`
- Numbers: `0`-`9`
- Function keys: `F1`-`F12`
- Special: `Enter`, `Tab`, `Escape`, `Backspace`, `Delete`, `Space`
- Navigation: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Home`, `End`, `PageUp`, `PageDown`
- Modifiers: `Control`, `Alt`, `Shift`, `Meta`
- Combinations: `Control+a`, `Control+Shift+p`, `Meta+Enter`

---

#### `drag`

Drag an element to another location.

```typescript
{
  name: "drag",
  description: "Drag an element to a target location",
  inputSchema: {
    type: "object",
    properties: {
      // Source
      source: {
        type: "string",
        description: "@ref or selector of element to drag"
      },
      source_coordinates: {
        type: "object",
        properties: { x: { type: "number" }, y: { type: "number" } }
      },

      // Target
      target: {
        type: "string",
        description: "@ref or selector of drop target"
      },
      target_coordinates: {
        type: "object",
        properties: { x: { type: "number" }, y: { type: "number" } }
      },

      // Options
      steps: {
        type: "number",
        default: 10,
        description: "Number of intermediate steps for smooth drag"
      },
      timeout: { type: "number", default: 5000 },

      tabId: { type: "number" },
      frameId: { type: "number" }
    }
  }
}
```

---

#### `scroll`

Scroll the page or an element.

```typescript
{
  name: "scroll",
  description: "Scroll page or element",
  inputSchema: {
    type: "object",
    properties: {
      // Target
      selector: {
        type: "string",
        description: "Element to scroll into view, or container to scroll within"
      },

      // Scroll direction/amount
      direction: {
        type: "string",
        enum: ["up", "down", "left", "right"],
        description: "Scroll direction"
      },
      amount: {
        type: "number",
        description: "Scroll amount in pixels (or ticks if using wheel)"
      },

      // Alternative: scroll to specific position
      position: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" }
        },
        description: "Scroll to absolute position"
      },

      // Scroll into view
      into_view: {
        type: "boolean",
        default: false,
        description: "Scroll selector element into view"
      },
      block: {
        type: "string",
        enum: ["start", "center", "end", "nearest"],
        default: "center",
        description: "Vertical alignment when scrolling into view"
      },

      // Behavior
      smooth: {
        type: "boolean",
        default: false,
        description: "Use smooth scrolling animation"
      },

      tabId: { type: "number" },
      frameId: { type: "number" }
    }
  }
}
```

---

#### `upload`

Upload files to a file input.

```typescript
{
  name: "upload",
  description: "Upload files to a file input element",
  inputSchema: {
    type: "object",
    properties: {
      selector: {
        type: "string",
        description: "@ref or selector of file input"
      },
      files: {
        type: "array",
        description: "Files to upload",
        items: {
          oneOf: [
            { type: "string", description: "Local file path" },
            {
              type: "object",
              properties: {
                path: { type: "string", description: "Local file path" },
                url: { type: "string", description: "URL to download file from" },
                base64: { type: "string", description: "Base64-encoded file content" },
                name: { type: "string", description: "Filename" },
                mime_type: { type: "string", description: "MIME type" }
              }
            }
          ]
        }
      },
      timeout: { type: "number", default: 30000 },

      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["selector", "files"]
  }
}
```

---

### Form Tools

#### `check`

Check a checkbox or radio button.

```typescript
{
  name: "check",
  description: "Check a checkbox or radio button",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string" },
      force: { type: "boolean", default: false },
      timeout: { type: "number", default: 5000 },
      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["selector"]
  }
}
```

---

#### `uncheck`

Uncheck a checkbox.

```typescript
{
  name: "uncheck",
  description: "Uncheck a checkbox",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string" },
      force: { type: "boolean", default: false },
      timeout: { type: "number", default: 5000 },
      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["selector"]
  }
}
```

---

#### `select`

Select option(s) in a `<select>` element.

```typescript
{
  name: "select",
  description: "Select option(s) in a select element",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string" },

      // Selection methods (one required)
      value: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } }
        ],
        description: "Option value(s) to select"
      },
      label: {
        oneOf: [
          { type: "string" },
          { type: "array", items: { type: "string" } }
        ],
        description: "Option label(s) to select"
      },
      index: {
        oneOf: [
          { type: "number" },
          { type: "array", items: { type: "number" } }
        ],
        description: "Option index(es) to select"
      },

      timeout: { type: "number", default: 5000 },
      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["selector"]
  }
}
```

---

#### `clear`

Clear an input field.

```typescript
{
  name: "clear",
  description: "Clear an input or textarea",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string" },
      timeout: { type: "number", default: 5000 },
      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["selector"]
  }
}
```

---

#### `focus`

Focus an element.

```typescript
{
  name: "focus",
  description: "Focus an element",
  inputSchema: {
    type: "object",
    properties: {
      selector: { type: "string" },
      timeout: { type: "number", default: 5000 },
      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["selector"]
  }
}
```

---

### Wait Tool

#### `wait`

Wait for various conditions.

```typescript
{
  name: "wait",
  description: "Wait for element, text, URL, network idle, or custom condition",
  inputSchema: {
    type: "object",
    properties: {
      // Wait type (one required)
      for: {
        type: "string",
        enum: [
          "selector",           // Wait for element to appear
          "selector_hidden",    // Wait for element to disappear
          "text",               // Wait for text to appear
          "text_hidden",        // Wait for text to disappear
          "url",                // Wait for URL to match pattern
          "load_state",         // Wait for page load state
          "function",           // Wait for JS function to return truthy
          "timeout"             // Simple delay
        ],
        description: "What to wait for"
      },

      // For selector waits
      selector: {
        type: "string",
        description: "@ref or CSS selector"
      },
      state: {
        type: "string",
        enum: ["attached", "detached", "visible", "hidden"],
        default: "visible",
        description: "Element state to wait for"
      },

      // For text waits
      text: {
        type: "string",
        description: "Text or regex pattern to wait for"
      },

      // For URL waits
      url: {
        type: "string",
        description: "URL pattern (supports * wildcards and regex)"
      },

      // For load state waits
      load_state: {
        type: "string",
        enum: ["load", "domcontentloaded", "networkidle"],
        description: "Page load state to wait for"
      },

      // For function waits
      function: {
        type: "string",
        description: "JavaScript function body that returns truthy when ready"
      },
      polling: {
        type: "number",
        default: 100,
        description: "Polling interval for function wait (ms)"
      },

      // For timeout waits
      duration: {
        type: "number",
        description: "Duration to wait in milliseconds"
      },

      // Common options
      timeout: {
        type: "number",
        default: 30000,
        description: "Maximum time to wait"
      },

      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["for"]
  }
}
```

**Examples:**
```json
// Wait for element to appear
{ "for": "selector", "selector": "@e5" }

// Wait for element to be hidden
{ "for": "selector", "selector": ".loading-spinner", "state": "hidden" }

// Wait for text to appear
{ "for": "text", "text": "Success!" }

// Wait for URL to change
{ "for": "url", "url": "**/dashboard/**" }

// Wait for network to be idle
{ "for": "load_state", "load_state": "networkidle" }

// Wait for custom condition
{ "for": "function", "function": "return document.querySelector('.data-loaded') !== null" }

// Simple delay
{ "for": "timeout", "duration": 2000 }
```

---

### Tab & Window Tools

#### `tab_new`

Create a new tab.

```typescript
{
  name: "tab_new",
  description: "Create a new browser tab",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to open in new tab (default: about:blank)"
      },
      active: {
        type: "boolean",
        default: true,
        description: "Activate the new tab"
      },
      windowId: {
        type: "number",
        description: "Window to create tab in"
      }
    }
  }
}
```

---

#### `tab_list`

List all open tabs.

```typescript
{
  name: "tab_list",
  description: "List all open tabs with their IDs, URLs, and titles",
  inputSchema: {
    type: "object",
    properties: {
      windowId: {
        type: "number",
        description: "Filter by window ID"
      }
    }
  }
}
```

---

#### `tab_switch`

Switch to a specific tab.

```typescript
{
  name: "tab_switch",
  description: "Switch to a specific tab",
  inputSchema: {
    type: "object",
    properties: {
      tabId: {
        type: "number",
        description: "Tab ID to switch to"
      },
      index: {
        type: "number",
        description: "Tab index (0-based) to switch to"
      }
    }
  }
}
```

---

#### `tab_close`

Close one or more tabs.

```typescript
{
  name: "tab_close",
  description: "Close one or more tabs",
  inputSchema: {
    type: "object",
    properties: {
      tabId: {
        oneOf: [
          { type: "number" },
          { type: "array", items: { type: "number" } }
        ],
        description: "Tab ID(s) to close"
      },
      url: {
        type: "string",
        description: "Close tabs matching this URL pattern"
      }
    }
  }
}
```

---

#### `window_new`

Create a new browser window.

```typescript
{
  name: "window_new",
  description: "Create a new browser window",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to open in new window"
      },
      width: { type: "number", default: 1280 },
      height: { type: "number", default: 720 },
      incognito: {
        type: "boolean",
        default: false,
        description: "Create incognito window"
      }
    }
  }
}
```

---

### Storage Tools

#### `cookies`

Manage browser cookies.

```typescript
{
  name: "cookies",
  description: "Get, set, or clear browser cookies",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get", "get_all", "set", "delete", "clear"],
        description: "Cookie operation"
      },

      // For get/set/delete
      url: {
        type: "string",
        description: "URL scope for cookie"
      },
      name: {
        type: "string",
        description: "Cookie name"
      },

      // For set
      value: { type: "string" },
      domain: { type: "string" },
      path: { type: "string", default: "/" },
      secure: { type: "boolean" },
      http_only: { type: "boolean" },
      same_site: {
        type: "string",
        enum: ["Strict", "Lax", "None"]
      },
      expires: {
        type: "number",
        description: "Expiration timestamp (seconds since epoch)"
      },

      // For clear
      domain_filter: {
        type: "string",
        description: "Only clear cookies matching this domain"
      }
    },
    required: ["action"]
  }
}
```

---

#### `storage`

Access localStorage or sessionStorage.

```typescript
{
  name: "storage",
  description: "Get, set, or clear localStorage/sessionStorage",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get", "set", "remove", "clear", "keys", "entries", "length"],
        description: "Storage operation"
      },
      type: {
        type: "string",
        enum: ["local", "session"],
        default: "local",
        description: "Storage type"
      },
      key: {
        type: "string",
        description: "Storage key"
      },
      value: {
        type: "string",
        description: "Value to set"
      },

      tabId: { type: "number" }
    },
    required: ["action"]
  }
}
```

---

#### `auth_state`

Save or restore authentication state.

```typescript
{
  name: "auth_state",
  description: "Save or restore authentication state (cookies + localStorage)",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["save", "load", "list", "delete"],
        description: "Auth state operation"
      },
      name: {
        type: "string",
        description: "State identifier"
      },
      origins: {
        type: "array",
        items: { type: "string" },
        description: "Origins to include (default: current tab origin)"
      },
      include_local_storage: {
        type: "boolean",
        default: true
      },
      include_session_storage: {
        type: "boolean",
        default: false
      },

      tabId: { type: "number" }
    },
    required: ["action"]
  }
}
```

---

### Network Tools

#### `request`

Send HTTP request from browser context.

```typescript
{
  name: "request",
  description: "Send HTTP request with browser cookies and context",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string" },
      method: {
        type: "string",
        enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
        default: "GET"
      },
      headers: {
        type: "object",
        description: "Request headers"
      },
      body: {
        type: "string",
        description: "Request body"
      },
      json: {
        type: "object",
        description: "JSON body (sets Content-Type automatically)"
      },
      form_data: {
        type: "object",
        description: "Form data (multipart/form-data)"
      },
      timeout: {
        type: "number",
        default: 30000
      },
      follow_redirects: {
        type: "boolean",
        default: true
      },

      tabId: { type: "number" }
    },
    required: ["url"]
  }
}
```

---

#### `capture`

Capture network traffic.

```typescript
{
  name: "capture",
  description: "Start/stop network traffic capture",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["start", "stop", "status"],
        description: "Capture action"
      },

      // For start
      include_bodies: {
        type: "boolean",
        default: false,
        description: "Capture response bodies (requires Debugger API)"
      },
      filter: {
        type: "object",
        properties: {
          url_pattern: { type: "string" },
          resource_types: {
            type: "array",
            items: {
              type: "string",
              enum: ["document", "stylesheet", "image", "media", "font", "script", "xhr", "fetch", "websocket", "other"]
            }
          },
          methods: {
            type: "array",
            items: { type: "string" }
          }
        }
      },
      max_capture_time: {
        type: "number",
        default: 180000,
        description: "Auto-stop after this duration (ms)"
      },

      tabId: { type: "number" }
    },
    required: ["action"]
  }
}
```

---

#### `route`

Intercept and modify network requests.

```typescript
{
  name: "route",
  description: "Intercept network requests for mocking or modification",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["add", "remove", "clear", "list"],
        description: "Route action"
      },

      // For add
      url_pattern: {
        type: "string",
        description: "URL pattern to match (supports * wildcards)"
      },
      handler: {
        type: "string",
        enum: ["abort", "fulfill", "continue"],
        description: "How to handle matched requests"
      },

      // For fulfill
      response: {
        type: "object",
        properties: {
          status: { type: "number", default: 200 },
          headers: { type: "object" },
          body: { type: "string" },
          json: { type: "object" }
        }
      },

      // For continue (modification)
      modify: {
        type: "object",
        properties: {
          url: { type: "string" },
          method: { type: "string" },
          headers: { type: "object" },
          post_data: { type: "string" }
        }
      },

      // For remove
      route_id: {
        type: "string",
        description: "ID of route to remove"
      },

      tabId: { type: "number" }
    },
    required: ["action"]
  }
}
```

**Examples:**
```json
// Block analytics
{ "action": "add", "url_pattern": "**/analytics/**", "handler": "abort" }

// Mock API response
{
  "action": "add",
  "url_pattern": "**/api/user",
  "handler": "fulfill",
  "response": {
    "status": 200,
    "json": { "id": 1, "name": "Test User" }
  }
}

// Modify request headers
{
  "action": "add",
  "url_pattern": "**/api/**",
  "handler": "continue",
  "modify": {
    "headers": { "X-Test-Header": "test-value" }
  }
}
```

---

### Media Tools

#### `screenshot`

Capture a screenshot.

```typescript
{
  name: "screenshot",
  description: "Capture screenshot of page or element",
  inputSchema: {
    type: "object",
    properties: {
      // Target
      selector: {
        type: "string",
        description: "Capture specific element (default: viewport)"
      },
      full_page: {
        type: "boolean",
        default: false,
        description: "Capture entire page, not just viewport"
      },

      // Output
      format: {
        type: "string",
        enum: ["png", "jpeg", "webp"],
        default: "png"
      },
      quality: {
        type: "number",
        description: "JPEG/WebP quality (0-100)"
      },

      // Options
      omit_background: {
        type: "boolean",
        default: false,
        description: "Make background transparent (PNG only)"
      },
      clip: {
        type: "object",
        properties: {
          x: { type: "number" },
          y: { type: "number" },
          width: { type: "number" },
          height: { type: "number" }
        },
        description: "Clip to specific region"
      },
      scale: {
        type: "number",
        default: 1,
        description: "Screenshot scale factor"
      },

      // Saving
      save_path: {
        type: "string",
        description: "Save to file path (if not specified, returns base64)"
      },

      tabId: { type: "number" }
    }
  }
}
```

---

#### `pdf`

Generate PDF of page.

```typescript
{
  name: "pdf",
  description: "Generate PDF of current page",
  inputSchema: {
    type: "object",
    properties: {
      // Page settings
      format: {
        type: "string",
        enum: ["Letter", "Legal", "Tabloid", "Ledger", "A0", "A1", "A2", "A3", "A4", "A5", "A6"],
        default: "Letter"
      },
      landscape: {
        type: "boolean",
        default: false
      },
      scale: {
        type: "number",
        default: 1,
        description: "Scale factor (0.1-2)"
      },

      // Margins
      margin: {
        type: "object",
        properties: {
          top: { type: "string" },
          bottom: { type: "string" },
          left: { type: "string" },
          right: { type: "string" }
        }
      },

      // Header/Footer
      display_header_footer: {
        type: "boolean",
        default: false
      },
      header_template: { type: "string" },
      footer_template: { type: "string" },

      // Options
      print_background: {
        type: "boolean",
        default: true
      },
      prefer_css_page_size: {
        type: "boolean",
        default: false
      },

      // Output
      save_path: {
        type: "string",
        description: "Save to file path (required)"
      },

      tabId: { type: "number" }
    },
    required: ["save_path"]
  }
}
```

---

#### `record`

Record browser activity as GIF/video.

```typescript
{
  name: "record",
  description: "Record browser activity as GIF or video",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["start", "stop", "capture_frame", "status"],
        description: "Recording action"
      },

      // For start
      mode: {
        type: "string",
        enum: ["fixed_fps", "auto_capture"],
        default: "auto_capture",
        description: "fixed_fps: regular intervals, auto_capture: on tool actions"
      },
      format: {
        type: "string",
        enum: ["gif", "webm"],
        default: "gif"
      },
      fps: {
        type: "number",
        default: 5,
        description: "Frames per second (fixed_fps mode)"
      },
      max_duration: {
        type: "number",
        default: 30000,
        description: "Maximum recording duration (ms)"
      },
      max_frames: {
        type: "number",
        default: 100
      },

      // Output dimensions
      width: { type: "number", default: 800 },
      height: { type: "number", default: 600 },

      // For capture_frame (auto_capture mode)
      annotation: {
        type: "string",
        description: "Text label for this frame"
      },

      // For stop
      save_path: {
        type: "string",
        description: "Save recording to file"
      },

      // Visual overlays
      overlays: {
        type: "object",
        properties: {
          click_indicators: { type: "boolean", default: true },
          drag_paths: { type: "boolean", default: true },
          action_labels: { type: "boolean", default: true }
        }
      },

      tabId: { type: "number" }
    },
    required: ["action"]
  }
}
```

---

### Emulation Tools

#### `viewport`

Set viewport size and device scale.

```typescript
{
  name: "viewport",
  description: "Set viewport size and device scale factor",
  inputSchema: {
    type: "object",
    properties: {
      width: { type: "number" },
      height: { type: "number" },
      device_scale_factor: {
        type: "number",
        default: 1
      },
      is_mobile: {
        type: "boolean",
        default: false
      },
      has_touch: {
        type: "boolean",
        default: false
      },
      is_landscape: {
        type: "boolean",
        default: false
      },

      tabId: { type: "number" }
    },
    required: ["width", "height"]
  }
}
```

---

#### `device`

Emulate a specific device.

```typescript
{
  name: "device",
  description: "Emulate a specific device (viewport, user agent, touch)",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        enum: [
          "iPhone 14",
          "iPhone 14 Pro Max",
          "iPhone SE",
          "iPad Pro",
          "iPad Mini",
          "Pixel 7",
          "Pixel 7 Pro",
          "Samsung Galaxy S23",
          "Desktop 1080p",
          "Desktop 1440p",
          "Desktop 4K"
        ],
        description: "Device preset"
      },

      // Or custom device
      custom: {
        type: "object",
        properties: {
          viewport: {
            type: "object",
            properties: {
              width: { type: "number" },
              height: { type: "number" }
            }
          },
          user_agent: { type: "string" },
          device_scale_factor: { type: "number" },
          is_mobile: { type: "boolean" },
          has_touch: { type: "boolean" }
        }
      },

      tabId: { type: "number" }
    }
  }
}
```

---

#### `geolocation`

Set geolocation.

```typescript
{
  name: "geolocation",
  description: "Set or clear geolocation override",
  inputSchema: {
    type: "object",
    properties: {
      latitude: { type: "number" },
      longitude: { type: "number" },
      accuracy: {
        type: "number",
        default: 100,
        description: "Accuracy in meters"
      },
      clear: {
        type: "boolean",
        default: false,
        description: "Clear geolocation override"
      },

      tabId: { type: "number" }
    }
  }
}
```

---

#### `permissions`

Override browser permissions.

```typescript
{
  name: "permissions",
  description: "Override browser permissions",
  inputSchema: {
    type: "object",
    properties: {
      permissions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: {
              type: "string",
              enum: [
                "geolocation",
                "notifications",
                "camera",
                "microphone",
                "clipboard-read",
                "clipboard-write"
              ]
            },
            state: {
              type: "string",
              enum: ["granted", "denied", "prompt"]
            }
          }
        }
      },
      origin: {
        type: "string",
        description: "Origin to apply permissions to"
      },

      tabId: { type: "number" }
    },
    required: ["permissions"]
  }
}
```

---

#### `emulate`

Advanced emulation settings.

```typescript
{
  name: "emulate",
  description: "Advanced emulation: color scheme, media, timezone, etc.",
  inputSchema: {
    type: "object",
    properties: {
      color_scheme: {
        type: "string",
        enum: ["light", "dark", "no-preference"]
      },
      reduced_motion: {
        type: "string",
        enum: ["reduce", "no-preference"]
      },
      forced_colors: {
        type: "string",
        enum: ["active", "none"]
      },
      media: {
        type: "string",
        enum: ["screen", "print"]
      },
      timezone: {
        type: "string",
        description: "Timezone ID (e.g., 'America/New_York')"
      },
      locale: {
        type: "string",
        description: "Locale (e.g., 'en-US')"
      },
      offline: {
        type: "boolean",
        default: false
      },
      cpu_throttle: {
        type: "number",
        description: "CPU throttle factor (e.g., 4 for 4x slower)"
      },
      network_throttle: {
        type: "string",
        enum: ["offline", "slow_3g", "fast_3g", "4g"],
        description: "Network throttling preset"
      },

      tabId: { type: "number" }
    }
  }
}
```

---

### Execution Tools

#### `evaluate`

Execute JavaScript in page context.

```typescript
{
  name: "evaluate",
  description: "Execute JavaScript in page context",
  inputSchema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "JavaScript expression or function body"
      },
      args: {
        type: "array",
        description: "Arguments to pass to function"
      },

      // Options
      await_promise: {
        type: "boolean",
        default: true,
        description: "Wait for promise resolution"
      },
      return_by_value: {
        type: "boolean",
        default: true,
        description: "Return result by value (vs. object reference)"
      },
      timeout: {
        type: "number",
        default: 30000
      },

      // Output control
      max_output_size: {
        type: "number",
        default: 51200,
        description: "Truncate output larger than this (bytes)"
      },
      sanitize: {
        type: "boolean",
        default: true,
        description: "Redact sensitive data in output"
      },

      tabId: { type: "number" },
      frameId: { type: "number" }
    },
    required: ["expression"]
  }
}
```

---

#### `console`

Capture console messages.

```typescript
{
  name: "console",
  description: "Capture console messages from page",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["get", "clear", "start_buffer", "stop_buffer"],
        default: "get"
      },

      // Filtering
      level: {
        type: "array",
        items: {
          type: "string",
          enum: ["log", "info", "warn", "error", "debug"]
        },
        description: "Filter by log level"
      },
      pattern: {
        type: "string",
        description: "Filter by regex pattern"
      },

      // Options
      include_exceptions: {
        type: "boolean",
        default: true
      },
      max_messages: {
        type: "number",
        default: 100
      },
      clear_after_read: {
        type: "boolean",
        default: false,
        description: "Clear buffer after reading"
      },

      tabId: { type: "number" }
    }
  }
}
```

---

### Browser Data Tools

#### `history`

Search browsing history.

```typescript
{
  name: "history",
  description: "Search and retrieve browsing history",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search text (matches URL and title)"
      },

      // Time range
      start_time: {
        type: "string",
        description: "Start time (ISO date, relative like '1 day ago', or 'today')"
      },
      end_time: {
        type: "string",
        description: "End time"
      },

      // Options
      max_results: {
        type: "number",
        default: 100
      },
      exclude_current_tabs: {
        type: "boolean",
        default: false,
        description: "Exclude URLs currently open"
      }
    }
  }
}
```

---

#### `bookmarks`

Manage bookmarks.

```typescript
{
  name: "bookmarks",
  description: "Search, add, or delete bookmarks",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["search", "add", "delete", "list_folders"],
        description: "Bookmark operation"
      },

      // For search
      query: {
        type: "string",
        description: "Search query"
      },
      folder: {
        type: "string",
        description: "Limit to folder (path or ID)"
      },
      max_results: {
        type: "number",
        default: 50
      },

      // For add
      url: {
        type: "string",
        description: "URL to bookmark"
      },
      title: {
        type: "string",
        description: "Bookmark title"
      },
      parent_folder: {
        type: "string",
        description: "Parent folder (path or ID)"
      },
      create_folder: {
        type: "boolean",
        default: false,
        description: "Create parent folder if missing"
      },

      // For delete
      bookmark_id: {
        type: "string",
        description: "Bookmark ID to delete"
      }
    },
    required: ["action"]
  }
}
```

---

### Dialog Tool

#### `dialog`

Handle JavaScript dialogs.

```typescript
{
  name: "dialog",
  description: "Handle alert, confirm, prompt, and beforeunload dialogs",
  inputSchema: {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["accept", "dismiss", "get_message"],
        description: "Dialog action"
      },
      prompt_text: {
        type: "string",
        description: "Text to enter for prompt dialogs"
      },

      // Auto-handling
      auto_handle: {
        type: "object",
        description: "Set up automatic dialog handling",
        properties: {
          enabled: { type: "boolean" },
          default_action: {
            type: "string",
            enum: ["accept", "dismiss"]
          },
          prompt_default_text: { type: "string" }
        }
      },

      tabId: { type: "number" }
    },
    required: ["action"]
  }
}
```

---

## Migration Guide

### Old Tool Name → New Tool Name

| Old Name | New Name |
|----------|----------|
| `get_windows_and_tabs` | `tab_list` |
| `chrome_navigate` | `navigate` |
| `chrome_screenshot` | `screenshot` |
| `chrome_close_tabs` | `tab_close` |
| `chrome_switch_tab` | `tab_switch` |
| `chrome_read_page` | `snapshot` |
| `chrome_computer` | Split into: `click`, `dblclick`, `type`, `press`, `drag`, `scroll`, `screenshot` |
| `chrome_click_element` | `click` |
| `chrome_fill_or_select` | `fill`, `select`, `check`, `uncheck` |
| `chrome_keyboard` | `press`, `type` |
| `chrome_javascript` | `evaluate` |
| `chrome_console` | `console` |
| `chrome_network_capture` | `capture` |
| `chrome_network_request` | `request` |
| `chrome_history` | `history` |
| `chrome_bookmark_*` | `bookmarks` |
| `chrome_upload_file` | `upload` |
| `chrome_handle_dialog` | `dialog` |
| `chrome_handle_download` | `wait` with download handling |
| `chrome_gif_recorder` | `record` |
| `chrome_get_web_content` | `evaluate` + DOM queries |
| `chrome_get_interactive_elements` | `snapshot` with `mode: "interactive"` |
| `chrome_request_element_selection` | `query` with human picker mode |
| `performance_*` | `capture` with trace mode |

### Parameter Mapping Examples

**Old: chrome_navigate**
```json
{
  "url": "https://example.com",
  "newWindow": true,
  "width": 1280,
  "height": 720
}
```

**New: navigate**
```json
{
  "url": "https://example.com",
  "new_window": true,
  "window_size": { "width": 1280, "height": 720 }
}
```

---

**Old: chrome_computer (click)**
```json
{
  "action": "left_click",
  "ref": "ref_5",
  "modifiers": { "ctrlKey": true }
}
```

**New: click**
```json
{
  "selector": "@e5",
  "modifiers": ["Control"]
}
```

---

**Old: chrome_read_page**
```json
{
  "filter": "interactive",
  "depth": 3,
  "refId": "ref_12"
}
```

**New: snapshot**
```json
{
  "mode": "interactive",
  "depth": 3,
  "selector": "@e12"
}
```

---

## Implementation Notes

### Backwards Compatibility

During migration, both old and new tool names should be supported:

```typescript
// Tool name aliasing
const TOOL_ALIASES = {
  'chrome_navigate': 'navigate',
  'chrome_click_element': 'click',
  'chrome_read_page': 'snapshot',
  // ...
};

function resolveToolName(name: string): string {
  return TOOL_ALIASES[name] || name;
}
```

### Element Reference Storage

```typescript
// Per-tab reference map storage
class RefMapManager {
  private maps = new Map<number, Map<string, RefMapEntry>>();
  private counter = 0;

  generateRef(): string {
    return `@e${++this.counter}`;
  }

  setForTab(tabId: number, map: Map<string, RefMapEntry>) {
    this.maps.set(tabId, map);
  }

  resolve(tabId: number, ref: string): RefMapEntry | undefined {
    return this.maps.get(tabId)?.get(ref);
  }

  clearForTab(tabId: number) {
    this.maps.delete(tabId);
  }
}
```

### Semantic Locator Resolution

```typescript
function parseSelector(input: string): SelectorInfo {
  // @ref format
  if (input.startsWith('@e')) {
    return { type: 'ref', value: input };
  }

  // Semantic locators
  const semanticMatch = input.match(/^(role|text|label|placeholder|alt|title|testid):(.+)$/);
  if (semanticMatch) {
    return {
      type: 'semantic',
      strategy: semanticMatch[1],
      value: semanticMatch[2]
    };
  }

  // XPath
  if (input.startsWith('xpath=') || input.startsWith('//')) {
    return { type: 'xpath', value: input.replace('xpath=', '') };
  }

  // CSS selector
  return { type: 'css', value: input };
}
```

---

## Summary

This specification transforms the Chrome MCP Server tools from Chrome-specific naming (`chrome_*`) to a cleaner, action-based interface inspired by agent-browser. Key improvements:

1. **Simpler names**: `click` instead of `chrome_click_element`
2. **Element references**: `@e1`, `@e2` for reliable element targeting
3. **Semantic locators**: `role:button`, `text:Submit` for accessibility-based queries
4. **Unified wait**: Single `wait` tool for all wait conditions
5. **Better organization**: Related tools grouped logically
6. **Consistent parameters**: Same parameter names across all tools

The new interface is designed for AI agent compatibility while maintaining full access to Chrome's powerful automation capabilities.
