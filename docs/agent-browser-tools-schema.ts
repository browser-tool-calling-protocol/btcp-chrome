/**
 * Agent Browser Tools Schema Definition
 *
 * This file defines the new tool schemas following the agent-browser style.
 * It serves as the specification for implementing the redesigned tool interface.
 */

import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// Common Schemas
// ============================================================================

const CoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const ModifiersSchema = z.array(z.enum(['Alt', 'Control', 'Meta', 'Shift']));

// Common targeting parameters
const TabTargetSchema = z.object({
  tabId: z.number().optional().describe('Target tab ID'),
  frameId: z.number().optional().describe('Target frame ID for iframe support'),
});

// ============================================================================
// Tool Name Constants
// ============================================================================

export const TOOL_NAMES = {
  // Snapshot & Query
  SNAPSHOT: 'snapshot',
  QUERY: 'query',
  LOCATOR: 'locator',

  // Navigation
  NAVIGATE: 'navigate',
  URL: 'url',
  TITLE: 'title',

  // Interaction
  CLICK: 'click',
  DBLCLICK: 'dblclick',
  HOVER: 'hover',
  FILL: 'fill',
  TYPE: 'type',
  PRESS: 'press',
  DRAG: 'drag',
  SCROLL: 'scroll',
  UPLOAD: 'upload',

  // Forms
  CHECK: 'check',
  UNCHECK: 'uncheck',
  SELECT: 'select',
  CLEAR: 'clear',
  FOCUS: 'focus',

  // Wait
  WAIT: 'wait',

  // Tabs & Windows
  TAB_NEW: 'tab_new',
  TAB_LIST: 'tab_list',
  TAB_SWITCH: 'tab_switch',
  TAB_CLOSE: 'tab_close',
  WINDOW_NEW: 'window_new',

  // Storage
  COOKIES: 'cookies',
  STORAGE: 'storage',
  AUTH_STATE: 'auth_state',

  // Network
  REQUEST: 'request',
  CAPTURE: 'capture',
  ROUTE: 'route',

  // Media
  SCREENSHOT: 'screenshot',
  PDF: 'pdf',
  RECORD: 'record',

  // Emulation
  VIEWPORT: 'viewport',
  DEVICE: 'device',
  GEOLOCATION: 'geolocation',
  PERMISSIONS: 'permissions',
  EMULATE: 'emulate',

  // Execution
  EVALUATE: 'evaluate',
  CONSOLE: 'console',

  // Browser Data
  HISTORY: 'history',
  BOOKMARKS: 'bookmarks',

  // Dialogs
  DIALOG: 'dialog',
} as const;

// ============================================================================
// Tool Aliases (for backwards compatibility)
// ============================================================================

export const TOOL_ALIASES: Record<string, string> = {
  // Old chrome_* names -> new names
  get_windows_and_tabs: TOOL_NAMES.TAB_LIST,
  chrome_navigate: TOOL_NAMES.NAVIGATE,
  chrome_screenshot: TOOL_NAMES.SCREENSHOT,
  chrome_close_tabs: TOOL_NAMES.TAB_CLOSE,
  chrome_switch_tab: TOOL_NAMES.TAB_SWITCH,
  chrome_read_page: TOOL_NAMES.SNAPSHOT,
  chrome_click_element: TOOL_NAMES.CLICK,
  chrome_fill_or_select: TOOL_NAMES.FILL, // Note: also maps to select/check/uncheck
  chrome_keyboard: TOOL_NAMES.PRESS,
  chrome_javascript: TOOL_NAMES.EVALUATE,
  chrome_console: TOOL_NAMES.CONSOLE,
  chrome_network_capture: TOOL_NAMES.CAPTURE,
  chrome_network_request: TOOL_NAMES.REQUEST,
  chrome_history: TOOL_NAMES.HISTORY,
  chrome_bookmark_search: TOOL_NAMES.BOOKMARKS,
  chrome_bookmark_add: TOOL_NAMES.BOOKMARKS,
  chrome_bookmark_delete: TOOL_NAMES.BOOKMARKS,
  chrome_upload_file: TOOL_NAMES.UPLOAD,
  chrome_handle_dialog: TOOL_NAMES.DIALOG,
  chrome_gif_recorder: TOOL_NAMES.RECORD,
};

// ============================================================================
// Zod Input Schemas
// ============================================================================

// Snapshot Tool
export const SnapshotInputSchema = z.object({
  mode: z
    .enum(['full', 'interactive', 'focused'])
    .default('full')
    .describe('full: all elements, interactive: actionable only, focused: from focused element'),
  depth: z.number().optional().describe('Maximum tree depth'),
  selector: z.string().optional().describe('Scope to elements within this @ref or selector'),
  compact: z.boolean().default(false).describe('Compact output, filter unnamed containers'),
  include_text: z.boolean().default(true).describe('Include text content'),
  include_bounds: z.boolean().default(false).describe('Include bounding box coordinates'),
  ...TabTargetSchema.shape,
});

// Query Tool
export const QueryInputSchema = z.object({
  by: z.enum(['role', 'text', 'label', 'placeholder', 'alt', 'title', 'testid']),
  value: z.string().describe('Value to match'),
  options: z
    .object({
      exact: z.boolean().default(false).describe('Exact text match'),
      name: z.string().optional().describe('For role: filter by accessible name'),
      level: z.number().optional().describe('For heading: heading level'),
      checked: z.boolean().optional().describe('For checkbox/radio: checked state'),
      pressed: z.boolean().optional().describe('For button: pressed state'),
      expanded: z.boolean().optional().describe('For expandable: expanded state'),
      include_hidden: z.boolean().default(false),
    })
    .optional(),
  nth: z.number().optional().describe('Select nth match (0-indexed, -1 for last)'),
  return: z
    .enum(['ref', 'count', 'text', 'attribute', 'bounds', 'all'])
    .default('ref')
    .describe('What to return'),
  attribute: z.string().optional().describe('Attribute name when return=attribute'),
  ...TabTargetSchema.shape,
});

