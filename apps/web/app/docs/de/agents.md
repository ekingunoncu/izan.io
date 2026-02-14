# Agenten

Agenten sind **spezialisierte KI-Assistenten**, die ueber das Model Context Protocol (MCP) auf eingebaute Tools zugreifen koennen. Jeder Agent verfuegt ueber einen eigenen System-Prompt, zugewiesene MCP-Server und optionale Makros, die sein Verhalten und seine Faehigkeiten bestimmen.

## Integrierte Agenten

izan.io wird mit vorkonfigurierten Agenten ausgeliefert:

### Allgemeiner Assistent

Der Standardagent mit Zugriff auf grundlegende Werkzeuge:

- **Zeitabfrage** -- aktuelle Uhrzeit und Datumsberechnungen
- **Berechnung** -- mathematische Ausdruecke auswerten
- **Passwortgenerator** -- sichere Passwoerter erzeugen
- **UUID-Generator** -- eindeutige Bezeichner erstellen

### Domain-Experte

Spezialisiert auf Domain-Recherche und Verfuegbarkeitspruefung:

- **Domain-Suche** -- RDAP- und WHOIS-Daten abrufen
- **Verfuegbarkeitspruefung** -- pruefen, ob eine Domain registrierbar ist
- **DNS-Abfragen** -- DNS-Eintraege ueber DoH (DNS over HTTPS) abfragen

## Benutzerdefinierte Agenten erstellen

Unter **Einstellungen** koennen Sie eigene Agenten anlegen:

1. Vergeben Sie einen **Namen** und eine **Beschreibung**.
2. Schreiben Sie einen **System-Prompt**, der das Verhalten des Agenten definiert.
3. Passen Sie **Modellparameter** an (z. B. Temperatur, maximale Tokens).
4. Weisen Sie **MCP-Server** und **Makros** zu, die der Agent nutzen soll.

## Agenten verknuepfen (Multi-Agent-Orchestrierung)

Ein Agent kann andere Agenten als Tools aufrufen. So lassen sich komplexe Aufgaben auf mehrere Spezialisten verteilen. Der aufrufende Agent nutzt dabei das Tool `ask_agent_{id}`, um einen anderen Agenten zu befragen. Die **maximale Verschachtelungstiefe betraegt 3 Ebenen**, um endlose Schleifen zu vermeiden.

## Deep Task Modus

Fuer komplexe Aufgaben, bei denen der Agent autonom durch viele Tool-Aufrufe arbeiten soll, verwenden Sie den **Deep Task** Modus. Klicken Sie vor dem Senden Ihrer Nachricht auf das **Blitz-Symbol** neben dem Senden-Button.

Wenn Deep Task aktiv ist:

- Ein **Fortschritts-Banner** erscheint sofort und zeigt die verstrichene Zeit und Schrittzahl
- **Browser-Benachrichtigungen** werden automatisch aktiviert -- Sie werden benachrichtigt, wenn die Aufgabe abgeschlossen ist
- Der Agent arbeitet seine gesamte Tool-Aufruf-Schleife ab, ohne auf Benutzereingaben zu warten

Deep Task eignet sich ideal fuer rechercheintensive Aufgaben, mehrstufige Workflows und alle Aufgaben, bei denen der Agent viele aufeinanderfolgende Tool-Aufrufe durchfuehren muss.

## Maximale Iterationen

Jeder Agent hat eine konfigurierbare Einstellung fuer **maximale Iterationen** (Standard: 25), die die maximale Anzahl von Tool-Aufrufrunden pro Nachricht steuert. Sie koennen dies im Abschnitt **Modellparameter** des Agenten-Bearbeitungspanels anpassen. Hoehere Werte ermoeglichen laengere autonome Aufgaben, waehrend niedrigere Werte Aufgaben fokussiert halten.

## MCP-Server und Makros zuweisen

Jeder Agent -- ob integriert oder benutzerdefiniert -- kann mit beliebigen MCP-Servern und Makros ausgestattet werden. Die Zuweisung erfolgt in den Agenten-Einstellungen. Beim Wechsel zwischen Agenten werden nur die jeweils benoetigten Server aktiviert, um Ressourcen zu sparen.
