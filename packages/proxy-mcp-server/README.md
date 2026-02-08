# @izan/proxy-mcp-server

MCP proxy Lambda – kullanıcının eklediği uzak MCP sunucularına (RapidAPI vb.) proxy yapar. CORS sorununu çözer.

## Nasıl çalışır

- Kullanıcı Add MCP ile uzak URL + headers ekler
- Client isteği direkt uzak URL'e değil, `/api/proxy/mcp` endpoint'ine gönderir
- `X-MCP-Proxy-Target` header'ında base64 JSON: `{ url, headers }`
- Lambda hedefe istek atar, yanıtı client'a döner

## Route

`POST /api/proxy/mcp`

Deploy için ek config gerekmez – target her istekte client'tan gelir.
