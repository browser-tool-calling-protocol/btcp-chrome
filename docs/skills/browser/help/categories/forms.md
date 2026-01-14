# Forms Commands

Work with form elements: checkboxes, selects, file uploads.

## Commands

### check

Check a checkbox or radio button.

```
check @e1                    # Check by ref
check "label:Remember me"    # Check by label
check @e1 --force            # Force check even if hidden
```

### uncheck

Uncheck a checkbox.

```
uncheck @e1                  # Uncheck by ref
uncheck "label:Subscribe"    # Uncheck by label
```

### select

Select option(s) in dropdown.

```
select @e1 --value "us"              # Select by value
select @e1 --label "United States"   # Select by label text
select @e1 --index 0                 # Select first option
select @e1 --value ["us", "uk"]      # Multi-select by values
select @e1 --label ["Red", "Blue"]   # Multi-select by labels
```

### clear

Clear input field.

```
clear @e1                    # Clear by ref
clear "label:Search"         # Clear by label
```

### focus

Focus an element.

```
focus @e1                    # Focus by ref
focus "#search-input"        # Focus by selector
```

### upload

Upload files to file input.

```
upload @e1 --files "/path/to/file.pdf"
upload @e1 --files ["/path/file1.jpg", "/path/file2.jpg"]
upload @e1 --files [{ "url": "https://example.com/image.png", "name": "image.png" }]
upload @e1 --files [{ "base64": "...", "name": "doc.pdf", "mime_type": "application/pdf" }]
```

## Common Patterns

**Fill complete form:**
```
fill @e1 "John Doe"                    # Name
fill @e2 "john@example.com"            # Email
select @e3 --label "United States"     # Country dropdown
check @e4                              # Terms checkbox
upload @e5 --files "/path/resume.pdf"  # File upload
click @e6                              # Submit
```

**Toggle checkbox based on state:**
```
query --by role --value checkbox --name "Subscribe" --return all
# Returns: { "checked": true, ... }
# Then uncheck if needed:
uncheck "label:Subscribe"
```

## Use `help <command>` for full schema.
