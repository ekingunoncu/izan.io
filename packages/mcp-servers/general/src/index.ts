/**
 * @izan/mcp-servers-general - General purpose MCP server
 */

import { createHandler } from '@izan/mcp-servers-shared'
import { TOOLS } from './tools.js'

export const handler = createHandler(TOOLS, {
  name: 'izan-mcp-general',
  version: '0.1.0',
})
