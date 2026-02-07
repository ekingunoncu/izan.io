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
