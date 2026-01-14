# Browser Automation Tools

Control Chrome browser for web automation, testing, and data extraction.

## Quick Start

```
snapshot                    # Get page elements with @refs
click @e1                   # Click element by ref
fill @e2 "text"             # Fill input field
navigate https://example.com # Go to URL
```

## Command Categories

| Category | Commands | Description |
|----------|----------|-------------|
| **snapshot** | `snapshot`, `query` | Get page elements and find by role/text/label |
| **interact** | `click`, `fill`, `type`, `press`, `drag`, `scroll` | User interactions |
| **navigate** | `navigate`, `tab_*`, `window_*` | Page and tab control |
| **wait** | `wait` | Wait for elements, text, network, conditions |
| **forms** | `check`, `uncheck`, `select`, `clear`, `upload` | Form operations |
| **storage** | `cookies`, `storage`, `auth_state` | Browser state management |
| **network** | `request`, `capture`, `route` | HTTP requests and interception |
| **media** | `screenshot`, `pdf`, `record` | Capture page visuals |
| **emulate** | `viewport`, `device`, `geolocation`, `emulate` | Device simulation |
| **execute** | `evaluate`, `console` | Run JavaScript |
| **data** | `history`, `bookmarks` | Browser data access |
| **dialog** | `dialog` | Handle alerts/prompts |

## Basic Workflow

```
1. navigate https://example.com     # Open page
2. snapshot                         # Get element refs (@e1, @e2...)
3. click @e3                        # Click login button
4. fill @e5 "user@email.com"        # Fill email
5. fill @e6 "password"              # Fill password
6. click @e7                        # Submit
7. wait --for text "Welcome"        # Wait for success
```

## Get Help

- `help <category>` - Show commands in category (e.g., `help interact`)
- `help <command>` - Show command options (e.g., `help click`)
- `help examples` - Show common workflow examples
- `help selectors` - Learn about @refs and semantic selectors

## Element Targeting

```
@e1                    # Reference from snapshot
role:button            # By ARIA role
text:Submit            # By visible text
label:Email            # By label text
placeholder:Search     # By placeholder
#login-btn             # CSS selector
```
