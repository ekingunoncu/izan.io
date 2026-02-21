/**
 * Image generation provider implementations.
 * Each provider calls its API and returns base64 image data.
 */

export interface ImageGenParams {
  prompt: string
  size?: string
  quality?: 'standard' | 'hd'
  model?: string
}

export interface ImageGenResult {
  data: string // base64
  mimeType: string
  revisedPrompt?: string
}

/**
 * Generate an image via OpenAI DALL-E API.
 * Returns base64-encoded PNG.
 */
export async function generateWithOpenAI(
  apiKey: string,
  params: ImageGenParams,
): Promise<ImageGenResult> {
  const model = params.model || 'dall-e-3'
  const size = params.size || '1024x1024'
  const quality = params.quality || 'standard'

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: params.prompt,
      n: 1,
      size,
      quality,
      response_format: 'b64_json',
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json() as {
    data: Array<{ b64_json: string; revised_prompt?: string }>
  }

  const image = data.data[0]
  if (!image?.b64_json) {
    throw new Error('No image data returned from OpenAI')
  }

  return {
    data: image.b64_json,
    mimeType: 'image/png',
    revisedPrompt: image.revised_prompt,
  }
}

/**
 * Generate an image via Google Imagen API (Gemini).
 * Returns base64-encoded PNG.
 */
export async function generateWithGoogle(
  apiKey: string,
  params: ImageGenParams,
): Promise<ImageGenResult> {
  const model = params.model || 'imagen-3.0-generate-002'

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: params.prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: params.size === '1792x1024' ? '16:9' : params.size === '1024x1792' ? '9:16' : '1:1',
        },
      }),
    },
  )

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(err.error?.message || `Google API error: ${response.status}`)
  }

  const data = await response.json() as {
    predictions: Array<{ bytesBase64Encoded: string; mimeType?: string }>
  }

  const image = data.predictions?.[0]
  if (!image?.bytesBase64Encoded) {
    throw new Error('No image data returned from Google Imagen')
  }

  return {
    data: image.bytesBase64Encoded,
    mimeType: image.mimeType || 'image/png',
  }
}
