/**
 * @izan/mcp-servers-web-fetch - HTTP fetch MCP server
 *
 * Fetches content from any public URL. For web research.
 */

import { createHandler } from '@izan/mcp-servers-shared'
import { TOOLS } from './tools.js'

export const handler = createHandler(TOOLS, {
  name: 'izan-mcp-web-fetch',
  version: '0.1.0',
})
