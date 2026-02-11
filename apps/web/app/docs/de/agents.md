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

## MCP-Server und Makros zuweisen

Jeder Agent -- ob integriert oder benutzerdefiniert -- kann mit beliebigen MCP-Servern und Makros ausgestattet werden. Die Zuweisung erfolgt in den Agenten-Einstellungen. Beim Wechsel zwischen Agenten werden nur die jeweils benoetigten Server aktiviert, um Ressourcen zu sparen.
