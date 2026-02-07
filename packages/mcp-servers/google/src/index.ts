/**
 * @izan/mcp-servers-google - Google Custom Search MCP server
 */

import { createHandler } from '@izan/mcp-servers-shared'
import { TOOLS } from './tools.js'

export const handler = createHandler(TOOLS, {
  name: 'izan-mcp-google',
  version: '0.1.0',
})
