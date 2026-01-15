/**
 * Quick Translator MinApp
 *
 * Translates selected text or page content
 */

import type { MinApp, MinAppContext, MinAppResult } from '../types';

export const quickTranslatorApp: MinApp = {
  id: 'quick-translator',
  name: 'Quick Translate',
  description: 'Translate selected text or page content',
  icon: '🌐',
  category: 'utility',
  requiresInput: true,
  inputPlaceholder: 'Target language (e.g., "Spanish", "Japanese", "French")',
  systemPrompt: `You are a professional translator. Translate the provided text accurately while:
- Preserving the original meaning and tone
- Adapting idioms appropriately for the target language
- Maintaining formatting (paragraphs, lists, etc.)
- Noting any cultural context where relevant

Only output the translation, no explanations unless there's ambiguity that needs clarification.`,
  tools: ['extract_content'],

  async execute(ctx: MinAppContext): Promise<MinAppResult> {
    const startTime = Date.now();

    try {
      const targetLanguage = ctx.userInput || 'English';

      // Determine what to translate
      let textToTranslate: string;
      let sourceDescription: string;

      if (ctx.selectedText && ctx.selectedText.length > 10) {
        // Use selected text
        textToTranslate = ctx.selectedText;
        sourceDescription = 'Selected text';
      } else {
        // Extract page content
        ctx.onProgress?.('Extracting page content...');

        const result = await ctx.executeTool('extract_content', {
          tabId: ctx.activeTab.id,
          format: 'text',
        });

        const extractResult = result as { content?: Array<{ text?: string }> };
        textToTranslate = extractResult?.content?.[0]?.text || '';
        sourceDescription = ctx.pageMeta?.title || 'Page content';

        if (!textToTranslate) {
          return {
            success: false,
            error: 'No text found to translate. Try selecting specific text first.',
          };
        }
      }

      // Truncate if very long
      const maxLength = 5000;
      const wasTruncated = textToTranslate.length > maxLength;
      if (wasTruncated) {
        textToTranslate = textToTranslate.substring(0, maxLength);
      }

      ctx.onProgress?.(`Translating to ${targetLanguage}...`);

      // Translate
      const translated = await ctx.complete([
        { role: 'system', content: quickTranslatorApp.systemPrompt },
        {
          role: 'user',
          content: `Translate the following text to ${targetLanguage}:\n\n${textToTranslate}`,
        },
      ]);

      let output = `## Translation to ${targetLanguage}\n\n`;
      output += `**Source:** ${sourceDescription}\n`;
      if (wasTruncated) {
        output += `_Note: Text was truncated to ${maxLength} characters_\n`;
      }
      output += '\n---\n\n';
      output += translated;

      return {
        success: true,
        output,
        data: {
          targetLanguage,
          sourceLength: textToTranslate.length,
          wasTruncated,
          wasSelectedText: !!ctx.selectedText,
        },
        actions: [
          {
            type: 'copy',
            label: 'Copy Translation',
            payload: { text: translated },
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