// Navigate Tool
export const NavigateInputSchema = z.object({
  url: z.string().optional().describe('URL to navigate to'),
  action: z.enum(['goto', 'back', 'forward', 'reload']).default('goto'),
  wait_until: z.enum(['load', 'domcontentloaded', 'networkidle']).default('load'),
  timeout: z.number().default(30000),
  new_tab: z.boolean().default(false),
  new_window: z.boolean().default(false),
  window_size: z
    .object({
      width: z.number().default(1280),
      height: z.number().default(720),
    })
    .optional(),
  background: z.boolean().default(false),
  headers: z.record(z.string()).optional(),
  ...TabTargetSchema.shape,
  windowId: z.number().optional(),
});

// Click Tool
export const ClickInputSchema = z.object({
  selector: z.string().optional().describe('@ref, CSS selector, or semantic locator'),
  coordinates: CoordinatesSchema.optional(),
  button: z.enum(['left', 'right', 'middle']).default('left'),
  click_count: z.number().default(1),
  modifiers: ModifiersSchema.optional(),
  force: z.boolean().default(false),
  no_wait_after: z.boolean().default(false),
  timeout: z.number().default(5000),
  ...TabTargetSchema.shape,
});

// Double Click Tool
export const DblClickInputSchema = z.object({
  selector: z.string().optional(),
  coordinates: CoordinatesSchema.optional(),
  modifiers: ModifiersSchema.optional(),
  timeout: z.number().default(5000),
  ...TabTargetSchema.shape,
});

// Hover Tool
export const HoverInputSchema = z.object({
  selector: z.string().optional(),
  coordinates: CoordinatesSchema.optional(),
  timeout: z.number().default(5000),
  ...TabTargetSchema.shape,
});

// Fill Tool
export const FillInputSchema = z.object({
  selector: z.string().describe('@ref, CSS selector, or semantic locator'),
  value: z.string().describe('Text to fill'),
  clear: z.boolean().default(true),
  force: z.boolean().default(false),
  timeout: z.number().default(5000),
  ...TabTargetSchema.shape,
});

// Type Tool
export const TypeInputSchema = z.object({
  selector: z.string().optional().describe('@ref or selector, omit for focused element'),
  text: z.string().describe('Text to type'),
  delay: z.number().default(50).describe('Delay between keystrokes (ms)'),
  ...TabTargetSchema.shape,
});

// Press Tool
export const PressInputSchema = z.object({
  selector: z.string().optional(),
  key: z.string().describe('Key or combination: Enter, Tab, Control+c, etc.'),
  repeat: z.number().default(1),
  delay: z.number().default(0),
  ...TabTargetSchema.shape,
});

// Drag Tool
export const DragInputSchema = z.object({
  source: z.string().optional().describe('@ref or selector of element to drag'),
  source_coordinates: CoordinatesSchema.optional(),
  target: z.string().optional().describe('@ref or selector of drop target'),
  target_coordinates: CoordinatesSchema.optional(),
  steps: z.number().default(10),
  timeout: z.number().default(5000),
  ...TabTargetSchema.shape,
});

// Scroll Tool
export const ScrollInputSchema = z.object({
  selector: z.string().optional(),
  direction: z.enum(['up', 'down', 'left', 'right']).optional(),
  amount: z.number().optional(),
  position: CoordinatesSchema.optional(),
  into_view: z.boolean().default(false),
  block: z.enum(['start', 'center', 'end', 'nearest']).default('center'),
  smooth: z.boolean().default(false),
  ...TabTargetSchema.shape,
});

// Upload Tool
export const UploadInputSchema = z.object({
  selector: z.string().describe('@ref or selector of file input'),
  files: z.array(
    z.union([
      z.string().describe('Local file path'),
      z.object({
        path: z.string().optional(),
        url: z.string().optional(),
        base64: z.string().optional(),
        name: z.string().optional(),
        mime_type: z.string().optional(),
      }),
    ])
  ),
  timeout: z.number().default(30000),
  ...TabTargetSchema.shape,
});

// Check Tool
export const CheckInputSchema = z.object({
  selector: z.string(),
  force: z.boolean().default(false),
  timeout: z.number().default(5000),
  ...TabTargetSchema.shape,
});

// Uncheck Tool
export const UncheckInputSchema = CheckInputSchema;

