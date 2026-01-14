# Data Commands

Access browser history and bookmarks.

## Commands

### history

Search browsing history.

```
history                                    # Recent history (24h)
history --query "github"                   # Search by keyword
history --start-time "1 week ago"          # Last week
history --start-time "2024-01-01"          # Since specific date
history --start-time "today"               # Today only
history --start-time "yesterday" --end-time "today"
history --max-results 50                   # Limit results
history --exclude-current-tabs             # Exclude open tabs
```

**Time formats:**
- ISO: `2024-01-15`, `2024-01-15T14:30:00`
- Relative: `1 day ago`, `2 weeks ago`, `3 months ago`
- Keywords: `now`, `today`, `yesterday`

**Output:**
```
[
  {
    "id": "123",
    "url": "https://github.com/...",
    "title": "GitHub - Repository",
    "lastVisitTime": 1705123456789,
    "visitCount": 5
  }
]
```

### bookmarks

Manage bookmarks.

**Search bookmarks:**
```
bookmarks --action search                        # All bookmarks
bookmarks --action search --query "react"        # Search by keyword
bookmarks --action search --folder "Work"        # In specific folder
bookmarks --action search --max-results 20       # Limit results
```

**Add bookmark:**
```
bookmarks --action add --url "https://example.com" --title "Example"
bookmarks --action add --url "https://example.com" \
  --title "Example" --parent-folder "Work/Projects"
bookmarks --action add --url "https://example.com" \
  --parent-folder "New Folder" --create-folder
```

**Delete bookmark:**
```
bookmarks --action delete --bookmark-id "123"
bookmarks --action delete --url "https://example.com"
```

**List folders:**
```
bookmarks --action list_folders
```

**Output (search):**
```
[
  {
    "id": "456",
    "title": "React Documentation",
    "url": "https://react.dev",
    "parentId": "789",
    "dateAdded": 1705123456789
  }
]
```

## Common Patterns

**Find recently visited pages:**
```
history --start-time "1 hour ago" --max-results 10
```

**Search history for specific domain:**
```
history --query "stackoverflow.com"
```

**Bookmark current page:**
```
url  # Get current URL
title  # Get current title
bookmarks --action add --url "https://..." --title "..."
```

**Organize research:**
```
bookmarks --action add --url "https://paper1.com" \
  --title "Paper 1" --parent-folder "Research/AI" --create-folder
bookmarks --action add --url "https://paper2.com" \
  --title "Paper 2" --parent-folder "Research/AI"
```

**Find pages you visited but closed:**
```
history --start-time "today" --exclude-current-tabs
```

## Use `help <command>` for full schema.
