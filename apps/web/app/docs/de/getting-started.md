# Erste Schritte

izan.io ist eine Chrome-Erweiterung, die Ihren Browser in einen MCP-Server verwandelt. Externe MCP-Clients wie Claude Desktop, Cursor und VS Code verbinden sich ueber eine Bridge-CLI und koennen Tools ausfuehren, die den Browser automatisieren.

## 1. Chrome-Erweiterung installieren

Installieren Sie die izan.io-Erweiterung aus dem [Chrome Web Store](https://chromewebstore.google.com). Nach der Installation sehen Sie das izan.io-Symbol in Ihrer Browser-Symbolleiste.

## 2. Bridge installieren

Die Bridge (`izan-mcp`) verbindet MCP-Clients mit der Chrome-Erweiterung. Fuehren Sie folgenden Befehl aus:

```bash
npx izan-mcp
```

Dieser Befehl startet einen lokalen WebSocket-Server, der Nachrichten zwischen Ihrem MCP-Client und der Erweiterung weiterleitet.

## 3. MCP-Client konfigurieren

Fuegen Sie izan.io zu Ihrer MCP-Client-Konfiguration hinzu. Fuer Claude Desktop bearbeiten Sie die Datei `claude_desktop_config.json`:

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

Starten Sie Ihren MCP-Client nach dem Speichern neu.

## 4. Ein integriertes Tool ausprobieren

Oeffnen Sie Ihren MCP-Client und probieren Sie eines der integrierten Tools aus:

- **web_fetch** -- Ruft den Inhalt einer URL ab
- **accessibility_snapshot** -- Gibt den Accessibility-Baum der aktuellen Seite zurueck

Beispiel-Prompt: *"Verwende web_fetch, um den Inhalt von https://example.com abzurufen"*

Die Erweiterung fuehrt die Anfrage im Browser aus und gibt das Ergebnis an Ihren MCP-Client zurueck.

## Naechste Schritte

- [Chrome-Erweiterung](/docs/chrome-extension) -- Seitenpanel und Tool-Verwaltung kennenlernen
- [Tools](/docs/tools) -- Eigene Tools mit der Browser-API erstellen
- [Bridge](/docs/bridge) -- Bridge fuer verschiedene MCP-Clients konfigurieren
- [Marktplatz](/docs/marketplace) -- Community-Tools entdecken und installieren
