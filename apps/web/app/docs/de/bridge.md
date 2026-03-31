# Bridge

Die Bridge (`izan-mcp`) ist ein CLI-Tool, das MCP-Clients mit der izan.io Chrome-Erweiterung verbindet. Sie uebersetzt zwischen dem stdio-basierten MCP-Protokoll und WebSocket-Nachrichten.

## Funktionsweise

Die Bridge betreibt zwei Kommunikationskanaele gleichzeitig:

1. **stdio** -- Liest MCP-Anfragen vom Client und schreibt Antworten zurueck
2. **WebSocket** -- Verbindet sich mit der Chrome-Erweiterung, um Tool-Aufrufe weiterzuleiten

Wenn ein MCP-Client einen Tool-Aufruf sendet, leitet die Bridge diesen per WebSocket an die Erweiterung weiter. Die Erweiterung fuehrt das Tool im Browser aus und gibt das Ergebnis ueber denselben Weg zurueck.

## Installation und Verwendung

```bash
npx izan-mcp
```

Oder global installieren:

```bash
npm install -g izan-mcp
izan-mcp
```

### Optionen

| Flag | Beschreibung | Standard |
|------|-------------|----------|
| `--port` | WebSocket-Server-Port | `3717` |

## MCP-Client-Konfiguration

### Claude Desktop

Bearbeiten Sie `claude_desktop_config.json`:

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

Fuegen Sie in den Cursor-Einstellungen einen neuen MCP-Server hinzu:

- **Name**: izan
- **Befehl**: `npx izan-mcp`

### VS Code

Fuegen Sie Folgendes zu Ihrer VS Code `settings.json` hinzu:

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

### Andere Clients

Jeder MCP-Client mit stdio-Transport-Unterstuetzung kann die Bridge verwenden. Setzen Sie den Befehl auf `npx izan-mcp` -- die Bridge erledigt den Rest.

## Fehlerbehebung

- **Bridge startet, aber Client kann sich nicht verbinden**: Stellen Sie sicher, dass Ihr MCP-Client `npx izan-mcp` als Befehl verwendet, nicht eine URL.
- **Erweiterung zeigt "Warten"**: Die Bridge laeuft moeglicherweise nicht. Fuehren Sie `npx izan-mcp` in einem Terminal aus.
- **Port-Konflikt**: Wenn Port 3717 belegt ist, geben Sie mit `--port 3800` einen anderen Port an.
