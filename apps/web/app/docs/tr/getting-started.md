# Baslangic

izan.io, tarayicinizi bir MCP sunucusuna donusturen bir Chrome eklentisidir. Claude Desktop, Cursor ve VS Code gibi MCP istemcileri, bir kopru CLI araciligiyla baglanir ve tarayiciyi otomatizan araclar calistirir.

## 1. Chrome Eklentisini Kurun

izan.io eklentisini [Chrome Web Magazasi](https://chromewebstore.google.com)'ndan yukleyin. Kurulduktan sonra tarayici arac cubugunda izan.io simgesini goreceksiniz.

## 2. Kopruyu Kurun

Kopru (`izan-mcp`), MCP istemcilerini Chrome eklentisine baglar. Calistirmak icin:

```bash
npx izan-mcp
```

Bu komut, MCP istemciniz ile eklenti arasindaki mesajlari ileten yerel bir WebSocket sunucusu baslatir.

## 3. MCP Istemcinizi Yapilandirin

izan.io'yu MCP istemci yapilandirmaniza ekleyin. Claude Desktop icin `claude_desktop_config.json` dosyasini duzenleyin:

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

Kaydettikten sonra MCP istemcinizi yeniden baslatin.

## 4. Yerlesik Bir Araci Deneyin

MCP istemcinizi acin ve yerlesik araclardan birini deneyin:

- **web_fetch** -- Bir URL'nin icerigini getirir
- **accessibility_snapshot** -- Mevcut sayfanin erisilebilirlik agacini dondurur

Ornek istem: *"web_fetch kullanarak https://example.com icerigini getir"*

Eklenti, istegi tarayicide calistirir ve sonucu MCP istemcinize dondurur.

## Sonraki Adimlar

- [Chrome Eklentisi](/docs/chrome-extension) -- Eklenti yan panelini ve arac yonetimini ogrenin
- [Araclar](/docs/tools) -- Tarayici API'si ile ozel araclar olusturun
- [Kopru](/docs/bridge) -- Farkli MCP istemcileri icin kopruyu yapilandirin
- [Pazar Yeri](/docs/marketplace) -- Topluluk araclarini kesfedip yukleyin
