# API-Schluessel und Datenschutz

izan.io verfolgt einen konsequenten **Privacy-First-Ansatz**. Die Plattform benoetigt kein Benutzerkonto, keine Registrierung und keinen Login. Ihre Daten bleiben vollstaendig unter Ihrer Kontrolle.

## Lokale Speicherung von API-Schluesseln

Alle API-Schluessel werden ausschliesslich in der **IndexedDB Ihres Browsers** gespeichert. Sie werden zu keinem Zeitpunkt an einen izan.io-Server uebertragen. Wenn Sie Ihren Browser wechseln oder die Browserdaten loeschen, muessen die Schluessel erneut eingegeben werden.

## Direkte Browser-zu-Anbieter-Aufrufe

Wenn Sie eine Nachricht senden, stellt Ihr Browser eine **direkte Verbindung** zum jeweiligen LLM-Anbieter her (z. B. OpenAI, Anthropic, Google). Es gibt keinen Mittelsmann -- izan.io leitet Ihre Anfragen nicht durch eigene Server. Der API-Schluessel wird ausschliesslich im Authorization-Header der direkten Anfrage an den Anbieter verwendet.

## Lokale Gespraechsspeicherung

Alle Chats, Nachrichten und Agentenkonfigurationen werden in der **lokalen IndexedDB** Ihres Browsers gespeichert. Es erfolgt keine Synchronisierung mit externen Servern. Ein Export ist jederzeit moeglich.

## Open Source fuer Transparenz

izan.io ist unter der **AGPL-3.0-Lizenz** vollstaendig quelloffen. Der gesamte Quellcode ist auf GitHub einsehbar. Sie koennen jederzeit pruefen, dass keine Daten unbemerkt uebertragen werden, oder die Plattform selbst hosten.

## MCP-Proxy

Der einzige serverseitige Dienst ist ein **CORS-Proxy** fuer benutzerdefinierte MCP-Server. Dieser wird nur aktiviert, wenn eine direkte Verbindung zu einem externen MCP-Server an CORS-Beschraenkungen scheitert. Der Proxy leitet ausschliesslich MCP-Anfragen weiter -- er hat **keinen Zugriff auf Ihre API-Schluessel**, da diese nur bei direkten Anbieter-Aufrufen verwendet werden.
