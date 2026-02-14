# Geplante Pläne

Geplante Pläne ermöglichen es Ihnen, Ihre Agenten zu automatisieren, indem Sie sie mit einem bestimmten Prompt ausführen lassen - entweder einmalig zu einem bestimmten Zeitpunkt oder wiederkehrend mit Cron-Ausdrücken.

## Überblick

Mit Geplanten Plänen können Sie:

- **Agenten zeitgesteuert ausführen** - tägliche Berichte, wöchentliche Zusammenfassungen, periodische Prüfungen
- **Einmalige Ausführung** - einen Agenten zu einem bestimmten Datum und Uhrzeit planen
- **Wiederkehrende Ausführung** - standardmäßige Cron-Ausdrücke für flexible Zeitplanung verwenden
- **Unterbrechungsfreie Ausführung** - Pläne laufen im Hintergrund, ohne Ihren aktuellen Chat zu beeinflussen
- **Ausführungshistorie** - vergangene Ausführungen anzeigen und zu generierten Chats verlinken

## Einen Plan erstellen

1. Navigieren Sie zur **Pläne**-Seite über die Hauptnavigation (CalendarClock-Symbol)
2. Klicken Sie auf **Plan erstellen**
3. Füllen Sie das Formular aus:
   - **Name**: Ein beschreibender Name für Ihren Plan
   - **Beschreibung**: Optionale Beschreibung des Plans
   - **Agent**: Wählen Sie den Agenten, der den Plan ausführen soll
   - **Prompt**: Die Nachricht, die an den Agenten gesendet wird
   - **Zeitplantyp**: Wählen Sie zwischen "Einmalig" oder "Wiederkehrend"

### Einmalige Pläne

Wählen Sie "Einmalig" und wählen Sie ein Datum und eine Uhrzeit. Der Plan wird zu diesem Zeitpunkt ausgeführt und automatisch als abgeschlossen markiert.

### Wiederkehrende Pläne

Wählen Sie "Wiederkehrend" und geben Sie einen Standard-5-Feld-Cron-Ausdruck ein oder verwenden Sie eine der Voreinstellungen:

| Voreinstellung | Cron-Ausdruck | Beschreibung |
|---------------|--------------|-------------|
| Stündlich | `0 * * * *` | Läuft zu jeder vollen Stunde |
| Täglich um 9 Uhr | `0 9 * * *` | Läuft täglich um 9:00 Uhr |
| Wöchentlich (Montag) | `0 9 * * 1` | Läuft jeden Montag um 9:00 Uhr |
| Monatlich (1.) | `0 9 1 * *` | Läuft am 1. jedes Monats um 9:00 Uhr |

Das Formular zeigt eine Live-Vorschau des nächsten geplanten Ausführungszeitpunkts.

## Wie die Ausführung funktioniert

Wenn die geplante Zeit eines Plans erreicht ist:

1. Ein neuer Chat wird für den ausgewählten Agenten erstellt (mit `[Plan]`-Präfix)
2. Der Prompt wird als Benutzernachricht an den Agenten gesendet
3. Der Agent antwortet mit allen konfigurierten Tools und MCP-Servern
4. Die Ausführung wird in der Planhistorie protokolliert

Pläne laufen **im Hintergrund** - sie unterbrechen Ihre aktuelle Chat-Sitzung nicht.

## Erweiterung vs. Fallback-Modus

- **Mit Chrome-Erweiterung**: Pläne verwenden `chrome.alarms` für zuverlässige Zeitplanung, auch wenn der Tab im Hintergrund ist
- **Ohne Erweiterung**: Pläne prüfen alle 30 Sekunden, wenn der izan.io-Tab geöffnet ist. Verpasste Pläne werden nachgeholt, wenn Sie den Tab erneut öffnen.

## Pläne verwalten

- **Pausieren/Fortsetzen**: Status eines Plans zwischen aktiv und pausiert umschalten
- **Jetzt ausführen**: Eine Planausführung jederzeit manuell auslösen
- **Bearbeiten**: Name, Prompt, Agent oder Zeitplan des Plans ändern
- **Löschen**: Einen Plan und seine Ausführungshistorie entfernen

## Voraussetzungen

- Ein **API-Schlüssel** muss für Ihren ausgewählten Anbieter konfiguriert sein
- Der dem Plan zugewiesene **Agent** muss vorhanden und aktiviert sein
