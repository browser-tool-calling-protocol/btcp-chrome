import { ToolExecutor } from '@/common/tool-handler';
import type { ToolResult } from '@/common/tool-handler';
import { TIMEOUTS, ERROR_MESSAGES } from '@/common/constants';
import {
  getCurrentSession,
  getActiveTabInSession,
  isTabIdInSession,
  createTabInSession,
  getSessionTabs,
} from '../tab-group-session';

const PING_TIMEOUT_MS = 300;

/**
 * Base class for browser tool executors
 * Includes session-scoped tab operations when a tab group session is active
 */
export abstract class BaseBrowserToolExecutor implements ToolExecutor {
  abstract name: string;
  abstract execute(args: any): Promise<ToolResult>;

  /**
   * Check if a tab group session is currently active
   */
  protected hasActiveSession(): boolean {
    return getCurrentSession() !== null;
  }

  /**
   * Get the current session's group ID, or undefined if no session
   */
  protected getSessionGroupId(): number | undefined {
    return getCurrentSession()?.groupId;
  }

  /**
   * Get the current session's window ID, or undefined if no session
   */
  protected getSessionWindowId(): number | undefined {
    return getCurrentSession()?.windowId;
  }

  /**
   * Inject content script into tab
   */
  protected async injectContentScript(
    tabId: number,
    files: string[],
    injectImmediately = false,
    world: 'MAIN' | 'ISOLATED' = 'ISOLATED',
    allFrames: boolean = false,
    frameIds?: number[],
  ): Promise<void> {
    console.log(`Injecting ${files.join(', ')} into tab ${tabId}`);

    // check if script is already injected
    try {
      const pingFrameId = frameIds?.[0];
      const response = await Promise.race([
        typeof pingFrameId === 'number'
          ? chrome.tabs.sendMessage(
              tabId,
              { action: `${this.name}_ping` },
              { frameId: pingFrameId },
            )
          : chrome.tabs.sendMessage(tabId, { action: `${this.name}_ping` }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`${this.name} Ping action to tab ${tabId} timed out`)),
            PING_TIMEOUT_MS,
          ),
        ),
      ]);

      if (response && response.status === 'pong') {
        console.log(
          `pong received for action '${this.name}' in tab ${tabId}. Assuming script is active.`,
        );
        return;
      } else {
        console.warn(`Unexpected ping response in tab ${tabId}:`, response);
      }
    } catch (error) {
      console.error(
        `ping content script failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      const target: { tabId: number; allFrames?: boolean; frameIds?: number[] } = { tabId };
      if (frameIds && frameIds.length > 0) {
        target.frameIds = frameIds;
      } else if (allFrames) {
        target.allFrames = true;
      }
      await chrome.scripting.executeScript({
        target,
        files,
        injectImmediately,
        world,
      } as any);
      console.log(`'${files.join(', ')}' injection successful for tab ${tabId}`);
    } catch (injectionError) {
      const errorMessage =
        injectionError instanceof Error ? injectionError.message : String(injectionError);
      console.error(
        `Content script '${files.join(', ')}' injection failed for tab ${tabId}: ${errorMessage}`,
      );
      throw new Error(
        `${ERROR_MESSAGES.TOOL_EXECUTION_FAILED}: Failed to inject content script in tab ${tabId}: ${errorMessage}`,
      );
    }
  }

  /**
   * Send message to tab
   */
  protected async sendMessageToTab(tabId: number, message: any, frameId?: number): Promise<any> {
    try {
      const response =
        typeof frameId === 'number'
          ? await chrome.tabs.sendMessage(tabId, message, { frameId })
          : await chrome.tabs.sendMessage(tabId, message);

      if (response && response.error) {
        throw new Error(String(response.error));
      }

      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        `Error sending message to tab ${tabId} for action ${message?.action || 'unknown'}: ${errorMessage}`,
      );

      if (error instanceof Error) {
        throw error;
      }
      throw new Error(errorMessage);
    }
  }

  /**
   * Try to get an existing tab by id. Returns null when not found.
   * If a session is active, verifies the tab belongs to the session.
   */
  protected async tryGetTab(tabId?: number): Promise<chrome.tabs.Tab | null> {
    if (typeof tabId !== 'number') return null;
    try {
      const tab = await chrome.tabs.get(tabId);
      // If session is active, only return tab if it belongs to the session
      if (this.hasActiveSession()) {
        const inSession = await isTabIdInSession(tabId);
        if (!inSession) {
          console.warn(`Tab ${tabId} does not belong to the current session`);
          return null;
        }
      }
      return tab;
    } catch {
      return null;
    }
  }

  /**
   * Get the active tab in the current window or session.
   * If a session is active, returns the active tab within the session's tab group.
   * Throws when not found.
   */
  protected async getActiveTabOrThrow(): Promise<chrome.tabs.Tab> {
    if (this.hasActiveSession()) {
      const tab = await getActiveTabInSession();
      if (!tab || !tab.id) throw new Error('No active tab in session');
      return tab;
    }
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!active || !active.id) throw new Error('Active tab not found');
    return active;
  }

  /**
   * Optionally focus window and/or activate tab. Defaults preserve current behavior
   * when caller sets activate/focus flags explicitly.
   */
  protected async ensureFocus(
    tab: chrome.tabs.Tab,
    options: { activate?: boolean; focusWindow?: boolean } = {},
  ): Promise<void> {
    const activate = options.activate === true;
    const focusWindow = options.focusWindow === true;
    if (focusWindow && typeof tab.windowId === 'number') {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    if (activate && typeof tab.id === 'number') {
      await chrome.tabs.update(tab.id, { active: true });
    }
  }

  /**
   * Get the active tab in a window or session.
   * If a session is active, prioritizes tabs within the session's tab group.
   */
  protected async getActiveTabInWindow(windowId?: number): Promise<chrome.tabs.Tab | null> {
    if (this.hasActiveSession()) {
      return getActiveTabInSession();
    }
    if (typeof windowId === 'number') {
      const tabs = await chrome.tabs.query({ active: true, windowId });
      return tabs && tabs[0] ? tabs[0] : null;
    }
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] ? tabs[0] : null;
  }

  /**
   * Same as getActiveTabInWindow, but throws if not found.
   */
  protected async getActiveTabOrThrowInWindow(windowId?: number): Promise<chrome.tabs.Tab> {
    const tab = await this.getActiveTabInWindow(windowId);
    if (!tab || !tab.id) throw new Error('Active tab not found');
    return tab;
  }

  /**
   * Get all tabs that tools should operate on.
   * If a session is active, returns only tabs in the session's tab group.
   * Otherwise, returns all tabs or tabs matching the query.
   */
  protected async getSessionScopedTabs(query?: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    if (this.hasActiveSession()) {
      // Return only tabs in the session's tab group
      return getSessionTabs();
    }
    // No session - use the provided query or return all tabs
    return chrome.tabs.query(query || {});
  }

  /**
   * Create a new tab, adding it to the session's tab group if active.
   */
  protected async createTab(
    url: string,
    options?: { windowId?: number; active?: boolean },
  ): Promise<chrome.tabs.Tab> {
    const active = options?.active !== false;

    if (this.hasActiveSession()) {
      // Create tab in the session's tab group
      const tab = await createTabInSession(url, active);
      if (!tab) {
        throw new Error('Failed to create tab in session');
      }
      return tab;
    }

    // No session - create tab normally
    const windowId = options?.windowId;
    return chrome.tabs.create({
      url,
      windowId,
      active,
    });
  }

  /**
   * Verify a tab belongs to the current session (if one is active).
   * Returns true if no session is active or if the tab belongs to the session.
   */
  protected async verifyTabInSession(tabId: number): Promise<boolean> {
    if (!this.hasActiveSession()) {
      return true;
    }
    return isTabIdInSession(tabId);
  }
}