// Select Tool
export const SelectInputSchema = z.object({
  selector: z.string(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  label: z.union([z.string(), z.array(z.string())]).optional(),
  index: z.union([z.number(), z.array(z.number())]).optional(),
  timeout: z.number().default(5000),
  ...TabTargetSchema.shape,
});

// Clear Tool
export const ClearInputSchema = z.object({
  selector: z.string(),
  timeout: z.number().default(5000),
  ...TabTargetSchema.shape,
});

// Focus Tool
export const FocusInputSchema = ClearInputSchema;

// Wait Tool
export const WaitInputSchema = z.object({
  for: z.enum([
    'selector',
    'selector_hidden',
    'text',
    'text_hidden',
    'url',
    'load_state',
    'function',
    'timeout',
  ]),
  selector: z.string().optional(),
  state: z.enum(['attached', 'detached', 'visible', 'hidden']).default('visible'),
  text: z.string().optional(),
  url: z.string().optional(),
  load_state: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  function: z.string().optional(),
  polling: z.number().default(100),
  duration: z.number().optional(),
  timeout: z.number().default(30000),
  ...TabTargetSchema.shape,
});

// Tab New Tool
export const TabNewInputSchema = z.object({
  url: z.string().optional(),
  active: z.boolean().default(true),
  windowId: z.number().optional(),
});

// Tab List Tool
export const TabListInputSchema = z.object({
  windowId: z.number().optional(),
});

// Tab Switch Tool
export const TabSwitchInputSchema = z.object({
  tabId: z.number().optional(),
  index: z.number().optional(),
});

// Tab Close Tool
export const TabCloseInputSchema = z.object({
  tabId: z.union([z.number(), z.array(z.number())]).optional(),
  url: z.string().optional(),
});

// Window New Tool
export const WindowNewInputSchema = z.object({
  url: z.string().optional(),
  width: z.number().default(1280),
  height: z.number().default(720),
  incognito: z.boolean().default(false),
});

// Cookies Tool
export const CookiesInputSchema = z.object({
  action: z.enum(['get', 'get_all', 'set', 'delete', 'clear']),
  url: z.string().optional(),
  name: z.string().optional(),
  value: z.string().optional(),
  domain: z.string().optional(),
  path: z.string().default('/'),
  secure: z.boolean().optional(),
  http_only: z.boolean().optional(),
  same_site: z.enum(['Strict', 'Lax', 'None']).optional(),
  expires: z.number().optional(),
  domain_filter: z.string().optional(),
});

// Storage Tool
export const StorageInputSchema = z.object({
  action: z.enum(['get', 'set', 'remove', 'clear', 'keys', 'entries', 'length']),
  type: z.enum(['local', 'session']).default('local'),
  key: z.string().optional(),
  value: z.string().optional(),
  ...TabTargetSchema.shape,
});

// Auth State Tool
export const AuthStateInputSchema = z.object({
  action: z.enum(['save', 'load', 'list', 'delete']),
  name: z.string().optional(),
  origins: z.array(z.string()).optional(),
  include_local_storage: z.boolean().default(true),
  include_session_storage: z.boolean().default(false),
  ...TabTargetSchema.shape,
});

// Request Tool
export const RequestInputSchema = z.object({
  url: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  json: z.record(z.unknown()).optional(),
  form_data: z.record(z.unknown()).optional(),
  timeout: z.number().default(30000),
  follow_redirects: z.boolean().default(true),
  ...TabTargetSchema.shape,
});

// Capture Tool
export const CaptureInputSchema = z.object({
  action: z.enum(['start', 'stop', 'status']),
  include_bodies: z.boolean().default(false),
  filter: z
    .object({
      url_pattern: z.string().optional(),
      resource_types: z
        .array(
          z.enum([
            'document',
            'stylesheet',
            'image',
            'media',
            'font',
            'script',
            'xhr',
            'fetch',
            'websocket',
            'other',
          ])
        )
        .optional(),
      methods: z.array(z.string()).optional(),
    })
    .optional(),
  max_capture_time: z.number().default(180000),
  ...TabTargetSchema.shape,
});

// Route Tool
export const RouteInputSchema = z.object({
  action: z.enum(['add', 'remove', 'clear', 'list']),
  url_pattern: z.string().optional(),
  handler: z.enum(['abort', 'fulfill', 'continue']).optional(),
  response: z
    .object({
      status: z.number().default(200),
      headers: z.record(z.string()).optional(),
      body: z.string().optional(),
      json: z.record(z.unknown()).optional(),
    })
    .optional(),
  modify: z
    .object({
      url: z.string().optional(),
      method: z.string().optional(),
      headers: z.record(z.string()).optional(),
      post_data: z.string().optional(),
    })
    .optional(),
  route_id: z.string().optional(),
  ...TabTargetSchema.shape,
});

// Screenshot Tool
export const ScreenshotInputSchema = z.object({
  selector: z.string().optional(),
  full_page: z.boolean().default(false),
  format: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().optional(),
  omit_background: z.boolean().default(false),
  clip: BoundingBoxSchema.optional(),
  scale: z.number().default(1),
  save_path: z.string().optional(),
  ...TabTargetSchema.shape,
});

// PDF Tool
export const PdfInputSchema = z.object({
  format: z
    .enum(['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'])
    .default('Letter'),
  landscape: z.boolean().default(false),
  scale: z.number().default(1),
  margin: z
    .object({
      top: z.string().optional(),
      bottom: z.string().optional(),
      left: z.string().optional(),
      right: z.string().optional(),
    })
    .optional(),
  display_header_footer: z.boolean().default(false),
  header_template: z.string().optional(),
  footer_template: z.string().optional(),
  print_background: z.boolean().default(true),
  prefer_css_page_size: z.boolean().default(false),
  save_path: z.string(),
  ...TabTargetSchema.shape,
});

// Record Tool
export const RecordInputSchema = z.object({
  action: z.enum(['start', 'stop', 'capture_frame', 'status']),
  mode: z.enum(['fixed_fps', 'auto_capture']).default('auto_capture'),
  format: z.enum(['gif', 'webm']).default('gif'),
  fps: z.number().default(5),
  max_duration: z.number().default(30000),
  max_frames: z.number().default(100),
  width: z.number().default(800),
  height: z.number().default(600),
  annotation: z.string().optional(),
  save_path: z.string().optional(),
  overlays: z
    .object({
      click_indicators: z.boolean().default(true),
      drag_paths: z.boolean().default(true),
      action_labels: z.boolean().default(true),
    })
    .optional(),
  ...TabTargetSchema.shape,
});

// Viewport Tool
export const ViewportInputSchema = z.object({
  width: z.number(),
  height: z.number(),
  device_scale_factor: z.number().default(1),
  is_mobile: z.boolean().default(false),
  has_touch: z.boolean().default(false),
  is_landscape: z.boolean().default(false),
  ...TabTargetSchema.shape,
});

// Device Tool
export const DeviceInputSchema = z.object({
  name: z
    .enum([
      'iPhone 14',
      'iPhone 14 Pro Max',
      'iPhone SE',
      'iPad Pro',
      'iPad Mini',
      'Pixel 7',
      'Pixel 7 Pro',
      'Samsung Galaxy S23',
      'Desktop 1080p',
      'Desktop 1440p',
      'Desktop 4K',
    ])
    .optional(),
  custom: z
    .object({
      viewport: z.object({
        width: z.number(),
        height: z.number(),
      }),
      user_agent: z.string().optional(),
      device_scale_factor: z.number().optional(),
      is_mobile: z.boolean().optional(),
      has_touch: z.boolean().optional(),
    })
    .optional(),
  ...TabTargetSchema.shape,
});

// Geolocation Tool
export const GeolocationInputSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().default(100),
  clear: z.boolean().default(false),
  ...TabTargetSchema.shape,
});

