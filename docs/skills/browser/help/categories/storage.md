# Storage Commands

Manage cookies, localStorage, sessionStorage, and authentication state.

## Commands

### cookies

Manage browser cookies.

**Get cookies:**
```
cookies --action get --url https://example.com --name "session"
cookies --action get_all --url https://example.com
```

**Set cookie:**
```
cookies --action set --url https://example.com --name "token" --value "abc123"
cookies --action set --url https://example.com --name "prefs" --value "dark" \
  --expires 1735689600 --secure --same-site Lax
```

**Delete cookies:**
```
cookies --action delete --url https://example.com --name "session"
cookies --action clear                                    # Clear all
cookies --action clear --domain-filter "example.com"      # Clear for domain
```

### storage

Access localStorage and sessionStorage.

**Get/Set localStorage:**
```
storage --action get --key "user_prefs"
storage --action set --key "user_prefs" --value '{"theme":"dark"}'
storage --action remove --key "user_prefs"
storage --action clear
storage --action keys           # List all keys
storage --action entries        # Get all key-value pairs
storage --action length         # Count of items
```

**sessionStorage:**
```
storage --action get --type session --key "temp_data"
storage --action set --type session --key "temp_data" --value "xyz"
```

### auth_state

Save and restore authentication state (cookies + storage).

**Save auth state:**
```
# After logging in:
auth_state --action save --name "my_account"
auth_state --action save --name "my_account" --origins ["https://app.example.com"]
```

**Load auth state:**
```
# Before automation:
auth_state --action load --name "my_account"
```

**Manage saved states:**
```
auth_state --action list              # List saved states
auth_state --action delete --name "old_account"
```

## Common Patterns

**Login once, reuse session:**
```
# First time: Login manually or via automation
navigate https://app.example.com/login
fill @e1 "user@email.com"
fill @e2 "password"
click @e3
wait --for url --url "**/dashboard/**"
auth_state --action save --name "my_app"

# Later sessions:
auth_state --action load --name "my_app"
navigate https://app.example.com/dashboard  # Already logged in!
```

**Check login status via cookie:**
```
cookies --action get --url https://example.com --name "session"
# Returns cookie if logged in, null if not
```

**Clear all browser data:**
```
cookies --action clear
storage --action clear
storage --action clear --type session
```

## Use `help <command>` for full schema.
