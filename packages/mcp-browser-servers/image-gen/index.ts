/**
 * @izan/mcp-browser-servers - Image Generation MCP server (client-side)
 * Uses TabServerTransport from @mcp-b/transports
 *
 * Generates images via OpenAI DALL-E 3 or Google Imagen.
 * API keys are injected from the app layer via setApiKeyResolver().
 */

import { z } from 'zod'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { TabServerTransport } from '@mcp-b/transports'
import { handleGenerateImage, setApiKeyResolver, type ImageProvider } from './tools.js'

let serverInstance: McpServer | null = null
let transportInstance: TabServerTransport | null = null

/**
 * Start the image generation MCP server.
 * @param apiKeyResolver - Function to resolve API keys for providers
 * Returns true if started successfully, false if already running.
 */
export async function startImageGenServer(
  apiKeyResolver?: (provider: ImageProvider) => string | null,
): Promise<boolean> {
  if (serverInstance) {
    return false // Already running
  }

  if (apiKeyResolver) {
    setApiKeyResolver(apiKeyResolver)
  }

  const server = new McpServer(
    {
      name: 'izan-image-gen',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  server.registerTool('generate_image', {
    description: 'Generate an image from a text description using AI. Returns the generated image. Use this when the user asks you to create, draw, generate, or design an image or picture.',
    inputSchema: {
      prompt: z.string().describe('Detailed description of the image to generate'),
      provider: z.enum(['openai', 'google']).optional().describe('Image generation provider (default: openai)'),
      size: z.enum(['1024x1024', '1792x1024', '1024x1792']).optional().describe('Image dimensions (default: 1024x1024)'),
      quality: z.enum(['standard', 'hd']).optional().describe('Image quality (default: standard)'),
      model: z.string().optional().describe('Model to use (default: dall-e-3 for OpenAI, imagen-3.0-generate-002 for Google)'),
    },
  }, async ({ prompt, provider, size, quality, model }) => {
    const result = await handleGenerateImage({ prompt, provider, size, quality, model })

    const content: Array<{ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string }> = [
      { type: 'text' as const, text: result.text },
    ]

    if (result.image) {
      content.push({
        type: 'image' as const,
        data: result.image.data,
        mimeType: result.image.mimeType,
      })
    }

    return { content }
  })

  const transport = new TabServerTransport({
    allowedOrigins: ['*'],
    channelId: 'izan-image-gen',
  })
  await server.connect(transport)

  serverInstance = server
  transportInstance = transport

  return true
}

/**
 * Stop the image generation MCP server.
 */
export async function stopImageGenServer(): Promise<void> {
  if (serverInstance) {
    try {
      await serverInstance.close()
    } catch {
      // Ignore close errors
    }
    serverInstance = null
  }
  if (transportInstance) {
    try {
      await transportInstance.close()
    } catch {
      // Ignore close errors
    }
    transportInstance = null
  }
}

export function isImageGenServerRunning(): boolean {
  return serverInstance !== null
}

// Re-export for API key resolver setup
export { setApiKeyResolver } from './tools.js'
export type { ImageProvider } from './tools.js'
