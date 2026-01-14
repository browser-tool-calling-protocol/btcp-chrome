/**
 * Browser Skill - Single Tool with CLI-style Commands
 *
 * Agent sees ONE tool that handles everything via command strings.
 * Help is built-in, no external files needed.
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// =============================================================================
// The ONE tool agents see
// =============================================================================

export const BROWSER_TOOL: Tool = {
  name: 'browser',
  description: `Browser automation via CLI commands.

COMMANDS:
  snapshot              Get page elements with @refs
  click @e1             Click element by ref
  fill @e2 "text"       Fill input field
  navigate <url>        Go to URL
  wait --for <type>     Wait for condition

HELP:
  help                  List all commands
  help <command>        Command details (e.g., help click)

EXAMPLES:
  navigate https://example.com
  snapshot
  click @e3
  fill @e2 "hello@test.com"
  wait --for text "Success"`,

  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Command to execute (e.g., "click @e1", "help wait")'
      }
    },
    required: ['command']
  }
};

// =============================================================================
// Help content - just strings, no files
// =============================================================================

const HELP = {
  index: `
COMMANDS:
  snapshot [--mode interactive]     Get page elements with @refs
  click <ref|selector>              Click element
  dblclick <ref|selector>           Double-click
  fill <ref|selector> "value"       Fill input (clears first)
  type "text"                       Type with key events
  press <key>                       Press key (Enter, Tab, Ctrl+c)
  navigate <url>                    Go to URL
  navigate --action back|forward    Browser history
  wait --for <condition>            Wait for element/text/url
  screenshot                        Capture page
  evaluate "js code"                Run JavaScript
  cookies --action get|set|clear    Manage cookies
  tab_list                          List open tabs
  tab_switch --tabId <id>           Switch tab

Run "help <command>" for details.`,

  snapshot: `
snapshot [options]

Get accessibility tree with element refs (@e1, @e2...).

OPTIONS:
  --mode interactive    Only actionable elements (buttons, inputs, links)
  --mode focused        Subtree from focused element
  --depth <n>           Max tree depth
  --selector <sel>      Scope to container
  --compact             Hide unnamed containers

EXAMPLES:
  snapshot
  snapshot --mode interactive
  snapshot --depth 3

OUTPUT:
  - heading "Login" [ref=@e1]
  - textbox "Email" [ref=@e2]
  - button "Submit" [ref=@e3]`,

  click: `
click <target> [options]

Click an element.

TARGET (one of):
  @e1                   Ref from snapshot
  "role:button"         By ARIA role
  "text:Submit"         By visible text
  "label:Email"         By form label
  "#id" or ".class"     CSS selector
  --coordinates x,y     Screen position

OPTIONS:
  --button left|right|middle    Mouse button (default: left)
  --count <n>                   Click count (2 = double-click)
  --modifiers Ctrl,Shift        Hold modifier keys

EXAMPLES:
  click @e3
  click "text:Login"
  click "role:button:Submit"
  click --coordinates 100,200
  click @e1 --button right
  click @e1 --modifiers Ctrl`,

  fill: `
fill <target> "value" [options]

Fill an input field (clears existing value first).

TARGET:
  @e2                   Ref from snapshot
  "label:Email"         By form label
  "#email"              CSS selector

OPTIONS:
  --no-clear            Don't clear before filling

EXAMPLES:
  fill @e2 "hello@example.com"
  fill "label:Password" "secret123"
  fill "#search" "query" --no-clear`,

  type: `
type "text" [options]

Type text character-by-character with realistic key events.

OPTIONS:
  --selector <sel>      Target element (default: focused)
  --delay <ms>          Delay between keys (default: 50)

EXAMPLES:
  type "Hello World"
  type "slow typing" --delay 100
  type @e2 "into this field"`,

  press: `
press <key> [options]

Press keyboard key or combination.

KEYS:
  Enter, Tab, Escape, Backspace, Delete, Space
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight
  F1-F12, Home, End, PageUp, PageDown

COMBINATIONS:
  Ctrl+a, Ctrl+c, Ctrl+v, Shift+Tab, Ctrl+Shift+p

OPTIONS:
  --selector <sel>      Target element
  --repeat <n>          Repeat count

EXAMPLES:
  press Enter
  press Tab
  press Ctrl+a
  press ArrowDown --repeat 5`,

  navigate: `
navigate <url> [options]
navigate --action back|forward|reload

Go to URL or control browser history.

OPTIONS:
  --action goto|back|forward|reload    Navigation type
  --new-tab                             Open in new tab
  --new-window                          Open in new window
  --wait-until load|networkidle        When complete

EXAMPLES:
  navigate https://example.com
  navigate https://example.com --new-tab
  navigate --action back
  navigate --action reload`,

  wait: `
wait --for <condition> [options]

Wait for condition before proceeding.

CONDITIONS:
  --for selector --selector @e1         Element visible
  --for selector --selector @e1 --state hidden    Element hidden
  --for text --text "Success"           Text appears
  --for text --text "Loading" --hidden  Text disappears
  --for url --url "**/dashboard/**"     URL matches
  --for load --state networkidle        Network quiet
  --for timeout --duration 2000         Simple delay

OPTIONS:
  --timeout <ms>        Max wait (default: 30000)

EXAMPLES:
  wait --for selector --selector @e5
  wait --for text --text "Welcome"
  wait --for url --url "**/success**"
  wait --for timeout --duration 1000`,

  screenshot: `