// Permissions Tool
export const PermissionsInputSchema = z.object({
  permissions: z.array(
    z.object({
      name: z.enum([
        'geolocation',
        'notifications',
        'camera',
        'microphone',
        'clipboard-read',
        'clipboard-write',
      ]),
      state: z.enum(['granted', 'denied', 'prompt']),
    })
  ),
  origin: z.string().optional(),
  ...TabTargetSchema.shape,
});

// Emulate Tool
export const EmulateInputSchema = z.object({
  color_scheme: z.enum(['light', 'dark', 'no-preference']).optional(),
  reduced_motion: z.enum(['reduce', 'no-preference']).optional(),
  forced_colors: z.enum(['active', 'none']).optional(),
  media: z.enum(['screen', 'print']).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  offline: z.boolean().default(false),
  cpu_throttle: z.number().optional(),
  network_throttle: z.enum(['offline', 'slow_3g', 'fast_3g', '4g']).optional(),
  ...TabTargetSchema.shape,
});

// Evaluate Tool
export const EvaluateInputSchema = z.object({
  expression: z.string(),
  args: z.array(z.unknown()).optional(),
  await_promise: z.boolean().default(true),
  return_by_value: z.boolean().default(true),
  timeout: z.number().default(30000),
  max_output_size: z.number().default(51200),
  sanitize: z.boolean().default(true),
  ...TabTargetSchema.shape,
});

// Console Tool
export const ConsoleInputSchema = z.object({
  action: z.enum(['get', 'clear', 'start_buffer', 'stop_buffer']).default('get'),
  level: z.array(z.enum(['log', 'info', 'warn', 'error', 'debug'])).optional(),
  pattern: z.string().optional(),
  include_exceptions: z.boolean().default(true),
  max_messages: z.number().default(100),
  clear_after_read: z.boolean().default(false),
  ...TabTargetSchema.shape,
});

// History Tool
export const HistoryInputSchema = z.object({
  query: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  max_results: z.number().default(100),
  exclude_current_tabs: z.boolean().default(false),
});

// Bookmarks Tool
export const BookmarksInputSchema = z.object({
  action: z.enum(['search', 'add', 'delete', 'list_folders']),
  query: z.string().optional(),
  folder: z.string().optional(),
  max_results: z.number().default(50),
  url: z.string().optional(),
  title: z.string().optional(),
  parent_folder: z.string().optional(),
  create_folder: z.boolean().default(false),
  bookmark_id: z.string().optional(),
});

// Dialog Tool
export const DialogInputSchema = z.object({
  action: z.enum(['accept', 'dismiss', 'get_message']),
  prompt_text: z.string().optional(),
  auto_handle: z
    .object({
      enabled: z.boolean(),
      default_action: z.enum(['accept', 'dismiss']).optional(),
      prompt_default_text: z.string().optional(),
    })
    .optional(),
  ...TabTargetSchema.shape,
});

// URL Tool
export const UrlInputSchema = z.object({
  ...TabTargetSchema.shape,
});

// Title Tool
export const TitleInputSchema = z.object({
  ...TabTargetSchema.shape,
});

// ============================================================================
// Schema to JSON Schema Converter
// ============================================================================

function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  // This is a simplified converter - in production, use zod-to-json-schema library
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const zodValue = value as z.ZodTypeAny;
      properties[key] = zodToJsonSchema(zodValue);

      if (!(zodValue instanceof z.ZodOptional) && !(zodValue instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: 'string' };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: 'number' };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: 'boolean' };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: 'array',
      items: zodToJsonSchema(schema.element),
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: schema.options,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodDefault) {
    const inner = zodToJsonSchema(schema._def.innerType);
    return {
      ...inner,
      default: schema._def.defaultValue(),
    };
  }

  if (schema instanceof z.ZodUnion) {
    return {
      oneOf: schema.options.map((opt: z.ZodTypeAny) => zodToJsonSchema(opt)),
    };
  }

  return { type: 'object' };
}

// ============================================================================
// MCP Tool Schemas
// ============================================================================

