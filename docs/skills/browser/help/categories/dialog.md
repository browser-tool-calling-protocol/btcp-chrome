# Dialog Commands

Handle JavaScript dialogs (alert, confirm, prompt).

## Commands

### dialog

Handle browser dialogs.

**Accept dialog:**
```
dialog --action accept
```

**Dismiss dialog:**
```
dialog --action dismiss
```

**Accept prompt with text:**
```
dialog --action accept --prompt-text "My input"
```

**Get dialog message (without dismissing):**
```
dialog --action get_message
```

**Auto-handle dialogs:**
```
dialog --auto-handle '{"enabled": true, "default_action": "accept"}'
dialog --auto-handle '{"enabled": true, "default_action": "dismiss"}'
dialog --auto-handle '{
  "enabled": true,
  "default_action": "accept",
  "prompt_default_text": "default value"
}'
dialog --auto-handle '{"enabled": false}'  # Disable auto-handle
```

## Dialog Types

| Type | Description | Actions |
|------|-------------|---------|
| `alert` | Information message | accept |
| `confirm` | Yes/No question | accept, dismiss |
| `prompt` | Text input request | accept (with text), dismiss |
| `beforeunload` | Leave page confirmation | accept, dismiss |

## Common Patterns

**Handle alert:**
```
click @e1  # Triggers alert
dialog --action accept
```

**Handle confirm dialog:**
```
click @e1  # Triggers confirm("Are you sure?")
dialog --action accept  # Click OK
# or
dialog --action dismiss  # Click Cancel
```

**Handle prompt dialog:**
```
click @e1  # Triggers prompt("Enter name:")
dialog --action accept --prompt-text "John Doe"
```

**Auto-accept all dialogs:**
```
dialog --auto-handle '{"enabled": true, "default_action": "accept"}'
# Now all dialogs will be auto-accepted
click @e1
click @e2
# No need to manually handle each dialog
dialog --auto-handle '{"enabled": false}'  # Turn off
```

**Check dialog message before responding:**
```
click @e1  # Triggers dialog
dialog --action get_message
# Returns: {"type": "confirm", "message": "Delete this item?"}
dialog --action accept
```

**Handle beforeunload (leave page):**
```
dialog --auto-handle '{"enabled": true, "default_action": "accept"}'
navigate https://other-page.com  # Will auto-accept "Leave page?" dialog
```

## Notes

- Dialogs block page interaction until handled
- Use auto-handle for pages with many dialogs
- `get_message` lets you inspect before responding
- `beforeunload` dialogs appear when navigating away from pages with unsaved changes

## Use `help dialog` for full schema.
