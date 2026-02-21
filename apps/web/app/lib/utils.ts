import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Model adındaki "Reasoning"i dile göre (örn. tr: izan) çevirir */
export function modelDisplayName(name: string, reasoningLabel: string): string {
  return name.replaceAll(/Reasoning/gi, reasoningLabel)
}

/** Strip <think>...</think> blocks (Qwen3, DeepSeek thinking mode) from display */
export function stripThinkTags(text: string): string {
  return text
    .replaceAll(/<think>[\s\S]*?<\/think>/gi, '')
    .replaceAll(/<think>[\s\S]*/gi, '')
    .trim()
}

/** Strip markdown formatting for text-to-speech readability */
export function stripMarkdownForTTS(text: string): string {
  return stripThinkTags(text)
    // Remove code blocks
    .replaceAll(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replaceAll(/`([^`]*)`/g, '$1')
    // Remove headings markers
    .replaceAll(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replaceAll(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replaceAll(/_{1,3}([^_]+)_{1,3}/g, '$1')
    // Convert links to just text
    .replaceAll(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images
    .replaceAll(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove horizontal rules
    .replaceAll(/^[-*_]{3,}\s*$/gm, '')
    // Remove HTML tags
    .replaceAll(/<[^>]+>/g, '')
    // Remove tool/agent markers
    .replaceAll(/\[🔧[^\]]*\]/g, '')
    .replaceAll(/\[🤖[^\]]*\]/g, '')
    .replaceAll(/⏳[^\n]*/g, '')
    .replaceAll(/🔄[^\n]*/g, '')
    // Clean up whitespace
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim()
}
