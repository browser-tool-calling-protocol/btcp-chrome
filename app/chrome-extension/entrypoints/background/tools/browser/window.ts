import { createErrorResponse, ToolResult } from '@/common/tool-handler';
import { BaseBrowserToolExecutor } from '../base-browser';
import { TOOL_NAMES } from 'chrome-mcp-shared';
import { getCurrentSession } from '../../tab-group-session';

class WindowTool extends BaseBrowserToolExecutor {
  name = TOOL_NAMES.BROWSER.GET_WINDOWS_AND_TABS;
  async execute(): Promise<ToolResult> {
    try {
      const session = getCurrentSession();

      // If session is active, only return tabs in the session's tab group
      if (session) {
        const sessionTabs = await chrome.tabs.query({ groupId: session.groupId });
        const tabCount = sessionTabs.length;

        const tabs = sessionTabs.map((tab) => ({
          tabId: tab.id || 0,
          url: tab.url || '',
          title: tab.title || '',
          active: tab.active || false,
          groupId: tab.groupId,
        }));

        const result = {
          sessionActive: true,
          sessionName: session.name,
          sessionGroupId: session.groupId,
          windowId: session.windowId,
          tabCount: tabCount,
          tabs: tabs,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
          isError: false,
        };
      }

      // No session - return all windows and tabs
      const windows = await chrome.windows.getAll({ populate: true });
      let tabCount = 0;

      const structuredWindows = windows.map((window) => {
        const tabs =
          window.tabs?.map((tab) => {
            tabCount++;
            return {
              tabId: tab.id || 0,
              url: tab.url || '',
              title: tab.title || '',
              active: tab.active || false,
            };
          }) || [];

        return {
          windowId: window.id || 0,
          tabs: tabs,
        };
      });

      const result = {
        sessionActive: false,
        windowCount: windows.length,
        tabCount: tabCount,
        windows: structuredWindows,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
        isError: false,
      };
    } catch (error) {
      console.error('Error in WindowTool.execute:', error);
      return createErrorResponse(
        `Error getting windows and tabs information: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

export const windowTool = new WindowTool();
