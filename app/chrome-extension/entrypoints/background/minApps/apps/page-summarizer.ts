/**
 * Page Summarizer MinApp
 *
 * Summarizes the current web page content using AI
 */

import type { MinApp, MinAppContext, MinAppResult } from '../types';

export const pageSummarizerApp: MinApp = {
  id: 'page-summarizer',
  name: 'Summarize Page',
  description: 'Get a quick AI-powered summary of the current page',
  icon: '📄',
  category: 'content',
  systemPrompt: `You are a content summarizer. Create concise, well-structured summaries of web pages.

When summarizing:
1. Start with a one-sentence TL;DR
2. List 3-5 key points
3. Note any important data, statistics, or quotes
4. Identify actionable items if present

Format using markdown for readability. Keep summaries focused and scannable.`,
  tools: ['extract_content'],

  async execute(ctx: MinAppContext): Promise<MinAppResult> {
    const startTime = Date.now();

    try {
      ctx.onProgress?.('Extracting page content...');

      // Extract content from the page
      let content: string;

      if (ctx.selectedText && ctx.selectedText.length > 100) {
        // Use selected text if substantial
        content = ctx.selectedText;
      } else {
        // Extract full page content
        const result = await ctx.executeTool('extract_content', {
          tabId: ctx.activeTab.id,
          format: 'text',
          includeMetadata: true,
        });

        const extractResult = result as { content?: Array<{ text?: string }> };
        content = extractResult?.content?.[0]?.text || '';

        if (!content) {
          return {
            success: false,
            error: 'Could not extract content from this page',
          };
        }
      }

      // Truncate if too long (keep first ~8000 chars for context limit)
      const truncatedContent =
        content.length > 8000 ? content.substring(0, 8000) + '\n\n[Content truncated...]' : content;

      ctx.onProgress?.('Generating summary...');

      // Generate summary
      const summary = await ctx.complete([
        { role: 'system', content: pageSummarizerApp.systemPrompt },
        {
          role: 'user',
          content: `Please summarize the following web page content from "${ctx.pageMeta?.title || 'Unknown Page'}" (${ctx.pageMeta?.url || ''}):\n\n${truncatedContent}`,
        },
      ]);

      return {
        success: true,
        output: summary,
        data: {
          pageTitle: ctx.pageMeta?.title,
          pageUrl: ctx.pageMeta?.url,
          contentLength: content.length,
          wasSelected: !!ctx.selectedText,
        },
        actions: [
          {
            type: 'copy',
            label: 'Copy Summary',
            payload: { text: summary },
          },
        ],
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
