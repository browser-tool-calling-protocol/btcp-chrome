# How Agents Use the Skill System

## The Problem

Loading 40+ tool schemas into agent context = ~2000 lines = wasted tokens.

## The Solution

**One meta-tool: `browser`** that handles everything.

```typescript
// Instead of 40 separate tools, agent sees ONE tool:
{
  name: "browser",
  description: "Browser automation. Run 'browser help' for commands.",
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string", description: "Command to run (e.g., 'click @e1', 'help interact')" }
    },
    required: ["command"]
  }
}
```

## How Agent Uses It

### Step 1: Agent loads skill entry point

When session starts, agent's system prompt includes `SKILL.md` content:

```
# Browser Automation Tools

Quick Start:
  snapshot                    # Get page elements with @refs
  click @e1                   # Click element by ref
  fill @e2 "text"             # Fill input field
  navigate https://example.com

Categories: snapshot, interact, navigate, wait, forms, storage, network, media, emulate, execute, data, dialog

Run 'help <category>' for details, 'help <command>' for full options.
```

**That's it. ~50 lines in context.**

### Step 2: Agent calls the tool

```json
// Agent wants to navigate
{ "command": "navigate https://example.com" }

// Agent needs help with clicking
{ "command": "help interact" }

// Agent needs full schema for wait
{ "command": "help wait" }
```

### Step 3: Tool parses and routes

```typescript
function handleBrowserCommand(input: string): Result {
  const [cmd, ...args] = parseCommand(input);

  // Help commands return documentation
  if (cmd === 'help') {
    return getHelp(args[0]); // Returns markdown from help/ folder
  }

  // Action commands execute browser operations
  return executeBrowserTool(cmd, parseArgs(args));
}
```

## Complete Flow Example

```
┌─────────────────────────────────────────────────────────────────┐
│ USER: "Log into my GitHub account"                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT CONTEXT (from SKILL.md):                                  │
│   "I have browser tool. Commands: snapshot, click, fill..."    │
│   "I should navigate to GitHub, then use snapshot to see form" │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT CALLS:                                                    │
│   browser({ command: "navigate https://github.com/login" })     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TOOL RETURNS:                                                   │
│   { success: true, url: "https://github.com/login" }           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT CALLS:                                                    │
│   browser({ command: "snapshot --mode interactive" })           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TOOL RETURNS:                                                   │
│   - textbox "Username or email" [ref=@e1]                      │
│   - textbox "Password" [ref=@e2]                               │
│   - button "Sign in" [ref=@e3]                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT CALLS:                                                    │
│   browser({ command: 'fill @e1 "user@email.com"' })            │
│   browser({ command: 'fill @e2 "password123"' })               │
│   browser({ command: 'click @e3' })                            │
└─────────────────────────────────────────────────────────────────┘
```

## When Agent Needs Help

```
┌─────────────────────────────────────────────────────────────────┐
│ AGENT: "I need to wait for something but don't know the syntax"│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT CALLS:                                                    │
│   browser({ command: "help wait" })                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TOOL RETURNS: (content from help/categories/wait.md)           │
│                                                                 │
│   # Wait Commands                                               │
│   wait --for selector --selector @e1                           │
│   wait --for text --text "Success"                             │
│   wait --for url --url "**/dashboard/**"                       │
│   ...                                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ AGENT NOW KNOWS:                                                │
│   browser({ command: 'wait --for text --text "Welcome"' })     │
└─────────────────────────────────────────────────────────────────┘
```

## Token Comparison

| Approach | Initial Context | Per-command Context |
|----------|-----------------|---------------------|
| **Traditional** (40 tool schemas) | ~2000 lines | 0 |
| **Progressive** (1 tool + SKILL.md) | ~50 lines | ~100 lines when help requested |

**Result:** Agent typically uses 3-5 commands per task, so progressive approach uses ~200-500 lines vs 2000 lines upfront.

## Implementation in MCP Server

```typescript
// packages/shared/src/browser-skill-tool.ts

export const BROWSER_SKILL_TOOL: Tool = {
  name: 'browser',
  description: `Browser automation tool.

Quick commands:
  snapshot                 - Get page elements with @refs
  click @e1                - Click element
  fill @e2 "text"          - Fill input
  navigate URL             - Go to page

Run 'help' for all commands, 'help <topic>' for details.`,
  inputSchema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Browser command (e.g., "click @e1", "help interact")'
      }
    },
    required: ['command']
  }
};

// Handler
export async function handleBrowserSkill(command: string): Promise<ToolResult> {
  const parsed = parseCliCommand(command);

  if (parsed.command === 'help') {
    return { content: [{ type: 'text', text: getHelpContent(parsed.args[0]) }] };
  }

  // Map CLI command to tool execution
  const toolName = CLI_TO_TOOL_MAP[parsed.command];
  const toolArgs = cliArgsToToolArgs(parsed);

  return executeToolByName(toolName, toolArgs);
}
```

## File Usage Summary

| File | When Loaded | By Whom |
|------|-------------|---------|
| `SKILL.md` | Session start | Injected into agent system prompt |
| `help/*.md` | On `help <topic>` | Returned by browser tool |
| `agent-browser-tools-schema.ts` | Implementation | Tool handler uses schemas internally |