screenshot [options]

Capture page screenshot.

OPTIONS:
  --selector <sel>      Capture specific element
  --full-page           Entire scrollable page
  --format png|jpeg     Image format
  --quality <0-100>     JPEG quality

EXAMPLES:
  screenshot
  screenshot --full-page
  screenshot --selector @e1
  screenshot --format jpeg --quality 80`,

  evaluate: `
evaluate "code" [options]

Execute JavaScript in page context.

OPTIONS:
  --timeout <ms>        Execution timeout

EXAMPLES:
  evaluate "document.title"
  evaluate "document.querySelectorAll('a').length"
  evaluate "await fetch('/api/data').then(r => r.json())"
  evaluate "localStorage.getItem('token')"`,

  cookies: `
cookies --action <action> [options]

Manage browser cookies.

ACTIONS:
  --action get --name <name>            Get cookie
  --action get-all                      Get all cookies
  --action set --name <n> --value <v>   Set cookie
  --action delete --name <name>         Delete cookie
  --action clear                        Clear all

OPTIONS:
  --url <url>           Cookie scope
  --domain <domain>     Cookie domain

EXAMPLES:
  cookies --action get-all
  cookies --action get --name "session"
  cookies --action set --name "token" --value "abc123"
  cookies --action clear`,

  tab_list: `
tab_list [options]

List all open browser tabs.

OPTIONS:
  --windowId <id>       Filter by window

OUTPUT:
  [
    { id: 123, url: "https://...", title: "...", active: true },
    { id: 124, url: "https://...", title: "...", active: false }
  ]`,

  tab_switch: `
tab_switch --tabId <id>

Switch to a specific tab.

OPTIONS:
  --tabId <id>          Tab ID from tab_list
  --index <n>           Tab index (0-based)

EXAMPLES:
  tab_switch --tabId 123
  tab_switch --index 0`,
};

// =============================================================================
// Command parser and router
// =============================================================================

interface ParsedCommand {
  command: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

function parseCommand(input: string): ParsedCommand {
  const tokens = input.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const command = tokens[0] || '';
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = tokens[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next.replace(/^"|"$/g, '');
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      args.push(token.replace(/^"|"$/g, ''));
    }
  }

  return { command, args, flags };
}

// =============================================================================
// Handler
// =============================================================================

export async function handleBrowserCommand(input: string): Promise<ToolResult> {
  const { command, args, flags } = parseCommand(input);

  // Help commands
  if (command === 'help') {
    const topic = args[0] || 'index';
    const content = HELP[topic as keyof typeof HELP];
    if (content) {
      return success(content.trim());
    }
    return error(`Unknown help topic: ${topic}. Run "help" for list.`);
  }

  // Route to tool executors
  switch (command) {
    case 'snapshot':
      return executeSnapshot(flags);
    case 'click':
      return executeClick(args[0], flags);
    case 'dblclick':
      return executeClick(args[0], { ...flags, count: '2' });
    case 'fill':
      return executeFill(args[0], args[1], flags);
    case 'type':
      return executeType(args[0], flags);
    case 'press':
      return executePress(args[0], flags);
    case 'navigate':
      return executeNavigate(args[0], flags);
    case 'wait':
      return executeWait(flags);
    case 'screenshot':
      return executeScreenshot(flags);
    case 'evaluate':
      return executeEvaluate(args[0], flags);
    case 'cookies':
      return executeCookies(flags);
    case 'tab_list':
      return executeTabList(flags);
    case 'tab_switch':
      return executeTabSwitch(flags);
    default:
      return error(`Unknown command: ${command}. Run "help" for list.`);
  }
}

// =============================================================================
// Types
// =============================================================================

interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

function success(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

function error(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

// =============================================================================
// Tool executors (stubs - implement with actual browser APIs)
// =============================================================================

async function executeSnapshot(flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual snapshot implementation
  return success('- button "Login" [ref=@e1]\n- textbox "Email" [ref=@e2]');
}

async function executeClick(target: string, flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual click implementation
  return success(`Clicked: ${target}`);
}

async function executeFill(target: string, value: string, flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual fill implementation
  return success(`Filled ${target} with "${value}"`);
}

async function executeType(text: string, flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual type implementation
  return success(`Typed: ${text}`);
}

async function executePress(key: string, flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual press implementation
  return success(`Pressed: ${key}`);
}

async function executeNavigate(url: string, flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual navigate implementation
  return success(`Navigated to: ${url}`);
}

async function executeWait(flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual wait implementation
  return success(`Wait complete`);
}

async function executeScreenshot(flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual screenshot implementation
  return success(`Screenshot captured`);
}

async function executeEvaluate(code: string, flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual evaluate implementation
  return success(`Result: ...`);
}

async function executeCookies(flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual cookies implementation
  return success(`Cookies: ...`);
}

async function executeTabList(flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual tab_list implementation
  return success(`[{ id: 1, url: "...", title: "..." }]`);
}

async function executeTabSwitch(flags: Record<string, any>): Promise<ToolResult> {
  // TODO: Call actual tab_switch implementation
  return success(`Switched to tab`);
}
