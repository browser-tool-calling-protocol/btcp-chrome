# Interact Commands

Click, type, and interact with page elements.

## Commands

### click

Click an element.

```
click @e1                           # Click by ref
click "role:button"                 # Click by role
click "text:Submit"                 # Click by text
click --coordinates 100,200         # Click at position
click @e1 --button right            # Right click
click @e1 --click-count 2           # Double click
click @e1 --modifiers Control       # Ctrl+click
```

### dblclick

Double-click an element.

```
dblclick @e1                        # Double click by ref
dblclick --coordinates 100,200      # Double click position
```

### fill

Fill input field (clears existing value).

```
fill @e2 "hello@example.com"        # Fill by ref
fill "label:Email" "test@test.com"  # Fill by label
fill @e2 "text" --clear false       # Append to existing
```

### type

Type text character by character (realistic input).

```
type "Hello World"                  # Type to focused element
type @e2 "Hello"                    # Type to specific element
type "Hello" --delay 100            # Slow typing (100ms/char)
```

### press

Press keyboard keys.

```
press Enter                         # Press Enter
press Tab                           # Press Tab
press "Control+a"                   # Select all
press "Control+c"                   # Copy
press "Shift+Tab"                   # Shift+Tab
press Escape                        # Press Escape
press ArrowDown --repeat 5          # Press 5 times
```

### hover

Hover over element (trigger hover states).

```
hover @e1                           # Hover by ref
hover --coordinates 100,200         # Hover at position
```

### drag

Drag element to target.

```
drag --source @e1 --target @e2      # Drag between refs
drag --source @e1 --target-coordinates 300,400
drag --source-coordinates 100,100 --target-coordinates 300,300
```

### scroll

Scroll page or element.

```
scroll --direction down             # Scroll down
scroll --direction up --amount 500  # Scroll up 500px
scroll @e1 --into-view              # Scroll element into view
scroll --position 0,1000            # Scroll to position
scroll "#container" --direction down # Scroll within element
```

## Common Patterns

**Fill a form:**
```
fill @e2 "user@email.com"
fill @e3 "password123"
click @e4
```

**Navigate with keyboard:**
```
press Tab
press Tab
press Enter
```

## Use `help <command>` for full schema.
