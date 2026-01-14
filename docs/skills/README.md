# Skills System Architecture

This document describes the progressive disclosure skill system for AI agents.

## Overview

The skill system provides a **hierarchical documentation structure** that allows AI agents to efficiently discover and use browser automation tools without loading full schemas upfront.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Agent Context                                │
│                                                                      │
│  1. Load SKILL.md (~50 lines) - entry point                         │
│  2. On demand: help <category> (~100 lines per category)            │
│  3. On demand: help <command> (full JSON schema)                    │
│                                                                      │
│  Total initial context: ~50 lines vs ~2000 lines for full schemas   │
└─────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
docs/skills/
├── README.md                    # This file (architecture docs)
└── browser/
    ├── SKILL.md                 # Entry point (agent loads this first)
    └── help/
        ├── index.md             # Help navigation
        ├── examples.md          # Workflow examples
        ├── selectors.md         # Element targeting guide
        └── categories/
            ├── snapshot.md      # snapshot, query commands
            ├── interact.md      # click, fill, type, etc.
            ├── navigate.md      # navigate, tabs, windows
            ├── wait.md          # wait conditions
            ├── forms.md         # check, select, upload
            ├── storage.md       # cookies, storage, auth_state
            ├── network.md       # request, capture, route
            ├── media.md         # screenshot, pdf, record
            ├── emulate.md       # viewport, device, geolocation
            ├── execute.md       # evaluate, console
            ├── data.md          # history, bookmarks
            └── dialog.md        # dialog handling
```

## How It Works

### 1. Entry Point (SKILL.md)

The agent first loads `SKILL.md` which provides:
- Quick start commands (4 essential commands)
- Command categories table (12 categories)
- Basic workflow example
- How to get more help

**Size:** ~50 lines (minimal context usage)

### 2. Category Documentation

When agent needs details on a category, it loads the specific help file:
- `help interact` → `help/categories/interact.md`
- `help storage` → `help/categories/storage.md`

Each category file provides:
- All commands in that category
- Common options and examples
- Links to full schema when needed

**Size:** ~100-150 lines per category

### 3. Full Command Schema

For complete parameter details, agent can request:
- `help click` → Returns full JSON schema from `agent-browser-tools-schema.ts`
- `help wait` → Returns complete wait tool schema

**Size:** ~50-100 lines per command

## Integration Points

### MCP Server

The skill system integrates with the MCP server:

```typescript
// Tool: help
{
  name: "help",
  description: "Get documentation for commands",
  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Category, command name, 'examples', or 'selectors'"
      }
    }
  }
}

// Handler
async function handleHelp(topic: string): Promise<string> {
  if (topic in CATEGORIES) {
    return readFile(`help/categories/${topic}.md`);
  }
  if (topic in COMMANDS) {
    return getCommandSchema(topic);
  }
  if (topic === 'examples') {
    return readFile('help/examples.md');
  }
  if (topic === 'selectors') {
    return readFile('help/selectors.md');
  }
  return readFile('help/index.md');
}
```

### Claude MCP Integration

For Claude-based agents, the skill can be loaded via:

```typescript
// In MCP client configuration
{
  skills: [{
    name: "browser",
    entry: "docs/skills/browser/SKILL.md",
    helpCommand: "help"
  }]
}
```

## Design Principles

### 1. Minimal Initial Context

The entry point (`SKILL.md`) is intentionally small to:
- Reduce token usage
- Speed up initial loading
- Allow agent to start working quickly

### 2. Progressive Disclosure

Information is revealed in layers:
- **Layer 1:** What commands exist (categories)
- **Layer 2:** How commands work (category docs)
- **Layer 3:** Complete options (full schemas)

### 3. CLI-Style Interface

Commands follow CLI conventions:
- Simple action names: `click`, `fill`, `navigate`
- Flags for options: `--selector`, `--timeout`
- Consistent patterns across all commands

### 4. Self-Documenting

The system is self-contained:
- `help` command for navigation
- Examples for common patterns
- Selector guide for targeting

## Benefits

| Aspect | Without Skills | With Skills |
|--------|----------------|-------------|
| Initial context | ~2000 lines (all schemas) | ~50 lines (SKILL.md) |
| Discovery | Read full docs | Ask for what you need |
| Learning curve | Overwhelming | Progressive |
| Token efficiency | Low | High |

## Adding New Commands

1. Add schema to `agent-browser-tools-schema.ts`
2. Add to appropriate category file in `help/categories/`
3. Update `SKILL.md` if it's a core command
4. Add examples to `help/examples.md` if useful

## Future Enhancements

- **Dynamic schema generation:** Generate help from Zod schemas
- **Context-aware help:** Suggest commands based on current page
- **Interactive tutorials:** Step-by-step guided workflows
- **Command validation:** Validate arguments before execution
