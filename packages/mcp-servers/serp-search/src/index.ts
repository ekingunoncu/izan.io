/**
 * @izan/mcp-servers-serp-search - SerpApi MCP server
 *
 * Search the web via SerpApi (Google, Bing, DuckDuckGo, Yahoo, etc.).
 * API key is passed from client via X-SerpApi-Key header.
 */

import { createHandler } from '@izan/mcp-servers-shared'
import { TOOLS } from './tools.js'

export const handler = createHandler(TOOLS, {
  name: 'izan-mcp-serp-search',
  version: '0.1.0',
})
