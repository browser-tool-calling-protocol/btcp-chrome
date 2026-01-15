<template>
  <div class="thinking-block" :class="{ expanded: isExpanded, streaming: isStreaming }">
    <button class="thinking-header" @click="isExpanded = !isExpanded">
      <div class="header-left">
        <span class="thinking-icon">🧠</span>
        <span class="thinking-label">{{ isStreaming ? 'Thinking...' : 'Reasoning' }}</span>
        <span v-if="tokenCount" class="token-count">({{ formatTokens(tokenCount) }} tokens)</span>
      </div>
      <div class="header-right">
        <span v-if="duration" class="duration">{{ formatDuration(duration) }}</span>
        <svg
          class="chevron"
          :class="{ rotated: isExpanded }"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </button>

    <div v-if="isExpanded" class="thinking-content">
      <div class="thinking-text" ref="contentRef">
        <template v-if="formattedSteps.length > 1">
          <div v-for="(step, i) in formattedSteps" :key="i" class="thinking-step">
            <span class="step-number">{{ i + 1 }}</span>
            <span class="step-text">{{ step }}</span>
          </div>
        </template>
        <template v-else>
          {{ content }}
        </template>
        <span v-if="isStreaming" class="cursor">▊</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';

interface Props {
  content: string;
  tokenCount?: number;
  duration?: number; // in milliseconds
  isStreaming?: boolean;
  defaultExpanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isStreaming: false,
  defaultExpanded: false,
});

const isExpanded = ref(props.defaultExpanded);
const contentRef = ref<HTMLElement | null>(null);

// Parse content into steps (split by common reasoning patterns)
const formattedSteps = computed(() => {
  if (!props.content) return [];

  // Try to detect numbered steps or logical breaks
  const stepPatterns = [
    /(?:^|\n)\s*(?:\d+[\.\)]\s*)/gm, // 1. or 1)
    /(?:^|\n)\s*(?:[-•*]\s*)/gm, // - or • or *
    /(?:^|\n)\s*(?:Step \d+:?\s*)/gim, // Step 1:
    /(?:^|\n)\s*(?:First|Second|Third|Then|Next|Finally)[,:\s]/gim,
  ];

  // Check if content looks like it has structured steps
  for (const pattern of stepPatterns) {
    const matches = props.content.match(pattern);
    if (matches && matches.length >= 2) {
      // Split and clean up steps
      const steps = props.content
        .split(pattern)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      if (steps.length >= 2) {
        return steps;
      }
    }
  }

  // If no structured steps found, try to split by double newlines
  const paragraphs = props.content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length >= 2) {
    return paragraphs;
  }

  // Return as single block if no structure detected
  return [props.content];
});

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

// Auto-scroll when streaming
watch(
  () => props.content,
  async () => {
    if (props.isStreaming && isExpanded.value && contentRef.value) {
      await nextTick();
      contentRef.value.scrollTop = contentRef.value.scrollHeight;
    }
  },
);

// Auto-expand when streaming starts
watch(
  () => props.isStreaming,
  (streaming) => {
    if (streaming) {
      isExpanded.value = true;
    }
  },
);
</script>

<style scoped>
.thinking-block {
  border: 1px solid var(--ac-thinking-border, rgba(139, 92, 246, 0.3));
  border-radius: 10px;
  background: var(--ac-thinking-bg, rgba(139, 92, 246, 0.05));
  overflow: hidden;
  margin: 8px 0;
}

.thinking-block.streaming {
  border-color: rgba(139, 92, 246, 0.5);
}

.thinking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.thinking-header:hover {
  background: rgba(139, 92, 246, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.thinking-icon {
  font-size: 14px;
}

.thinking-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ac-text-primary, #1e293b);
}

.token-count {
  font-size: 11px;
  color: var(--ac-text-tertiary, #94a3b8);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duration {
  font-size: 11px;
  color: var(--ac-text-tertiary, #94a3b8);
}

.chevron {
  width: 16px;
  height: 16px;
  color: var(--ac-text-secondary, #64748b);
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.thinking-content {
  padding: 0 12px 12px;
}

.thinking-text {
  font-size: 13px;
  line-height: 1.6;
  color: var(--ac-text-secondary, #475569);
  max-height: 300px;
  overflow-y: auto;
  padding-right: 8px;
}

.thinking-step {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ac-thinking-border, rgba(139, 92, 246, 0.15));
}

.thinking-step:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.step-number {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.15);
  color: var(--ac-text-primary, #1e293b);
  border-radius: 50%;
  font-size: 11px;
  font-weight: 600;
}

.step-text {
  flex: 1;
}

.cursor {
  animation: blink 1s infinite;
  color: var(--ac-primary, #8b5cf6);
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* Scrollbar styling */
.thinking-text::-webkit-scrollbar {
  width: 6px;
}

.thinking-text::-webkit-scrollbar-track {
  background: transparent;
}

.thinking-text::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.2);
  border-radius: 3px;
}

.thinking-text::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.3);
}
</style>
