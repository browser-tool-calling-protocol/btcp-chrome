/**
 * Tab Organizer MinApp
 *
 * AI-powered tab grouping and cleanup suggestions
 */

import type { MinApp, MinAppContext, MinAppResult } from '../types';

interface TabInfo {
  id: number;
  title: string;
  url: string;
  domain: string;
}

interface GroupSuggestion {
  name: string;
  color: string;
  tabs: TabInfo[];
  reason: string;
}

export const tabOrganizerApp: MinApp = {
  id: 'tab-organizer',
  name: 'Organize Tabs',
  description: 'AI-powered tab grouping and cleanup suggestions',
  icon: '🗂️',
  category: 'productivity',
  systemPrompt: `You are a tab organization assistant. Analyze open tabs and suggest logical groupings.

Guidelines:
- Group by topic, project, or purpose
- Identify duplicate or very similar tabs
- Suggest tabs that could be closed (old, duplicate, or irrelevant)
- Use descriptive, short group names

Output as JSON with this structure:
{
  "groups": [
    {
      "name": "Group Name",
      "color": "blue|red|yellow|green|pink|purple|cyan|orange|grey",
      "tabIds": [1, 2, 3],
      "reason": "Why these tabs belong together"
    }
  ],
  "closesuggestions": [
    {
      "tabId": 5,
      "reason": "Why this tab could be closed"
    }
  ]
}`,
  tools: ['tab_management'],

  async execute(ctx: MinAppContext): Promise<MinAppResult> {
    const startTime = Date.now();

    try {
      ctx.onProgress?.('Gathering tab information...');

      // Get all tabs
      const tabs = await chrome.tabs.query({ currentWindow: true });

      if (tabs.length < 3) {
        return {
          success: true,
          output: 'You have very few tabs open - no organization needed!',
          data: { tabCount: tabs.length },
        };
      }

      // Prepare tab info for AI
      const tabInfos: TabInfo[] = tabs
        .filter((t) => t.id && t.url)
        .map((t) => {
          let domain = '';
          try {
            domain = new URL(t.url!).hostname;
          } catch {
            domain = 'unknown';
          }
          return {
            id: t.id!,
            title: t.title || 'Untitled',
            url: t.url!,
            domain,
          };
        });

      const tabList = tabInfos
        .map((t) => `ID: ${t.id} | ${t.domain} | ${t.title.substring(0, 50)}`)
        .join('\n');

      ctx.onProgress?.('Analyzing tabs with AI...');

      // Get AI suggestions
      const response = await ctx.complete([
        { role: 'system', content: tabOrganizerApp.systemPrompt },
        {
          role: 'user',
          content: `Analyze these ${tabs.length} tabs and suggest groupings:\n\n${tabList}`,
        },
      ]);

      // Parse AI response
      let suggestions: {
        groups: GroupSuggestion[];
        closesuggestions: Array<{ tabId: number; reason: string }>;
      };

      try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch {
        // Fallback: return the raw response
        return {
          success: true,
          output: `**Tab Analysis** (${tabs.length} tabs)\n\n${response}`,
          data: { tabCount: tabs.length },
        };
      }

      // Format output
      let output = `## Tab Organization Suggestions\n\n`;
      output += `**${tabs.length} tabs analyzed**\n\n`;

      if (suggestions.groups?.length > 0) {
        output += `### Suggested Groups\n\n`;
        for (const group of suggestions.groups) {
          const groupTabs = tabInfos.filter(
            (t) =>
              group.tabs?.some((gt: TabInfo) => gt.id === t.id) ||
              (group as any).tabIds?.includes(t.id),
          );
          output += `**${group.name}** (${groupTabs.length} tabs)\n`;
          output += `_${group.reason}_\n`;
          for (const tab of groupTabs.slice(0, 5)) {
            output += `- ${tab.title.substring(0, 40)}...\n`;
          }
          if (groupTabs.length > 5) {
            output += `- _...and ${groupTabs.length - 5} more_\n`;
          }
          output += '\n';
        }
      }

      if (suggestions.closesuggestions?.length > 0) {
        output += `### Tabs to Consider Closing\n\n`;
        for (const suggestion of suggestions.closesuggestions.slice(0, 5)) {
          const tab = tabInfos.find((t) => t.id === suggestion.tabId);
          if (tab) {
            output += `- **${tab.title.substring(0, 40)}...** - ${suggestion.reason}\n`;
          }
        }
      }

      return {
        success: true,
        output,
        data: {
          tabCount: tabs.length,
          groupCount: suggestions.groups?.length || 0,
          closeSuggestions: suggestions.closesuggestions?.length || 0,
        },
        actions:
          suggestions.groups?.length > 0
            ? [
                {
                  type: 'run_minapp',
                  label: 'Apply Groups',
                  payload: { appId: 'tab-organizer', action: 'apply', suggestions },
                },
              ]
            : undefined,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  },
};
