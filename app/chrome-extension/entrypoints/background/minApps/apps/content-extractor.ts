/**
 * Content Extractor MinApp
 *
 * Extracts and formats specific content from web pages
 */

import type { MinApp, MinAppContext, MinAppResult } from '../types';

export const contentExtractorApp: MinApp = {
  id: 'content-extractor',
  name: 'Extract Content',
  description: 'Extract specific information from the current page',
  icon: '📋',
  category: 'content',
  requiresInput: true,
  inputPlaceholder:
    'What do you want to extract? (e.g., "all email addresses", "product prices", "author names")',
  systemPrompt: `You are a content extraction specialist. Given a web page and an extraction request, identify and extract the requested information.

Output format:
- If extracting a list: provide as a bullet list
- If extracting structured data: use a table format
- If extracting a single value: provide directly
- Always indicate if the requested information was not found

Be thorough but only include what was actually requested.`,
  tools: ['extract_content'],

  async execute(ctx: MinAppContext): Promise<MinAppResult> {
    const startTime = Date.now();

    try {
      if (!ctx.userInput) {
        return {
          success: false,
          error: 'Please specify what you want to extract',
        };
      }

      ctx.onProgress?.('Extracting page content...');

      // Extract page content
      const result = await ctx.executeTool('extract_content', {
        tabId: ctx.activeTab.id,
        format: 'text',
        includeMetadata: true,
      });

      const extractResult = result as { content?: Array<{ text?: string }> };
      const content = extractResult?.content?.[0]?.text || '';

      if (!content) {
        return {
          success: false,
          error: 'Could not extract content from this page',
        };
      }

      // Truncate for context limit
      const truncatedContent =
        content.length > 10000
          ? content.substring(0, 10000) + '\n\n[Content truncated...]'
          : content;

      ctx.onProgress?.('Extracting requested information...');

      // Extract with AI
      const extracted = await ctx.complete([
        { role: 'system', content: contentExtractorApp.systemPrompt },
        {
          role: 'user',
          content: `From the following web page "${ctx.pageMeta?.title || 'Unknown'}", extract: ${ctx.userInput}\n\n---\nPage Content:\n${truncatedContent}`,
        },
      ]);

      return {
        success: true,
        output: `## Extracted: ${ctx.userInput}\n\nFrom: ${ctx.pageMeta?.title || ctx.pageMeta?.url || 'Unknown Page'}\n\n${extracted}`,
        data: {
          query: ctx.userInput,
          pageTitle: ctx.pageMeta?.title,
          pageUrl: ctx.pageMeta?.url,
        },
        actions: [
          {
            type: 'copy',
            label: 'Copy Result',
            payload: { text: extracted },
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
