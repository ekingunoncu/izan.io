# Kopru

Kopru (`izan-mcp`), MCP istemcilerini izan.io Chrome eklentisine baglayan bir CLI aracidir. stdio tabanli MCP protokolu ile WebSocket mesajlari arasinda ceviri yapar.

## Nasil Calisir

Kopru ayni anda iki iletisim kanali calistirir:

1. **stdio** -- MCP isteklerini istemciden okur ve yanitlari geri yazar
2. **WebSocket** -- Arac cagrilarini iletmek icin Chrome eklentisine baglanir

Bir MCP istemcisi arac cagrisi gonderdiginde, kopru bunu WebSocket uzerinden eklentiye iletir. Eklenti araci tarayicide calistirir ve sonucu ayni yoldan geri dondurur.

## Kurulum ve Kullanim

```bash
npx izan-mcp
```

Veya global olarak yukleyin:

```bash
npm install -g izan-mcp
izan-mcp
```

### Secenekler

| Parametre | Aciklama | Varsayilan |
|-----------|----------|------------|
| `--port` | WebSocket sunucu portu | `3717` |

## MCP Istemci Yapilandirmasi

### Claude Desktop

`claude_desktop_config.json` dosyasini duzenleyin:

```json
{
  "mcpServers": {
    "izan": {
      "command": "npx",
      "args": ["izan-mcp"]
    }
  }
}
```

### Cursor

Cursor ayarlarinda yeni bir MCP sunucusu ekleyin:

- **Ad**: izan
- **Komut**: `npx izan-mcp`

### VS Code

VS Code `settings.json` dosyaniza ekleyin:

```json
{
  "mcp.servers": {
    "izan": {
      "command": "npx",
      "args": ["izan-mcp"]
    }
  }
}
```

### Diger Istemciler

stdio aktarimini destekleyen herhangi bir MCP istemcisi kopruyu kullanabilir. Komutu `npx izan-mcp` olarak ayarlayin, gerisini kopru halleder.

## Sorun Giderme

- **Kopru basliyor ama istemci baglanamiyorsa**: MCP istemcinizin bir URL degil, `npx izan-mcp` komutunu kullanacak sekilde yapilandirildigindan emin olun.
- **Eklenti "Bekliyor" gosteriyorsa**: Kopru calisiyor olmayabilir. Terminalde `npx izan-mcp` komutunu calistirin.
- **Port catismasi**: 3717 portu kullaniliyorsa, `--port 3800` ile farkli bir port belirtin.
