<p align="center">
  <img src="thumbnail.png" alt="izan.io" width="280" />
</p>

<h1 align="center">izan.io</h1>
<p align="center">
  <strong>Chrome Extension MCP Server - Herhangi Bir AI'a Tarayici Kontrolu Ver</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="AGPL-3.0" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MCP-Protocol-green" alt="MCP" />
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.de.md">Deutsch</a>
</p>

<p align="center">
  <a href="https://izan.io"><strong>izan.io</strong></a> · <a href="https://zihin.io"><strong>Tool Marketplace</strong></a>
</p>

---

## izan.io Nedir?

izan.io, tarayicinizi **MCP server**'a donusturen bir Chrome extension'dir. Claude Desktop, Cursor, VS Code, Claude Code gibi MCP client'lar baglantip tarayicinizi tool'lar araciligiyla kontrol edebilir.

- **JavaScript ile tool yaz** - `browser` API'si ile tikla, yaz, gezin, veri cikar
- **Topluluk tool'larini yukle** - [zihin.io](https://zihin.io) marketplace'inden
- **Oturumlariniz sizde kalir** - extension authenticate tarayicinizin icinde calisir

---

## Hizli Baslangic

**1. Chrome Extension'i kurun** (Chrome Web Store).

**2. MCP client config'inize ekleyin:**

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

**3. Hazir.** Extension otomatik baglanir. Dahili tool'lar (`web_fetch`, `accessibility_snapshot`) kullanima hazir. Yan panelden kendi tool'larinizi olusturun veya marketplace'den yukleyin.

---

## Mimari

```
MCP Client (Claude Desktop, Cursor, VS Code)
  | stdio (JSON-RPC)
  v
packages/bridge/  (izan-mcp CLI)
  | WebSocket (localhost:3717)
  v
Chrome Extension (packages/extension/)
  | CDP (chrome.debugger)
  v
Browser Tab (herhangi bir site)
```

```
izan.io/
├── apps/
│   ├── web/              # Landing page + dokumantasyon (izan.io)
│   └── zihin.io/         # Tool marketplace (zihin.io)
├── packages/
│   ├── extension/        # Chrome extension (MCP server, yan panel, CDP otomasyon)
│   └── bridge/           # Bridge CLI (stdio <-> WebSocket)
```

---

## Gelistirme

```bash
git clone https://github.com/ekingunoncu/izan.io.git
cd izan.io
npm install
npm run build
```

`packages/extension/dist` klasorunu Chrome'a unpacked extension olarak yukleyin (`chrome://extensions`, gelistirici modu).

---

## Lisans

**AGPL-3.0** - Detay: [LICENSE](./LICENSE).
