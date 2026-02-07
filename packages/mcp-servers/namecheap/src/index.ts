/**
 * @izan/mcp-servers-namecheap - Namecheap domain check MCP server
 */

import { createHandler } from '@izan/mcp-servers-shared'
import { TOOLS } from './tools.js'

export const handler = createHandler(TOOLS, {
  name: 'izan-mcp-namecheap',
  version: '0.1.0',
})
