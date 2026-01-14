# Network Commands

Send requests, capture traffic, and mock responses.

## Commands

### request

Send HTTP request from browser context (with cookies).

```
request --url https://api.example.com/data
request --url https://api.example.com/users --method POST \
  --json '{"name": "John"}'
request --url https://api.example.com/upload --method POST \
  --form-data '{"file": {"path": "/tmp/doc.pdf"}}'
request --url https://api.example.com/data \
  --headers '{"Authorization": "Bearer token123"}'
```

**Options:**
| Option | Description |
|--------|-------------|
| `--url` | Request URL (required) |
| `--method` | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| `--headers` | Custom headers object |
| `--body` | Request body string |
| `--json` | JSON body (auto-sets Content-Type) |
| `--form-data` | Multipart form data |
| `--timeout` | Request timeout (default: 30000ms) |
| `--follow-redirects` | Follow redirects (default: true) |

### capture

Capture network traffic.

**Start/stop capture:**
```
capture --action start
# ... perform actions ...
capture --action stop
```

**With response bodies:**
```
capture --action start --include-bodies
# ... perform actions ...
capture --action stop
```

**With filters:**
```
capture --action start --filter '{"url_pattern": "**/api/**", "methods": ["POST", "PUT"]}'
capture --action start --filter '{"resource_types": ["xhr", "fetch"]}'
```

**Check status:**
```
capture --action status
```

### route

Intercept and mock network requests.

**Block requests:**
```
route --action add --url-pattern "**/analytics/**" --handler abort
route --action add --url-pattern "**/ads/**" --handler abort
```

**Mock API response:**
```
route --action add --url-pattern "**/api/user" --handler fulfill \
  --response '{"status": 200, "json": {"id": 1, "name": "Test User"}}'
```

**Modify requests:**
```
route --action add --url-pattern "**/api/**" --handler continue \
  --modify '{"headers": {"X-Test": "true"}}'
```

**Manage routes:**
```
route --action list                    # Show active routes
route --action remove --route-id "r1"  # Remove specific route
route --action clear                   # Remove all routes
```

## Common Patterns

**Test with mocked API:**
```
route --action add --url-pattern "**/api/products" --handler fulfill \
  --response '{"status": 200, "json": [{"id": 1, "name": "Test Product"}]}'
navigate https://app.example.com/products
snapshot  # See how page renders with mock data
route --action clear
```

**Capture API calls during action:**
```
capture --action start --filter '{"resource_types": ["xhr", "fetch"]}'
click @e1
wait --for timeout --duration 2000
capture --action stop
# Review captured requests/responses
```

**Debug slow requests:**
```
capture --action start --include-bodies
navigate https://slow-site.com
capture --action stop
# Analyze timing and response sizes
```

## Use `help <command>` for full schema.
