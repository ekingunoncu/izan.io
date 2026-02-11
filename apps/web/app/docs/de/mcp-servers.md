# MCP-Server

## Was ist MCP?

Das **Model Context Protocol (MCP)** ist ein offenes Standardprotokoll, das KI-Modellen den Zugriff auf externe Tools ermoeglicht. Anstatt Faehigkeiten fest in ein Modell einzubauen, stellt MCP eine einheitliche Schnittstelle bereit, ueber die Tools dynamisch entdeckt und aufgerufen werden koennen. izan.io nutzt MCP als zentrales Werkzeugsystem.

## Integrierte Server

izan.io wird mit MCP-Servern ausgeliefert, die **vollstaendig im Browser** laufen -- ohne externe Abhaengigkeiten:

### General

Grundlegende Werkzeuge fuer den Alltag:

- Aktuelle Uhrzeit und Datum
- Mathematische Berechnungen
- Passwort- und UUID-Generierung

### Domain Check

Spezialisierte Domain-Werkzeuge:

- RDAP-Abfragen fuer Registrierungsdaten
- DNS-Abfragen ueber DoH (DNS over HTTPS)
- Domain-Verfuegbarkeitspruefung

## Benutzerdefinierte MCP-Server hinzufuegen

Sie koennen eigene MCP-Server einbinden, um die Plattform zu erweitern:

1. Oeffnen Sie **Einstellungen**.
2. Navigieren Sie zum Bereich **Benutzerdefinierte MCP-Server**.
3. Geben Sie die **URL** Ihres MCP-Servers ein und vergeben Sie einen Namen.
4. Der Server wird automatisch verbunden und seine Tools werden erkannt.

Dies macht izan.io zu einer idealen **Testumgebung fuer MCP-Entwickler** -- starten Sie Ihren Server lokal und verbinden Sie ihn direkt im Browser.

## CORS-Behandlung

Viele MCP-Server erlauben keine direkten Browser-Anfragen aufgrund von CORS-Beschraenkungen. izan.io loest dieses Problem automatisch:

1. Zuerst wird eine **direkte Verbindung** versucht.
2. Schlaegt diese fehl, wird die Anfrage ueber einen **CORS-Proxy** (AWS Lambda) geleitet.
3. Der Proxy leitet nur die Anfrage weiter -- er sieht **keine API-Schluessel** und speichert keine Daten.

## Server Agenten zuweisen

Jeder MCP-Server kann einem oder mehreren Agenten zugewiesen werden. Die Zuweisung erfolgt in den Agenten-Einstellungen. Nur die Server des aktiven Agenten werden verbunden -- nicht benoetigte Server werden automatisch getrennt, um Ressourcen zu schonen.
