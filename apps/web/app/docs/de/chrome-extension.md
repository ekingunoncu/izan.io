# Chrome-Erweiterung

Die izan.io Chrome-Erweiterung ermoeglicht die **Aufzeichnung und Ausfuehrung von Makros** -- Browser-Automatisierungen, die Agenten als Tools nutzen koennen. Ohne die Erweiterung stehen Makro-Funktionen nicht zur Verfuegung.

## Installation

Es gibt zwei Wege, die Erweiterung zu installieren:

- **Chrome Web Store** -- suchen Sie nach "izan.io" und installieren Sie die Erweiterung direkt.
- **Aus Quellcode bauen** -- klonen Sie das Repository und fuehren Sie `npm run build:extension` aus. Laden Sie den Build-Ordner anschliessend unter `chrome://extensions` als entpackte Erweiterung.

## Seitenpanel

Das Seitenpanel ist die zentrale Oberflaeche der Erweiterung:

1. Klicken Sie auf das **izan.io-Erweiterungssymbol** in der Chrome-Symbolleiste.
2. Das Seitenpanel oeffnet sich am rechten Bildschirmrand.
3. Hier finden Sie die **Aufnahmesteuerungen**, eine Liste gespeicherter Makros und Statusanzeigen.

## Aufnahme-Workflow

1. Oeffnen Sie das Seitenpanel und klicken Sie auf **Aufnehmen**.
2. Navigieren Sie zur gewuenschten Website und **interagieren** Sie wie gewohnt -- Klicks, Texteingaben, Scrollen und Seitenwechsel werden erfasst.
3. Klicken Sie auf **Stopp**, um die Aufnahme zu beenden.
4. Vergeben Sie einen **Namen** und speichern Sie das Makro.
5. Das Makro steht nun in izan.io zur Zuweisung an Agenten bereit.

## Kommunikation mit izan.io

Die Erweiterung kommuniziert mit der izan.io-Webseite ueber **postMessage-Nachrichten** zwischen dem Content Script und der Seite. Alle Nachrichten verwenden das `izan:*`-Protokoll. Dadurch kann die Webseite Makros registrieren, ausfuehren lassen und Ergebnisse empfangen, ohne dass ein externer Server benoetigt wird.

## Voraussetzung fuer Agenten mit Makros

Die Chrome-Erweiterung ist **zwingend erforderlich**, wenn Agenten Makros ausfuehren sollen. Ohne installierte Erweiterung werden Makro-Tools im Chat nicht ausgefuehrt. Alle anderen Funktionen von izan.io -- einschliesslich integrierter MCP-Server und benutzerdefinierter Server -- funktionieren auch ohne die Erweiterung.
