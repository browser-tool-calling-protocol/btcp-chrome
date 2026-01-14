# Execute Commands

Run JavaScript and capture console output.

## Commands

### evaluate

Execute JavaScript in page context.

**Basic expressions:**
```
evaluate --expression "document.title"
evaluate --expression "window.location.href"
evaluate --expression "document.querySelectorAll('a').length"
```

**Return values:**
```
evaluate --expression "document.querySelector('#price').textContent"
evaluate --expression "JSON.parse(localStorage.getItem('user'))"
evaluate --expression "[...document.querySelectorAll('.item')].map(e => e.textContent)"
```

**Async operations:**
```
evaluate --expression "await fetch('/api/data').then(r => r.json())"
evaluate --expression "await new Promise(r => setTimeout(r, 1000)); return 'done'"
```

**Modify page:**
```
evaluate --expression "document.body.style.backgroundColor = 'red'"
evaluate --expression "document.querySelector('#modal').remove()"
evaluate --expression "window.scrollTo(0, document.body.scrollHeight)"
```

**With arguments:**
```
evaluate --expression "(a, b) => a + b" --args [5, 3]
evaluate --expression "(selector) => document.querySelector(selector)?.textContent" \
  --args ["#title"]
```

**Options:**
| Option | Description |
|--------|-------------|
| `--expression` | JavaScript code to execute |
| `--args` | Arguments to pass |
| `--await-promise` | Wait for promise (default: true) |
| `--timeout` | Execution timeout (default: 30000ms) |
| `--max-output-size` | Truncate large outputs (default: 51200) |
| `--sanitize` | Redact sensitive data (default: true) |

### console

Capture console messages.

**Get console output:**
```
console --action get                           # Get recent messages
console --action get --level ["error"]         # Only errors
console --action get --level ["warn", "error"] # Warnings and errors
console --action get --pattern "API.*failed"   # Filter by regex
console --action get --max-messages 50         # Limit messages
console --action get --include-exceptions      # Include uncaught exceptions
```

**Buffer mode (persistent capture):**
```
console --action start_buffer                  # Start buffering
# ... perform actions ...
console --action get --clear-after-read        # Get and clear buffer
console --action stop_buffer                   # Stop buffering
```

**Clear console:**
```
console --action clear
```

## Common Patterns

**Extract structured data:**
```
evaluate --expression "
  [...document.querySelectorAll('.product')].map(el => ({
    name: el.querySelector('.name')?.textContent,
    price: el.querySelector('.price')?.textContent,
    url: el.querySelector('a')?.href
  }))
"
```

**Check for JavaScript errors:**
```
console --action get --level ["error"] --include-exceptions
```

**Wait for app initialization:**
```
evaluate --expression "
  await new Promise(resolve => {
    if (window.app?.initialized) return resolve(true);
    const check = setInterval(() => {
      if (window.app?.initialized) {
        clearInterval(check);
        resolve(true);
      }
    }, 100);
    setTimeout(() => resolve(false), 10000);
  })
"
```

**Inject helper function:**
```
evaluate --expression "
  window.getVisibleText = (selector) => {
    const el = document.querySelector(selector);
    return el?.offsetParent !== null ? el.textContent : null;
  }
"
# Later:
evaluate --expression "window.getVisibleText('.status')"
```

**Debug API calls:**
```
console --action start_buffer
click @e1  # Trigger API call
console --action get --pattern "fetch|xhr" --clear-after-read
```

## Use `help <command>` for full schema.
