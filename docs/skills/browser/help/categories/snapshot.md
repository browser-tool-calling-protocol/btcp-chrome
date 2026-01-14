# Snapshot Commands

Get page structure and find elements.

## Commands

### snapshot

Capture accessibility tree with element refs.

```
snapshot                      # Full page
snapshot --mode interactive   # Only clickable/input elements
snapshot --mode focused       # From focused element subtree
snapshot --depth 3            # Limit tree depth
snapshot --selector "#main"   # Scope to container
snapshot --compact            # Hide unnamed containers
```

**Output:**
```
- heading "Login" [ref=@e1] [level=1]
- textbox "Email" [ref=@e2] [placeholder="Enter email"]
- textbox "Password" [ref=@e3] [type=password]
- button "Sign In" [ref=@e4]
- link "Forgot password?" [ref=@e5]
```

### query

Find elements without full snapshot.

```
query --by role --value button                    # All buttons
query --by text --value "Submit"                  # By text
query --by label --value "Email"                  # By label
query --by role --value button --name "Submit"    # Button named Submit
query --by role --value heading --level 1         # H1 headings
query --by text --value "Login" --return count    # Count matches
query --by role --value link --nth 0              # First link
query --by role --value checkbox --checked true   # Checked boxes
```

**Options:**
| Option | Values | Description |
|--------|--------|-------------|
| `--by` | role, text, label, placeholder, alt, title, testid | Locator type |
| `--return` | ref, count, text, attribute, bounds, all | What to return |
| `--nth` | number | Select nth match (0-indexed, -1 for last) |
| `--exact` | boolean | Exact text match |

## Use `help snapshot` or `help query` for full schema.