export const TOOL_SCHEMAS: Tool[] = [
  // Snapshot & Query
  {
    name: TOOL_NAMES.SNAPSHOT,
    description:
      'Capture accessibility tree with element references (@e1, @e2, etc.) for subsequent interactions. Elements can be targeted by their @ref in click, fill, and other commands.',
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['full', 'interactive', 'focused'],
          default: 'full',
          description:
            'full: all elements, interactive: actionable elements only, focused: subtree from focused element',
        },
        depth: { type: 'number', description: 'Maximum tree depth' },
        selector: { type: 'string', description: 'Scope to elements within this @ref or selector' },
        compact: {
          type: 'boolean',
          default: false,
          description: 'Compact output, filter unnamed containers',
        },
        include_text: { type: 'boolean', default: true, description: 'Include text content' },
        include_bounds: {
          type: 'boolean',
          default: false,
          description: 'Include bounding box coordinates',
        },
        tabId: { type: 'number', description: 'Target tab ID' },
        frameId: { type: 'number', description: 'Target frame ID' },
      },
    },
  },
  {
    name: TOOL_NAMES.QUERY,
    description:
      'Find elements using semantic locators (role, text, label, placeholder, etc.) without full snapshot',
    inputSchema: {
      type: 'object',
      properties: {
        by: {
          type: 'string',
          enum: ['role', 'text', 'label', 'placeholder', 'alt', 'title', 'testid'],
          description: 'Locator strategy',
        },
        value: { type: 'string', description: 'Value to match' },
        options: {
          type: 'object',
          properties: {
            exact: { type: 'boolean', default: false, description: 'Exact text match' },
            name: { type: 'string', description: 'For role: filter by accessible name' },
            level: { type: 'number', description: 'For heading: heading level' },
            checked: { type: 'boolean', description: 'For checkbox/radio: checked state' },
            include_hidden: { type: 'boolean', default: false },
          },
        },
        nth: { type: 'number', description: 'Select nth match (0-indexed, -1 for last)' },
        return: {
          type: 'string',
          enum: ['ref', 'count', 'text', 'attribute', 'bounds', 'all'],
          default: 'ref',
        },
        attribute: { type: 'string', description: 'Attribute name when return=attribute' },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['by', 'value'],
    },
  },

  // Navigation
  {
    name: TOOL_NAMES.NAVIGATE,
    description: 'Navigate to URL, go back/forward, or reload the page',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to navigate to' },
        action: {
          type: 'string',
          enum: ['goto', 'back', 'forward', 'reload'],
          default: 'goto',
        },
        wait_until: {
          type: 'string',
          enum: ['load', 'domcontentloaded', 'networkidle'],
          default: 'load',
        },
        timeout: { type: 'number', default: 30000 },
        new_tab: { type: 'boolean', default: false },
        new_window: { type: 'boolean', default: false },
        window_size: {
          type: 'object',
          properties: {
            width: { type: 'number', default: 1280 },
            height: { type: 'number', default: 720 },
          },
        },
        background: { type: 'boolean', default: false },
        headers: { type: 'object', description: 'Extra HTTP headers' },
        tabId: { type: 'number' },
        windowId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.URL,
    description: 'Get current page URL',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.TITLE,
    description: 'Get current page title',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'number' },
      },
    },
  },

  // Interaction
  {
    name: TOOL_NAMES.CLICK,
    description: 'Click on an element using @ref, CSS selector, semantic locator, or coordinates',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: '@ref, CSS selector, or semantic (role:button, text:Submit)',
        },
        coordinates: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        button: { type: 'string', enum: ['left', 'right', 'middle'], default: 'left' },
        click_count: { type: 'number', default: 1, description: '2 for double-click' },
        modifiers: {
          type: 'array',
          items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] },
        },
        force: { type: 'boolean', default: false },
        no_wait_after: { type: 'boolean', default: false },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.DBLCLICK,
    description: 'Double-click on an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        coordinates: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        modifiers: {
          type: 'array',
          items: { type: 'string', enum: ['Alt', 'Control', 'Meta', 'Shift'] },
        },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.HOVER,
    description: 'Hover over an element to trigger hover states',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        coordinates: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.FILL,
    description: 'Fill an input, textarea, or contenteditable element with a value',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: '@ref, CSS selector, or semantic locator' },
        value: { type: 'string', description: 'Text to fill' },
        clear: { type: 'boolean', default: true },
        force: { type: 'boolean', default: false },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['selector', 'value'],
    },
  },
  {
    name: TOOL_NAMES.TYPE,
    description: 'Type text with realistic key events (character by character)',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: '@ref or selector, omit for focused element' },
        text: { type: 'string', description: 'Text to type' },
        delay: { type: 'number', default: 50, description: 'Delay between keystrokes (ms)' },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['text'],
    },
  },
  {
    name: TOOL_NAMES.PRESS,
    description: 'Press keyboard keys or combinations (Enter, Tab, Control+c, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Target element, omit for focused element' },
        key: { type: 'string', description: 'Key or combination: Enter, Tab, Control+c' },
        repeat: { type: 'number', default: 1 },
        delay: { type: 'number', default: 0, description: 'Delay between repeated presses' },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['key'],
    },
  },
  {
    name: TOOL_NAMES.DRAG,
    description: 'Drag an element to a target location',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: '@ref or selector of element to drag' },
        source_coordinates: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        target: { type: 'string', description: '@ref or selector of drop target' },
        target_coordinates: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        steps: { type: 'number', default: 10 },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.SCROLL,
    description: 'Scroll page or element by direction, amount, or to specific position',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Element to scroll into view or container' },
        direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] },
        amount: { type: 'number', description: 'Scroll amount in pixels' },
        position: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' } },
        },
        into_view: { type: 'boolean', default: false },
        block: { type: 'string', enum: ['start', 'center', 'end', 'nearest'], default: 'center' },
        smooth: { type: 'boolean', default: false },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.UPLOAD,
    description: 'Upload files to a file input element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: '@ref or selector of file input' },
        files: {
          type: 'array',
          description: 'Files to upload (paths, URLs, or base64)',
          items: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  url: { type: 'string' },
                  base64: { type: 'string' },
                  name: { type: 'string' },
                  mime_type: { type: 'string' },
                },
              },
            ],
          },
        },
        timeout: { type: 'number', default: 30000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['selector', 'files'],
    },
  },

  // Forms
  {
    name: TOOL_NAMES.CHECK,
    description: 'Check a checkbox or radio button',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        force: { type: 'boolean', default: false },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['selector'],
    },
  },
  {
    name: TOOL_NAMES.UNCHECK,
    description: 'Uncheck a checkbox',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        force: { type: 'boolean', default: false },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['selector'],
    },
  },
  {
    name: TOOL_NAMES.SELECT,
    description: 'Select option(s) in a select element by value, label, or index',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        value: {
          oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        },
        label: {
          oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        },
        index: {
          oneOf: [{ type: 'number' }, { type: 'array', items: { type: 'number' } }],
        },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['selector'],
    },
  },
  {
    name: TOOL_NAMES.CLEAR,
    description: 'Clear an input or textarea',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['selector'],
    },
  },
  {
    name: TOOL_NAMES.FOCUS,
    description: 'Focus an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string' },
        timeout: { type: 'number', default: 5000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['selector'],
    },
  },

  // Wait
  {
    name: TOOL_NAMES.WAIT,
    description: 'Wait for element, text, URL, network idle, or custom JavaScript condition',
    inputSchema: {
      type: 'object',
      properties: {
        for: {
          type: 'string',
          enum: [
            'selector',
            'selector_hidden',
            'text',
            'text_hidden',
            'url',
            'load_state',
            'function',
            'timeout',
          ],
        },
        selector: { type: 'string', description: '@ref or CSS selector' },
        state: {
          type: 'string',
          enum: ['attached', 'detached', 'visible', 'hidden'],
          default: 'visible',
        },
        text: { type: 'string', description: 'Text or regex pattern' },
        url: { type: 'string', description: 'URL pattern (supports * and regex)' },
        load_state: { type: 'string', enum: ['load', 'domcontentloaded', 'networkidle'] },
        function: { type: 'string', description: 'JS function that returns truthy when ready' },
        polling: { type: 'number', default: 100, description: 'Polling interval for function (ms)' },
        duration: { type: 'number', description: 'Duration for timeout wait (ms)' },
        timeout: { type: 'number', default: 30000 },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['for'],
    },
  },

  // Tabs & Windows
  {
    name: TOOL_NAMES.TAB_NEW,
    description: 'Create a new browser tab',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to open (default: about:blank)' },
        active: { type: 'boolean', default: true },
        windowId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.TAB_LIST,
    description: 'List all open tabs with IDs, URLs, and titles',
    inputSchema: {
      type: 'object',
      properties: {
        windowId: { type: 'number', description: 'Filter by window ID' },
      },
    },
  },
  {
    name: TOOL_NAMES.TAB_SWITCH,
    description: 'Switch to a specific tab by ID or index',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: { type: 'number' },
        index: { type: 'number', description: 'Tab index (0-based)' },
      },
    },
  },
  {
    name: TOOL_NAMES.TAB_CLOSE,
    description: 'Close one or more tabs',
    inputSchema: {
      type: 'object',
      properties: {
        tabId: {
          oneOf: [{ type: 'number' }, { type: 'array', items: { type: 'number' } }],
        },
        url: { type: 'string', description: 'Close tabs matching URL pattern' },
      },
    },
  },
  {
    name: TOOL_NAMES.WINDOW_NEW,
    description: 'Create a new browser window',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        width: { type: 'number', default: 1280 },
        height: { type: 'number', default: 720 },
        incognito: { type: 'boolean', default: false },
      },
    },
  },

  // Storage
  {
    name: TOOL_NAMES.COOKIES,
    description: 'Get, set, or clear browser cookies',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'get_all', 'set', 'delete', 'clear'] },
        url: { type: 'string' },
        name: { type: 'string' },
        value: { type: 'string' },
        domain: { type: 'string' },
        path: { type: 'string', default: '/' },
        secure: { type: 'boolean' },
        http_only: { type: 'boolean' },
        same_site: { type: 'string', enum: ['Strict', 'Lax', 'None'] },
        expires: { type: 'number', description: 'Expiration timestamp' },
        domain_filter: { type: 'string', description: 'Filter for clear action' },
      },
      required: ['action'],
    },
  },
  {
    name: TOOL_NAMES.STORAGE,
    description: 'Get, set, or clear localStorage/sessionStorage',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'set', 'remove', 'clear', 'keys', 'entries', 'length'] },
        type: { type: 'string', enum: ['local', 'session'], default: 'local' },
        key: { type: 'string' },
        value: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['action'],
    },
  },
  {
    name: TOOL_NAMES.AUTH_STATE,
    description: 'Save or restore authentication state (cookies + localStorage)',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['save', 'load', 'list', 'delete'] },
        name: { type: 'string', description: 'State identifier' },
        origins: { type: 'array', items: { type: 'string' } },
        include_local_storage: { type: 'boolean', default: true },
        include_session_storage: { type: 'boolean', default: false },
        tabId: { type: 'number' },
      },
      required: ['action'],
    },
  },

  // Network
  {
    name: TOOL_NAMES.REQUEST,
    description: 'Send HTTP request from browser context with cookies',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          default: 'GET',
        },
        headers: { type: 'object' },
        body: { type: 'string' },
        json: { type: 'object' },
        form_data: { type: 'object' },
        timeout: { type: 'number', default: 30000 },
        follow_redirects: { type: 'boolean', default: true },
        tabId: { type: 'number' },
      },
      required: ['url'],
    },
  },
  {
    name: TOOL_NAMES.CAPTURE,
    description: 'Start/stop network traffic capture',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['start', 'stop', 'status'] },
        include_bodies: { type: 'boolean', default: false },
        filter: {
          type: 'object',
          properties: {
            url_pattern: { type: 'string' },
            resource_types: { type: 'array', items: { type: 'string' } },
            methods: { type: 'array', items: { type: 'string' } },
          },
        },
        max_capture_time: { type: 'number', default: 180000 },
        tabId: { type: 'number' },
      },
      required: ['action'],
    },
  },
  {
    name: TOOL_NAMES.ROUTE,
    description: 'Intercept and modify/mock network requests',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'remove', 'clear', 'list'] },
        url_pattern: { type: 'string', description: 'URL pattern (supports *)' },
        handler: { type: 'string', enum: ['abort', 'fulfill', 'continue'] },
        response: {
          type: 'object',
          properties: {
            status: { type: 'number', default: 200 },
            headers: { type: 'object' },
            body: { type: 'string' },
            json: { type: 'object' },
          },
        },
        modify: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            method: { type: 'string' },
            headers: { type: 'object' },
            post_data: { type: 'string' },
          },
        },
        route_id: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['action'],
    },
  },

  // Media
  {
    name: TOOL_NAMES.SCREENSHOT,
    description: 'Capture screenshot of page, element, or specific region',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Capture specific element' },
        full_page: { type: 'boolean', default: false },
        format: { type: 'string', enum: ['png', 'jpeg', 'webp'], default: 'png' },
        quality: { type: 'number', description: 'JPEG/WebP quality 0-100' },
        omit_background: { type: 'boolean', default: false },
        clip: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
        scale: { type: 'number', default: 1 },
        save_path: { type: 'string', description: 'Save to file (else returns base64)' },
        tabId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.PDF,
    description: 'Generate PDF of current page',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6'],
          default: 'Letter',
        },
        landscape: { type: 'boolean', default: false },
        scale: { type: 'number', default: 1 },
        margin: {
          type: 'object',
          properties: {
            top: { type: 'string' },
            bottom: { type: 'string' },
            left: { type: 'string' },
            right: { type: 'string' },
          },
        },
        print_background: { type: 'boolean', default: true },
        save_path: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['save_path'],
    },
  },
  {
    name: TOOL_NAMES.RECORD,
    description: 'Record browser activity as GIF or video',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['start', 'stop', 'capture_frame', 'status'] },
        mode: { type: 'string', enum: ['fixed_fps', 'auto_capture'], default: 'auto_capture' },
        format: { type: 'string', enum: ['gif', 'webm'], default: 'gif' },
        fps: { type: 'number', default: 5 },
        max_duration: { type: 'number', default: 30000 },
        max_frames: { type: 'number', default: 100 },
        width: { type: 'number', default: 800 },
        height: { type: 'number', default: 600 },
        annotation: { type: 'string' },
        save_path: { type: 'string' },
        overlays: {
          type: 'object',
          properties: {
            click_indicators: { type: 'boolean', default: true },
            drag_paths: { type: 'boolean', default: true },
            action_labels: { type: 'boolean', default: true },
          },
        },
        tabId: { type: 'number' },
      },
      required: ['action'],
    },
  },

  // Emulation
  {
    name: TOOL_NAMES.VIEWPORT,
    description: 'Set viewport size and device scale factor',
    inputSchema: {
      type: 'object',
      properties: {
        width: { type: 'number' },
        height: { type: 'number' },
        device_scale_factor: { type: 'number', default: 1 },
        is_mobile: { type: 'boolean', default: false },
        has_touch: { type: 'boolean', default: false },
        is_landscape: { type: 'boolean', default: false },
        tabId: { type: 'number' },
      },
      required: ['width', 'height'],
    },
  },
  {
    name: TOOL_NAMES.DEVICE,
    description: 'Emulate a specific device (viewport, user agent, touch)',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          enum: [
            'iPhone 14',
            'iPhone 14 Pro Max',
            'iPhone SE',
            'iPad Pro',
            'iPad Mini',
            'Pixel 7',
            'Pixel 7 Pro',
            'Samsung Galaxy S23',
            'Desktop 1080p',
            'Desktop 1440p',
            'Desktop 4K',
          ],
        },
        custom: {
          type: 'object',
          properties: {
            viewport: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
              },
            },
            user_agent: { type: 'string' },
            device_scale_factor: { type: 'number' },
            is_mobile: { type: 'boolean' },
            has_touch: { type: 'boolean' },
          },
        },
        tabId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.GEOLOCATION,
    description: 'Set or clear geolocation override',
    inputSchema: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        accuracy: { type: 'number', default: 100 },
        clear: { type: 'boolean', default: false },
        tabId: { type: 'number' },
      },
    },
  },
  {
    name: TOOL_NAMES.PERMISSIONS,
    description: 'Override browser permissions',
    inputSchema: {
      type: 'object',
      properties: {
        permissions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                enum: [
                  'geolocation',
                  'notifications',
                  'camera',
                  'microphone',
                  'clipboard-read',
                  'clipboard-write',
                ],
              },
              state: { type: 'string', enum: ['granted', 'denied', 'prompt'] },
            },
          },
        },
        origin: { type: 'string' },
        tabId: { type: 'number' },
      },
      required: ['permissions'],
    },
  },
  {
    name: TOOL_NAMES.EMULATE,
    description: 'Advanced emulation: color scheme, media, timezone, network throttling',
    inputSchema: {
      type: 'object',
      properties: {
        color_scheme: { type: 'string', enum: ['light', 'dark', 'no-preference'] },
        reduced_motion: { type: 'string', enum: ['reduce', 'no-preference'] },
        forced_colors: { type: 'string', enum: ['active', 'none'] },
        media: { type: 'string', enum: ['screen', 'print'] },
        timezone: { type: 'string', description: "Timezone ID (e.g., 'America/New_York')" },
        locale: { type: 'string', description: "Locale (e.g., 'en-US')" },
        offline: { type: 'boolean', default: false },
        cpu_throttle: { type: 'number', description: 'CPU throttle factor' },
        network_throttle: { type: 'string', enum: ['offline', 'slow_3g', 'fast_3g', '4g'] },
        tabId: { type: 'number' },
      },
    },
  },

  // Execution
  {
    name: TOOL_NAMES.EVALUATE,
    description: 'Execute JavaScript in page context',
    inputSchema: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'JavaScript expression or function' },
        args: { type: 'array', description: 'Arguments to pass to function' },
        await_promise: { type: 'boolean', default: true },
        return_by_value: { type: 'boolean', default: true },
        timeout: { type: 'number', default: 30000 },
        max_output_size: { type: 'number', default: 51200 },
        sanitize: { type: 'boolean', default: true },
        tabId: { type: 'number' },
        frameId: { type: 'number' },
      },
      required: ['expression'],
    },
  },
  {
    name: TOOL_NAMES.CONSOLE,
    description: 'Capture console messages from page',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['get', 'clear', 'start_buffer', 'stop_buffer'], default: 'get' },
        level: {
          type: 'array',
          items: { type: 'string', enum: ['log', 'info', 'warn', 'error', 'debug'] },
        },
        pattern: { type: 'string', description: 'Filter by regex pattern' },
        include_exceptions: { type: 'boolean', default: true },
        max_messages: { type: 'number', default: 100 },
        clear_after_read: { type: 'boolean', default: false },
        tabId: { type: 'number' },
      },
    },
  },

  // Browser Data
  {
    name: TOOL_NAMES.HISTORY,
    description: 'Search and retrieve browsing history',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search text (matches URL and title)' },
        start_time: {
          type: 'string',
          description: "Start time (ISO, relative like '1 day ago', or 'today')",
        },
        end_time: { type: 'string' },
        max_results: { type: 'number', default: 100 },
        exclude_current_tabs: { type: 'boolean', default: false },
      },
    },
  },
  {
    name: TOOL_NAMES.BOOKMARKS,
    description: 'Search, add, or delete bookmarks',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'add', 'delete', 'list_folders'] },
        query: { type: 'string' },
        folder: { type: 'string', description: 'Folder path or ID' },
        max_results: { type: 'number', default: 50 },
        url: { type: 'string' },
        title: { type: 'string' },
        parent_folder: { type: 'string' },
        create_folder: { type: 'boolean', default: false },
        bookmark_id: { type: 'string' },
      },
      required: ['action'],
    },
  },

  // Dialogs
  {
    name: TOOL_NAMES.DIALOG,
    description: 'Handle alert, confirm, prompt, and beforeunload dialogs',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['accept', 'dismiss', 'get_message'] },
        prompt_text: { type: 'string', description: 'Text for prompt dialogs' },
        auto_handle: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            default_action: { type: 'string', enum: ['accept', 'dismiss'] },
            prompt_default_text: { type: 'string' },
          },
        },
        tabId: { type: 'number' },
      },
      required: ['action'],
    },
  },
];

