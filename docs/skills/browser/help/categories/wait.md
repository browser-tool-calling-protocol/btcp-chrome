# Wait Commands

Wait for conditions before proceeding.

## Commands

### wait

Wait for various conditions.

**Wait for element:**
```
wait --for selector --selector @e1           # Wait for element visible
wait --for selector --selector "#loading" --state hidden  # Wait until hidden
wait --for selector --selector ".modal" --state attached  # Wait until in DOM
wait --for selector_hidden --selector ".spinner"          # Wait for disappear
```

**Wait for text:**
```
wait --for text --text "Success"             # Wait for text to appear
wait --for text --text "Loading" --state hidden  # Wait for text to disappear
wait --for text_hidden --text "Please wait"  # Shorthand
```

**Wait for URL:**
```
wait --for url --url "**/dashboard/**"       # Wait for URL pattern
wait --for url --url "https://example.com/success"  # Exact URL
```

**Wait for page load:**
```
wait --for load_state --load-state load             # Wait for load event
wait --for load_state --load-state domcontentloaded # DOM ready
wait --for load_state --load-state networkidle      # Network quiet
```

**Wait for custom condition:**
```
wait --for function --function "return document.querySelector('.data') !== null"
wait --for function --function "return window.myApp?.loaded === true"
wait --for function --function "return fetch('/api/status').then(r => r.ok)"
```

**Simple delay:**
```
wait --for timeout --duration 2000   # Wait 2 seconds
```

## Options

| Option | Description |
|--------|-------------|
| `--for` | What to wait for: selector, selector_hidden, text, text_hidden, url, load_state, function, timeout |
| `--selector` | Element selector or @ref |
| `--state` | Element state: visible (default), hidden, attached, detached |
| `--text` | Text to wait for |
| `--url` | URL pattern (supports * wildcards) |
| `--load-state` | Page state: load, domcontentloaded, networkidle |
| `--function` | JavaScript returning truthy when done |
| `--duration` | Milliseconds for timeout wait |
| `--timeout` | Max wait time (default: 30000ms) |
| `--polling` | Poll interval for function (default: 100ms) |

## Common Patterns

**Wait after click:**
```
click @e1
wait --for selector --selector ".result"
```

**Wait for navigation:**
```
click @e1
wait --for url --url "**/dashboard/**"
```

**Wait for API response:**
```
click @e1
wait --for function --function "return window.apiResponse !== undefined"
```

**Wait for loading to finish:**
```
wait --for selector_hidden --selector ".loading-spinner"
```

## Use `help wait` for full schema.
