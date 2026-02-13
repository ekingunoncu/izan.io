# Analytik

## Überblick

Die Analytik-Seite zeigt Ihnen eine Aufschlüsselung Ihrer **Token-Nutzung und Kosten** nach Modellen, Agenten und Tools. Jeder LLM-API-Aufruf wird lokal in der IndexedDB Ihres Browsers gespeichert -- keine Daten verlassen Ihr Gerät.

Greifen Sie auf die Analytik über das **Diagramm-Symbol** in der Kopfzeile der Startseite zu.

## Übersichtskarten

Am oberen Rand der Seite zeigen vier Karten aggregierte Statistiken für den ausgewählten Zeitraum:

- **Gesamtkosten** -- Ihre Gesamtausgaben in USD, mit einem Trendindikator im Vergleich zum vorherigen Zeitraum
- **Gesamte Token** -- kombinierte Eingabe- und Ausgabe-Token, mit einer Aufschlüsselung nach Typ
- **API-Aufrufe** -- Gesamtzahl der LLM-Anfragen
- **Durchschn. / Aufruf** -- durchschnittliche Kosten pro API-Aufruf

## Zeitraum

Filtern Sie Daten nach Zeitraum mit der segmentierten Steuerung:

- **7T** -- letzte 7 Tage
- **30T** -- letzte 30 Tage (Standard)
- **90T** -- letzte 90 Tage
- **Alle** -- alle aufgezeichneten Daten

Der Trendindikator auf der Gesamtkosten-Karte vergleicht den aktuellen Zeitraum mit dem vorherigen (z.B. diese 7 Tage vs. die vorherigen 7 Tage).

## Nutzung im Zeitverlauf

Ein Balkendiagramm zeigt die tägliche Nutzung. Wechseln Sie zwischen **Kosten**- und **Token**-Ansichten:

- **Kosten** -- tägliche Ausgaben in USD
- **Token** -- gestapelte Balken mit Eingabe-Token (blau) und Ausgabe-Token (grün)

Fahren Sie mit der Maus über die Balken, um genaue Werte im Tooltip zu sehen.

## Aufschlüsselungen

### Pro Agent

Zeigt, welche Agenten das meiste Budget verbrauchen. Jeder Agent wird mit einem Fortschrittsbalken relativ zum höchsten Verbraucher und seinen Gesamtkosten angezeigt.

### Pro Modell

Gleiches Layout wie die Agenten-Aufschlüsselung, aber nach Modell-ID gruppiert (z.B. `gpt-4.1`, `claude-sonnet-4-5-20250929`). Nützlich für den Vergleich der Kosteneffizienz verschiedener Anbieter.

### Tool-Nutzung

Listet die **10 am häufigsten aufgerufenen Tools** mit ihrer Aufrufanzahl auf. Dies hilft zu erkennen, auf welche MCP-Tools Ihre Agenten am meisten angewiesen sind.

## Daten löschen

Klicken Sie auf das **Papierkorb-Symbol** in der Kopfzeile, um alle Analytik-Datensätze zu löschen. Ein Bestätigungsdialog erscheint, bevor Daten entfernt werden. Diese Aktion ist nicht rückgängig zu machen.

## Funktionsweise

Jedes Mal, wenn ein LLM-Aufruf abgeschlossen wird (einschließlich jeder Runde in der Tool-Aufruf-Schleife), wird ein Nutzungsdatensatz mit folgenden Informationen in IndexedDB gespeichert:

- Anzahl der Eingabe- und Ausgabe-Token
- Aus der Preisgestaltung des Anbieters berechnete Kosten
- Agent- und Modell-Kennungen
- Namen aller in dieser Runde aufgerufenen Tools

Alle Berechnungen erfolgen clientseitig. Es werden keine Analytik-Daten an einen Server gesendet.
