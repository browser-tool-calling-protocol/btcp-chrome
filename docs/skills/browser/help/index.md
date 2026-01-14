# Help Index

Progressive documentation for browser automation tools.

## Available Help Topics

### Categories

Detailed documentation for each command category:

| Command | Description |
|---------|-------------|
| `help snapshot` | Page analysis and element finding |
| `help interact` | Click, fill, type, drag, scroll |
| `help navigate` | URL navigation, tabs, windows |
| `help wait` | Wait for conditions |
| `help forms` | Checkboxes, selects, file uploads |
| `help storage` | Cookies, localStorage, auth state |
| `help network` | HTTP requests, capture, mocking |
| `help media` | Screenshots, PDFs, recording |
| `help emulate` | Device/viewport simulation |
| `help execute` | JavaScript execution, console |
| `help data` | History, bookmarks |
| `help dialog` | Alert/confirm/prompt handling |

### Guides

| Command | Description |
|---------|-------------|
| `help examples` | Common workflow patterns |
| `help selectors` | How to target elements |

### Command Details

Get full schema for any command:

```
help click      # Full click command options
help fill       # Full fill command options
help snapshot   # Full snapshot command options
help wait       # Full wait command options
...
```

## Help System

The documentation is organized in layers:

```
┌─────────────────────────────────────────┐
│           SKILL.md (Entry Point)         │
│  Quick start, categories, basic workflow │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│      help <category> (Category Docs)     │
│   All commands in category with examples │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│       help <command> (Full Schema)       │
│    Complete options, types, defaults     │
└─────────────────────────────────────────┘
```

## Quick Reference

**Most used commands:**
```
snapshot                    # Get page structure
click @e1                   # Click element
fill @e2 "text"            # Fill input
navigate URL               # Go to page
wait --for selector @e1    # Wait for element
```

**Get started:**
```
1. navigate https://example.com
2. snapshot
3. Use @refs from snapshot in commands
```
