# Element Selectors

How to target elements in browser commands.

## Selector Types

### 1. Element References (`@ref`)

**Best choice for most interactions.** References come from `snapshot` command.

```
snapshot
# Output:
# - button "Login" [ref=@e1]
# - textbox "Email" [ref=@e2]
# - textbox "Password" [ref=@e3]

click @e1
fill @e2 "user@email.com"
fill @e3 "password"
```

**Pros:**
- Guaranteed to target exact element
- Works even with complex/dynamic selectors
- Includes accessibility info

**Cons:**
- Need to run `snapshot` first
- Refs expire when page changes significantly

---

### 2. Semantic Locators

Target elements by accessibility properties. **No snapshot needed.**

| Syntax | Description | Example |
|--------|-------------|---------|
| `role:button` | ARIA role | `click "role:button"` |
| `role:button:Submit` | Role with name | `click "role:button:Submit"` |
| `text:Click me` | Visible text | `click "text:Click me"` |
| `label:Email` | Form label | `fill "label:Email" "test@test.com"` |
| `placeholder:Search` | Placeholder text | `fill "placeholder:Search" "query"` |
| `title:Close` | Title attribute | `click "title:Close"` |
| `alt:Logo` | Image alt text | `click "alt:Logo"` |
| `testid:submit-btn` | data-testid | `click "testid:submit-btn"` |

**Examples:**
```
click "role:button:Login"           # Button with name "Login"
click "text:Submit"                 # Element with text "Submit"
fill "label:Email address" "x@y.z" # Input with label "Email address"
fill "placeholder:Enter name" "Jo" # Input with placeholder
click "testid:nav-menu"            # Element with data-testid="nav-menu"
```

**Pros:**
- No snapshot needed
- Semantic, resilient to DOM changes
- Self-documenting

**Cons:**
- May match multiple elements (uses first match)
- Requires unique text/label

---

### 3. CSS Selectors

Standard CSS selectors for precise targeting.

```
click "#login-button"              # By ID
click ".btn.primary"               # By class
click "button[type='submit']"      # By attribute
click "form.login button"          # Nested selector
click "ul > li:first-child a"      # Complex selector
click "[data-action='delete']"     # Data attribute
```

**Pros:**
- Familiar syntax
- Very precise
- Works without snapshot

**Cons:**
- Brittle if DOM structure changes
- Can be complex

---

### 4. XPath Selectors

For complex selections CSS can't handle.

```
click "xpath=//button[contains(text(), 'Submit')]"
click "xpath=//div[@class='card']//a"
click "xpath=(//button)[2]"        # Second button
click "xpath=//input[@name='email']/..//button"  # Relative
```

**Pros:**
- Powerful traversal (parent, sibling)
- Text matching with contains()
- Position-based selection

**Cons:**
- Verbose syntax
- Can be fragile

---

### 5. Coordinates

Click at specific screen position.

```
click --coordinates 100,200        # Click at x=100, y=200
hover --coordinates 500,300        # Hover at position
drag --source-coordinates 100,100 --target-coordinates 300,300
```

**Pros:**
- Works when elements can't be selected
- Good for canvas/custom elements

**Cons:**
- Breaks with different viewport sizes
- Not semantic

---

## Selector Priority

When multiple selectors could work, prefer in this order:

1. **`@ref`** - Most reliable after snapshot
2. **Semantic** - `role:`, `label:`, `text:` - Resilient and clear
3. **`testid:`** - If app uses data-testid
4. **CSS ID** - `#element-id` - If stable IDs exist
5. **CSS class/attribute** - `.class`, `[attr]`
6. **XPath** - When others fail
7. **Coordinates** - Last resort

---

## Finding the Right Selector

### Method 1: Snapshot First

```
snapshot --mode interactive
# See all elements with refs, roles, names
# Choose the @ref for your target
```

### Method 2: Query to Explore

```
query --by role --value button --return all
# See all buttons with their accessible names

query --by text --value "Login" --return all
# Find elements containing "Login"
```

### Method 3: Evaluate for Complex Cases

```
evaluate --expression "
  document.querySelector('form.login')?.innerHTML
"
# Inspect DOM structure, then craft selector
```

---

## Common Patterns

**Form by label (most reliable):**
```
fill "label:First Name" "John"
fill "label:Last Name" "Doe"
fill "label:Email" "john@doe.com"
```

**Button by text:**
```
click "text:Sign In"
click "text:Continue"
click "text:Submit"
```

**Link by text:**
```
click "role:link:Learn More"
click "text:Click here"
```

**Checkbox by label:**
```
check "label:I agree to terms"
uncheck "label:Subscribe"
```

**Select by label:**
```
select "label:Country" --label "United States"
```

**When text isn't unique:**
```
snapshot
# Find the specific @ref for your element
click @e15
```

---

## Troubleshooting

**"Element not found"**
1. Run `snapshot` to see available elements
2. Check if element is in iframe (use `--frameId`)
3. Check if element is visible (`wait --for selector`)
4. Try different selector type

**"Multiple elements match"**
1. Use more specific selector
2. Add parent context: `form.login button`
3. Use `query --nth 0` for first match
4. Use `@ref` from snapshot

**"Element not interactable"**
1. Wait for element: `wait --for selector --selector "..." --state visible`
2. Scroll into view: `scroll --selector "..." --into-view`
3. Use `--force` option (not recommended)