// ============================================================================
// Type Exports
// ============================================================================

export type SnapshotInput = z.infer<typeof SnapshotInputSchema>;
export type QueryInput = z.infer<typeof QueryInputSchema>;
export type NavigateInput = z.infer<typeof NavigateInputSchema>;
export type ClickInput = z.infer<typeof ClickInputSchema>;
export type DblClickInput = z.infer<typeof DblClickInputSchema>;
export type HoverInput = z.infer<typeof HoverInputSchema>;
export type FillInput = z.infer<typeof FillInputSchema>;
export type TypeInput = z.infer<typeof TypeInputSchema>;
export type PressInput = z.infer<typeof PressInputSchema>;
export type DragInput = z.infer<typeof DragInputSchema>;
export type ScrollInput = z.infer<typeof ScrollInputSchema>;
export type UploadInput = z.infer<typeof UploadInputSchema>;
export type CheckInput = z.infer<typeof CheckInputSchema>;
export type UncheckInput = z.infer<typeof UncheckInputSchema>;
export type SelectInput = z.infer<typeof SelectInputSchema>;
export type ClearInput = z.infer<typeof ClearInputSchema>;
export type FocusInput = z.infer<typeof FocusInputSchema>;
export type WaitInput = z.infer<typeof WaitInputSchema>;
export type TabNewInput = z.infer<typeof TabNewInputSchema>;
export type TabListInput = z.infer<typeof TabListInputSchema>;
export type TabSwitchInput = z.infer<typeof TabSwitchInputSchema>;
export type TabCloseInput = z.infer<typeof TabCloseInputSchema>;
export type WindowNewInput = z.infer<typeof WindowNewInputSchema>;
export type CookiesInput = z.infer<typeof CookiesInputSchema>;
export type StorageInput = z.infer<typeof StorageInputSchema>;
export type AuthStateInput = z.infer<typeof AuthStateInputSchema>;
export type RequestInput = z.infer<typeof RequestInputSchema>;
export type CaptureInput = z.infer<typeof CaptureInputSchema>;
export type RouteInput = z.infer<typeof RouteInputSchema>;
export type ScreenshotInput = z.infer<typeof ScreenshotInputSchema>;
export type PdfInput = z.infer<typeof PdfInputSchema>;
export type RecordInput = z.infer<typeof RecordInputSchema>;
export type ViewportInput = z.infer<typeof ViewportInputSchema>;
export type DeviceInput = z.infer<typeof DeviceInputSchema>;
export type GeolocationInput = z.infer<typeof GeolocationInputSchema>;
export type PermissionsInput = z.infer<typeof PermissionsInputSchema>;
export type EmulateInput = z.infer<typeof EmulateInputSchema>;
export type EvaluateInput = z.infer<typeof EvaluateInputSchema>;
export type ConsoleInput = z.infer<typeof ConsoleInputSchema>;
export type HistoryInput = z.infer<typeof HistoryInputSchema>;
export type BookmarksInput = z.infer<typeof BookmarksInputSchema>;
export type DialogInput = z.infer<typeof DialogInputSchema>;
export type UrlInput = z.infer<typeof UrlInputSchema>;
export type TitleInput = z.infer<typeof TitleInputSchema>;

// ============================================================================
// Helper: Resolve tool name with aliases
// ============================================================================

export function resolveToolName(name: string): string {
  return TOOL_ALIASES[name] || name;
}

// ============================================================================
// Helper: Get schema by name
// ============================================================================

export function getToolSchema(name: string): Tool | undefined {
  const resolvedName = resolveToolName(name);
  return TOOL_SCHEMAS.find((schema) => schema.name === resolvedName);
}
