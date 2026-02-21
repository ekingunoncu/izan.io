/**
 * Image generation tool handlers.
 */

import { generateWithOpenAI, generateWithGoogle, type ImageGenResult } from './providers.js'

export type ImageProvider = 'openai' | 'google'

export interface GenerateImageArgs {
  prompt: string
  provider?: ImageProvider
  size?: string
  quality?: 'standard' | 'hd'
  model?: string
}

/** API key resolver function - injected from the app layer */
let apiKeyResolver: ((provider: ImageProvider) => string | null) | null = null

export function setApiKeyResolver(resolver: (provider: ImageProvider) => string | null): void {
  apiKeyResolver = resolver
}

/**
 * Handle the generate_image tool call.
 * Returns text + image content for MCP response.
 */
export async function handleGenerateImage(
  args: GenerateImageArgs,
): Promise<{ text: string; image?: { data: string; mimeType: string } }> {
  const provider = args.provider || 'openai'

  if (!apiKeyResolver) {
    return { text: 'Error: Image generation is not configured. No API key resolver set.' }
  }

  const apiKey = apiKeyResolver(provider)
  if (!apiKey) {
    return {
      text: `Error: No API key configured for ${provider}. Please add your ${provider === 'openai' ? 'OpenAI' : 'Google'} API key in Settings.`,
    }
  }

  let result: ImageGenResult
  try {
    if (provider === 'google') {
      result = await generateWithGoogle(apiKey, args)
    } else {
      result = await generateWithOpenAI(apiKey, args)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { text: `Error generating image: ${message}` }
  }

  const size = args.size || '1024x1024'
  const textParts = [`Generated image: "${args.prompt}" (${size})`]
  if (result.revisedPrompt) {
    textParts.push(`Revised prompt: "${result.revisedPrompt}"`)
  }

  return {
    text: textParts.join('\n'),
    image: { data: result.data, mimeType: result.mimeType },
  }
}
