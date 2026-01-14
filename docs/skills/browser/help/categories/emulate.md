# Emulate Commands

Simulate devices, viewports, locations, and browser conditions.

## Commands

### viewport

Set viewport size and device characteristics.

```
viewport --width 1920 --height 1080                # Desktop
viewport --width 375 --height 812 --is-mobile      # Mobile
viewport --width 768 --height 1024 --has-touch     # Tablet with touch
viewport --width 1440 --height 900 --device-scale-factor 2  # Retina
```

### device

Emulate specific device presets.

```
device --name "iPhone 14"
device --name "iPhone 14 Pro Max"
device --name "Pixel 7"
device --name "iPad Pro"
device --name "Desktop 1080p"
device --name "Desktop 4K"
```

**Custom device:**
```
device --custom '{
  "viewport": {"width": 400, "height": 800},
  "user_agent": "Mozilla/5.0 (iPhone; ...) Safari/...",
  "device_scale_factor": 3,
  "is_mobile": true,
  "has_touch": true
}'
```

**Available presets:**
- iPhone 14, iPhone 14 Pro Max, iPhone SE
- iPad Pro, iPad Mini
- Pixel 7, Pixel 7 Pro
- Samsung Galaxy S23
- Desktop 1080p, Desktop 1440p, Desktop 4K

### geolocation

Set geographic location.

```
geolocation --latitude 37.7749 --longitude -122.4194    # San Francisco
geolocation --latitude 51.5074 --longitude -0.1278      # London
geolocation --latitude 35.6762 --longitude 139.6503     # Tokyo
geolocation --clear                                      # Remove override
```

### permissions

Override browser permissions.

```
permissions --permissions '[{"name":"geolocation","state":"granted"}]'
permissions --permissions '[{"name":"notifications","state":"denied"}]'
permissions --permissions '[
  {"name":"camera","state":"granted"},
  {"name":"microphone","state":"granted"}
]'
```

**Permission names:** geolocation, notifications, camera, microphone, clipboard-read, clipboard-write

**States:** granted, denied, prompt

### emulate

Advanced emulation settings.

```
emulate --color-scheme dark                    # Dark mode
emulate --color-scheme light                   # Light mode
emulate --reduced-motion reduce                # Prefer reduced motion
emulate --media print                          # Print media
emulate --timezone "America/New_York"          # Timezone
emulate --locale "fr-FR"                       # French locale
emulate --offline                              # Offline mode
emulate --network-throttle slow_3g             # Slow network
emulate --cpu-throttle 4                       # 4x CPU slowdown
```

**Network throttle presets:** offline, slow_3g, fast_3g, 4g

## Common Patterns

**Test mobile responsiveness:**
```
device --name "iPhone 14"
navigate https://example.com
screenshot --save-path "/tmp/mobile.png"
device --name "Desktop 1080p"
screenshot --save-path "/tmp/desktop.png"
```

**Test dark mode:**
```
emulate --color-scheme dark
navigate https://example.com
screenshot --save-path "/tmp/dark.png"
emulate --color-scheme light
screenshot --save-path "/tmp/light.png"
```

**Test slow network:**
```
emulate --network-throttle slow_3g
navigate https://example.com
# Observe loading behavior
emulate --network-throttle 4g  # Reset
```

**Test geolocation feature:**
```
permissions --permissions '[{"name":"geolocation","state":"granted"}]'
geolocation --latitude 40.7128 --longitude -74.0060  # New York
navigate https://maps.example.com
# App should show New York location
```

## Use `help <command>` for full schema.
