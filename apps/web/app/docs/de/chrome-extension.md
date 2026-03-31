# Chrome-Erweiterung

Die izan.io Chrome-Erweiterung betreibt einen MCP-Server direkt in Ihrem Browser. MCP-Clients verbinden sich ueber die Bridge-CLI und koennen Tools aufrufen, die mit Webseiten interagieren.

## Was die Erweiterung macht

Die Erweiterung stellt Browser-Automatisierungsfunktionen als MCP-Tools bereit. Wenn ein MCP-Client ein Tool aufruft, fuehrt die Erweiterung es im Browser-Kontext aus -- sie navigiert Seiten, klickt auf Elemente, extrahiert Daten und gibt Ergebnisse zurueck.

## Seitenpanel

Klicken Sie auf das izan.io-Symbol in der Symbolleiste, um das Seitenpanel zu oeffnen. Von hier aus koennen Sie:

- **Tools erstellen** -- Neue Tools mit dem integrierten Editor schreiben
- **Tools bearbeiten** -- Bestehende Tool-Definitionen aendern
- **Tools testen** -- Tools manuell mit Testparametern ausfuehren
- **Tools verwalten** -- Tools aktivieren, deaktivieren oder loeschen

Jedes Tool hat einen Namen, eine Beschreibung, Parameterdefinitionen und einen JavaScript-Funktionskoerper.

## Tool-Speicherung

Tools werden lokal in `chrome.storage.local` gespeichert. Sie verlassen Ihren Browser nur, wenn Sie sie explizit exportieren oder veroeffentlichen. Das bedeutet:

- Tools bleiben ueber Browser-Neustarts hinweg erhalten
- Tools sind an Ihr Chrome-Profil gebunden
- Das Deinstallieren der Erweiterung entfernt alle Tools

## Verbindungsstatus

Das Seitenpanel zeigt den aktuellen Verbindungsstatus:

- **Verbunden** -- Die Bridge laeuft und ein MCP-Client ist verbunden
- **Warten** -- Die Erweiterung ist bereit, aber keine Bridge ist verbunden
- **Getrennt** -- Die Erweiterung kann nicht mit der Bridge kommunizieren

Wenn Sie "Getrennt" sehen, stellen Sie sicher, dass die Bridge laeuft (`npx izan-mcp`) und Ihr MCP-Client korrekt konfiguriert ist.
