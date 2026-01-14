# Workflow Examples

Common browser automation patterns.

## Login Flow

```
navigate https://app.example.com/login
snapshot --mode interactive

# Fill login form
fill @e2 "user@email.com"
fill @e3 "password123"
click @e4

# Wait for redirect
wait --for url --url "**/dashboard/**"

# Save auth for later
auth_state --action save --name "my_app"
```

## Form Submission

```
navigate https://example.com/contact
snapshot

# Fill form fields
fill "label:Name" "John Doe"
fill "label:Email" "john@example.com"
fill "label:Message" "Hello, I have a question..."
select "label:Subject" --label "General Inquiry"
check "label:Subscribe to newsletter"

# Submit
click "text:Send Message"
wait --for text "Thank you"
```

## Data Extraction

```
navigate https://news.example.com
snapshot

# Extract article data
evaluate --expression "
  [...document.querySelectorAll('.article')].map(a => ({
    title: a.querySelector('h2')?.textContent,
    summary: a.querySelector('.summary')?.textContent,
    link: a.querySelector('a')?.href,
    date: a.querySelector('.date')?.textContent
  }))
"
```

## Multi-Page Scraping

```
navigate https://shop.example.com/products
snapshot

# Get product links
evaluate --expression "
  [...document.querySelectorAll('.product a')].map(a => a.href)
"
# Returns: ["https://shop.example.com/product/1", ...]

# Visit each product
navigate https://shop.example.com/product/1
snapshot
# Extract details...

navigate https://shop.example.com/product/2
snapshot
# Extract details...
```

## Testing Mobile Responsiveness

```
# Desktop view
viewport --width 1920 --height 1080
navigate https://example.com
screenshot --save-path "/tmp/desktop.png"

# Tablet view
device --name "iPad Pro"
screenshot --save-path "/tmp/tablet.png"

# Mobile view
device --name "iPhone 14"
screenshot --save-path "/tmp/mobile.png"

# Reset
device --name "Desktop 1080p"
```

## Testing Dark Mode

```
navigate https://example.com

# Light mode
emulate --color-scheme light
screenshot --save-path "/tmp/light.png"

# Dark mode
emulate --color-scheme dark
screenshot --save-path "/tmp/dark.png"
```

## API Mocking for Testing

```
# Mock API response
route --action add --url-pattern "**/api/user" --handler fulfill \
  --response '{"status": 200, "json": {"name": "Test User", "role": "admin"}}'

navigate https://app.example.com
snapshot
# Page shows mocked user data

route --action clear
```

## Waiting for Dynamic Content

```
navigate https://app.example.com

# Wait for loading spinner to disappear
wait --for selector_hidden --selector ".loading-spinner"

# Wait for data to load
wait --for selector --selector ".data-table tbody tr"

# Wait for specific text
wait --for text "Results loaded"

# Wait for custom condition
wait --for function --function "return window.dataLoaded === true"
```

## Recording a Demo

```
record --action start --mode auto_capture --overlays '{"click_indicators": true}'

navigate https://app.example.com
snapshot
click @e1
fill @e2 "demo@example.com"
click @e3
wait --for text "Welcome"

record --action stop --save-path "/tmp/demo.gif"
```

## File Download

```
navigate https://example.com/downloads
snapshot

# Set up download wait
click @e5  # Download button

# Wait for download to complete
wait --for function --function "
  return new Promise(resolve => {
    chrome.downloads.search({state: 'complete'}, (downloads) => {
      resolve(downloads.length > 0);
    });
  });
"
```

## File Upload

```
navigate https://example.com/upload
snapshot

# Upload file
upload "label:Choose file" --files "/path/to/document.pdf"

# Or upload multiple files
upload @e3 --files ["/path/file1.jpg", "/path/file2.jpg"]

click "text:Upload"
wait --for text "Upload complete"
```

## Search and Filter

```
navigate https://shop.example.com

# Enter search
fill "placeholder:Search products" "laptop"
press Enter

wait --for selector --selector ".search-results"

# Apply filter
click "text:Price: Low to High"
wait --for load_state --load-state networkidle

# Get results
evaluate --expression "
  [...document.querySelectorAll('.product')].map(p => ({
    name: p.querySelector('.name')?.textContent,
    price: p.querySelector('.price')?.textContent
  }))
"
```

## Handling Pagination

```
navigate https://example.com/articles

# Process first page
snapshot
# ... extract data ...

# Go to next page
click "text:Next"
wait --for load_state --load-state networkidle

# Process second page
snapshot
# ... extract data ...

# Continue until no more pages
query --by text --value "Next" --return count
# If 0, no more pages
```

## Authenticated Session Reuse

```
# First run: Login and save state
navigate https://app.example.com/login
fill @e1 "user@email.com"
fill @e2 "password"
click @e3
wait --for url --url "**/dashboard/**"
auth_state --action save --name "my_app"

# Subsequent runs: Load saved state
auth_state --action load --name "my_app"
navigate https://app.example.com/dashboard
# Already logged in!
```
