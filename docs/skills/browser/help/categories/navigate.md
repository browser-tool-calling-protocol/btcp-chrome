# Navigate Commands

Control page navigation, tabs, and windows.

## Commands

### navigate

Navigate to URL or control history.

```
navigate https://example.com              # Go to URL
navigate --action back                    # Go back
navigate --action forward                 # Go forward
navigate --action reload                  # Reload page
navigate https://example.com --new-tab    # Open in new tab
navigate https://example.com --new-window # Open in new window
navigate https://example.com --wait-until networkidle  # Wait for network
navigate https://example.com --background # Don't focus
```

### url

Get current page URL.

```
url                     # Get active tab URL
url --tabId 123         # Get specific tab URL
```

### title

Get current page title.

```
title                   # Get active tab title
title --tabId 123       # Get specific tab title
```

### tab_list

List all open tabs.

```
tab_list                # All tabs
tab_list --windowId 1   # Tabs in specific window
```

**Output:**
```
[
  { "id": 123, "url": "https://example.com", "title": "Example", "active": true },
  { "id": 124, "url": "https://google.com", "title": "Google", "active": false }
]
```

### tab_new

Create new tab.

```
tab_new                           # New blank tab
tab_new --url https://example.com # New tab with URL
tab_new --url https://example.com --active false  # Background tab
```

### tab_switch

Switch to tab.

```
tab_switch --tabId 123  # Switch by ID
tab_switch --index 0    # Switch to first tab
```

### tab_close

Close tabs.

```
tab_close                     # Close active tab
tab_close --tabId 123         # Close specific tab
tab_close --tabId [123, 124]  # Close multiple tabs
tab_close --url "*example*"   # Close tabs matching URL
```

### window_new

Create new window.

```
window_new                              # New window
window_new --url https://example.com    # With URL
window_new --width 1920 --height 1080   # Custom size
window_new --incognito                  # Incognito window
```

## Common Patterns

**Open multiple pages:**
```
navigate https://page1.com --new-tab
navigate https://page2.com --new-tab
navigate https://page3.com --new-tab
```

**Switch between tabs:**
```
tab_list                # See all tabs
tab_switch --tabId 124  # Switch to tab
```

## Use `help <command>` for full schema.
