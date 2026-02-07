# MCP API - Curl ile Test

## Düzeltilmiş curl örneği

```bash
curl -X POST 'https://izan.io/api/namecheap/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://izan.io' \
  --data-raw '{"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"izan-client","version":"0.1.0"}},"jsonrpc":"2.0","id":0}'
```

## Yaygın hatalar

| Sorun | Çözüm |
|-------|-------|
| `http://` | `https://` kullan – site HTTPS üzerinden çalışıyor |
| `Referer;` (virgülle ayrılmış) | `Referer:` olmalı. CORS için `Origin: https://izan.io` kullan |
| `protocolVersion: "2025-11-25"` | Kullanılabilir; sunucu `2025-03-26` döner |

## CORS

API sadece izin verilen origin'lerden gelen istekleri kabul eder: `https://izan.io`, `https://www.izan.io`, localhost. Curl ile test ederken `Origin: https://izan.io` ekleyin.

## tools/list örneği

```bash
curl -X POST 'https://izan.io/api/namecheap/mcp' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://izan.io' \
  --data-raw '{"method":"tools/list","params":{},"jsonrpc":"2.0","id":1}'
```
