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

### Automatische Erkennung langer Aufgaben

Auch ohne Deep Task Modus erkennt izan.io, wenn eine Aufgabe **3 oder mehr Tool-Aufrufrunden** durchlaeuft, und zeigt automatisch das Fortschritts-Banner an. Sie koennen vom Banner aus Browser-Benachrichtigungen aktivieren.

### Hintergrundaufgaben

Wenn Sie waehrend einer laufenden Aufgabe zu einem anderen Chat wechseln, wird die laufende Aufgabe **automatisch in den Hintergrund verschoben**. Hintergrundaufgaben laufen weiter und:

- Zeigen einen **Statusindikator** (Drehsymbol) neben dem Chat in der Seitenleiste
- Zeigen den **Schrittfortschritt** in der Chat-Liste
- Senden eine **Browser-Benachrichtigung** bei Abschluss oder Fehler
- Lassen den **Browser-Tab-Titel blinken**, wenn der Tab nicht fokussiert ist

## Maximale Iterationen

Jeder Agent hat eine konfigurierbare Einstellung fuer **maximale Iterationen** (Standard: 25), die die maximale Anzahl von Tool-Aufrufrunden pro Nachricht steuert. Sie koennen dies im Abschnitt **Modellparameter** des Agenten-Bearbeitungspanels anpassen. Hoehere Werte ermoeglichen laengere autonome Aufgaben, waehrend niedrigere Werte Aufgaben fokussiert halten.

## Tools Agenten zuweisen

Vom **Agenten-Bearbeitungspanel** aus koennen Sie:

- **MCP-Server zuweisen** -- dem Agenten Zugriff auf die Tools eines verbundenen MCP-Servers geben
- **Makros zuweisen** -- aufgezeichnete Browser-Automatisierungen anhaengen, die der Agent waehrend eines Gespraechs ausloesen kann
- **Andere Agenten verknuepfen** -- Multi-Agent-Orchestrierung ermoeglichen, indem Sie Agenten als aufrufbare Tools auswaehlen

## Agenten exportieren & importieren

Sie koennen Agenten-Konfigurationen mit anderen **teilen** oder sichern:

### Export

Klicken Sie im Agenten-Bearbeitungspanel auf den **Export-Button**, um den Agenten als JSON-Datei herunterzuladen. Der Export enthaelt:

- Name, Beschreibung, System-Prompt, Symbol und Modellparameter des Agenten
- Alle verknuepften Agenten (rekursiv)
- Benutzerdefinierte MCP-Server-Konfigurationen
- Dem Agenten zugewiesene Makro-Server und Tools

### Import

Klicken Sie im Agenten-Bearbeitungspanel auf den **Import-Button** und waehlen Sie eine JSON-Datei. izan.io wird:

- Den Agenten mit allen Einstellungen erstellen
- Verknuepfte Agenten rekursiv importieren
- Benutzerdefinierte MCP-Server-Verbindungen wiederherstellen
- Makro-Server und Tools wiederherstellen

## Agenten-Profilseiten

Jeder Agent hat eine **Profilseite**, die ueber die Agentenliste zugaenglich ist. Das Profil zeigt:

- Agent-Symbol, Name und Beschreibung
- System-Prompt
- Zugewiesene Tools: integrierte MCPs, benutzerdefinierte MCPs, Makros und verknuepfte Agenten
- Einen **Agent verwenden**-Button zum Starten eines Chats

Fuer benutzerdefinierte Agenten zeigt das Profil zusaetzlich ein "Vom Benutzer erstellt"-Badge an.
