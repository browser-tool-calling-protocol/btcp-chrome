# Media Commands

Capture screenshots, generate PDFs, and record activity.

## Commands

### screenshot

Capture page or element screenshot.

```
screenshot                                    # Viewport screenshot
screenshot --full-page                        # Entire page
screenshot --selector @e1                     # Specific element
screenshot --clip '{"x":0,"y":0,"width":800,"height":600}'  # Region
screenshot --format jpeg --quality 80         # JPEG with quality
screenshot --save-path "/tmp/shot.png"        # Save to file
screenshot --omit-background                  # Transparent background (PNG)
screenshot --scale 2                          # 2x resolution
```

**Options:**
| Option | Description |
|--------|-------------|
| `--selector` | Element to capture |
| `--full-page` | Capture entire scrollable page |
| `--format` | png (default), jpeg, webp |
| `--quality` | JPEG/WebP quality 0-100 |
| `--clip` | Capture specific region {x, y, width, height} |
| `--scale` | Scale factor (default: 1) |
| `--omit-background` | Transparent background |
| `--save-path` | Save to file (else returns base64) |

### pdf

Generate PDF of page.

```
pdf --save-path "/tmp/page.pdf"
pdf --save-path "/tmp/page.pdf" --format A4
pdf --save-path "/tmp/page.pdf" --landscape
pdf --save-path "/tmp/page.pdf" --print-background false
pdf --save-path "/tmp/page.pdf" --margin '{"top":"1in","bottom":"1in"}'
```

**Options:**
| Option | Description |
|--------|-------------|
| `--save-path` | Output file path (required) |
| `--format` | Letter, Legal, A0-A6, etc. |
| `--landscape` | Landscape orientation |
| `--scale` | Scale 0.1-2 (default: 1) |
| `--margin` | Page margins {top, bottom, left, right} |
| `--print-background` | Include background (default: true) |

### record

Record browser activity as GIF or video.

**Fixed FPS recording:**
```
record --action start --mode fixed_fps --fps 10
# ... perform actions ...
record --action stop --save-path "/tmp/demo.gif"
```

**Auto-capture mode (captures on actions):**
```
record --action start --mode auto_capture
click @e1
fill @e2 "test"
click @e3
record --action stop --save-path "/tmp/demo.gif"
```

**Manual frame capture:**
```
record --action start --mode auto_capture
click @e1
record --action capture_frame --annotation "Clicked login"
fill @e2 "user@email.com"
record --action capture_frame --annotation "Entered email"
record --action stop --save-path "/tmp/demo.gif"
```

**Options:**
| Option | Description |
|--------|-------------|
| `--action` | start, stop, capture_frame, status |
| `--mode` | fixed_fps, auto_capture |
| `--format` | gif (default), webm |
| `--fps` | Frames per second (fixed_fps mode) |
| `--max-duration` | Max recording time (ms) |
| `--max-frames` | Max frames to capture |
| `--width`, `--height` | Output dimensions |
| `--overlays` | Show click indicators, drag paths, labels |

## Common Patterns

**Document a workflow:**
```
record --action start --mode auto_capture --overlays '{"click_indicators":true}'
navigate https://app.example.com
snapshot
click @e1
fill @e2 "test@example.com"
click @e3
wait --for text "Success"
record --action stop --save-path "/tmp/workflow.gif"
```

**Compare before/after:**
```
screenshot --save-path "/tmp/before.png"
# ... make changes ...
screenshot --save-path "/tmp/after.png"
```

## Use `help <command>` for full schema.
