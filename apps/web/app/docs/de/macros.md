# Makros (Browser-Automatisierung)

## Was sind Makros?

Makros sind **aufgezeichnete Browser-Automatisierungen**, die als MCP-Tools registriert und von Agenten ausgefuehrt werden koennen. Damit lassen sich wiederkehrende Aufgaben im Browser automatisieren -- von Webrecherche ueber Formularausfuellung bis hin zur Datenextraktion.

## Makro-Server

Vor der Aufzeichnung benoetigen Sie einen **Makro-Server**, um Ihre Makros zu organisieren. Ein Server ist eine benannte Gruppe verwandter Makros.

- Klicken Sie im Seitenpanel auf **Neuer Server**
- Vergeben Sie einen **Namen** und eine optionale **Beschreibung**
- Bearbeiten oder loeschen Sie Server ueber die Symbole neben dem Servernamen
- Jeder Server kann mehrere Makros enthalten

## Makros aufzeichnen

Die Aufzeichnung erfolgt ueber die **Chrome-Erweiterung**:

1. Oeffnen Sie das **Seitenpanel** der Erweiterung ueber das Erweiterungssymbol
2. Klicken Sie unter dem gewuenschten Server auf **Makro aufnehmen**
3. Klicken Sie auf **Aufnehmen**, um die Erfassung zu starten
4. **Interagieren** Sie mit der gewuenschten Website -- Klicks, Texteingaben, Navigation und Scrollen werden automatisch erfasst
5. Klicken Sie auf **Stopp**, um die Aufnahme zu beenden
6. Klicken Sie auf **Fertig**, um zum Speicher-Dialog zu gelangen
7. Vergeben Sie einen **Namen**, fuegen Sie eine Beschreibung hinzu und **speichern** Sie

Der Rekorder erfasst jede Interaktion als einzelnen Schritt mit Element-Selektoren, Aktionstypen und Eingabewerten. Schritte erscheinen im Seitenpanel in Echtzeit waehrend der Aufnahme.

### Zusaetzliche Aufnahmesteuerungen

- **Listenextraktion** -- klicken Sie waehrend der Aufnahme auf **Liste**, um aehnliche Elemente zu erfassen (z. B. Suchergebnisse, Tabellenzeilen)
- **Einzelextraktion** -- klicken Sie auf **Einzel**, um Daten aus einem einzelnen Element zu extrahieren
- **Warteschritt** -- klicken Sie auf **Warten**, um eine manuelle Verzoegerung (0,1--30 Sekunden) einzufuegen
- **Lane** -- fuegen Sie eine parallele Lane fuer gleichzeitige Ausfuehrung in separaten Tabs hinzu

## Parametrisierung

Die Parametrisierung wandelt statisch aufgezeichnete Werte in **dynamische Eingaben** um, die das LLM zur Laufzeit bereitstellt. Es gibt drei Typen:

### URL-Abfrageparameter

Wenn ein Navigationsschritt URL-Abfrageparameter hat (z. B. `?q=test`), wird jeder Parameter mit einem **Umschalter** angezeigt. Aktivieren Sie den Schalter, um ihn dynamisch zu machen:

1. Der Wert aendert sich von `test` zu `{{q}}`
2. Geben Sie eine **Beschreibung** ein, damit das LLM weiss, was es bereitstellen soll (z. B. "Suchbegriff")
3. Zur Laufzeit fuellt das LLM den tatsaechlichen Wert ein

### URL-Pfadsegmente

Pfadsegmente in einer URL koennen ebenfalls parametrisiert werden. Zum Beispiel in `github.com/user/repo/issues/123`:

1. Jedes Pfadsegment (`user`, `repo`, `issues`, `123`) wird mit einem Umschalter angezeigt
2. Aktivieren Sie den Schalter bei `123`, um es dynamisch zu machen
3. Geben Sie einen **Parameternamen** (z. B. `issue_number`) und eine **Beschreibung** ein
4. Die URL wird zu `github.com/user/repo/issues/{{issue_number}}`

### Texteingabewerte

In Eingabefelder eingegebener Text kann parametrisiert werden:

1. Ein Tipp-Schritt zeigt den aufgezeichneten Text mit einem Umschalter
2. Aktivieren Sie den Schalter, um den Text dynamisch zu machen
3. Geben Sie einen **Parameternamen** (z. B. `search_query`) und eine **Beschreibung** ein
4. Zur Laufzeit stellt das LLM den einzugebenden Text bereit

## Makros bearbeiten

Klicken Sie auf ein Makro in der Liste, um die **Bearbeitungsansicht** zu oeffnen:

- **Umbenennen** des Makros und Aktualisierung der Beschreibung
- **Schritte neu anordnen** durch Ziehen des Griffsymbols oder mit den Auf/Ab-Pfeilen
- **Schritte loeschen** durch Hovern und Klick auf das Papierkorb-Symbol
- **Zusaetzliche Schritte aufnehmen** -- druecken Sie Aufnehmen, um neue Aktionen an das bestehende Makro anzufuegen
- **Extraktionsschritte hinzufuegen** mit den Liste/Einzel-Buttons im Bearbeitungs-Aufnahmemodus
- **Warteschritte einfuegen** mit konfigurierbarer Dauer
- **Warte-Bedingung konfigurieren** bei Navigationsschritten: Seitenladung (Standard), DOM Bereit oder Netzwerk Idle
- **Parameter anpassen** -- Parametrisierung fuer URL-Parameter, Pfadsegmente und Texteingaben ein-/ausschalten
- **Als JSON exportieren** aus der Bearbeitungsansicht

## Datenextraktion

Extraktion ermoeglicht es Makros, **strukturierte Daten** aus Webseiten zu extrahieren. Waehrend der Aufnahme:

### Listenmodus

1. Klicken Sie waehrend der Aufnahme auf **Liste**
2. Fahren Sie ueber ein sich wiederholendes Element (z. B. ein Suchergebnis) -- es wird gelb hervorgehoben
3. Klicken Sie zur Auswahl -- alle aehnlichen Elemente werden erkannt und hervorgehoben
4. Der Extraktionsschritt erfasst die Elementanzahl und Felddefinitionen
5. Zur Laufzeit werden die Daten aller uebereinstimmenden Elemente als strukturierte Liste zurueckgegeben

### Einzelmodus

1. Klicken Sie waehrend der Aufnahme auf **Einzel**
2. Fahren Sie ueber das Zielelement und klicken Sie
3. Die Daten eines einzelnen Elements werden erfasst
4. Zur Laufzeit werden die extrahierten Daten als einzelnes Objekt zurueckgegeben

## Parallele Lanes

Fuer fortgeschrittene Automatisierungen unterstuetzen Makros **parallele Lanes**, um mehrere Schrittfolgen gleichzeitig in **separaten Browser-Tabs** auszufuehren.

- Klicken Sie auf **Lane** (Aufnahmeansicht) oder **Lane hinzufuegen** (Bearbeitungsansicht), um eine neue Lane zu erstellen
- **Wechseln Sie zwischen Lanes** durch Klick auf die Lane-Tabs
- **Benennen Sie Lanes um** durch Doppelklick auf den Tab-Namen
- **Entfernen Sie Lanes** mit dem X-Button am Tab
- Jede Lane wird unabhaengig ausgefuehrt -- ideal fuer gleichzeitige Suche auf mehreren Websites oder Vergleich von Daten ueber verschiedene Seiten

## Export und Import

Makros und Server koennen als **JSON exportiert und importiert** werden:

### Export

- **Server exportieren** (mit allen Tools) ueber das Download-Symbol neben dem Servernamen
- **Einzelnes Tool exportieren** ueber das Download-Symbol in der Tool-Zeile oder aus der Bearbeitungsansicht

### Import

- **Server importieren** mit dem Button "JSON importieren" am Ende der Liste
- **Tool in einen bestimmten Server importieren** ueber das Upload-Symbol neben dem Servernamen

So lassen sich Automatisierungen einfach im Team teilen oder als Backup sichern.

## Makros Agenten zuweisen

Ein Makro wird erst nuetzlich, wenn es einem Agenten zugewiesen wird:

1. Oeffnen Sie das **Agenten-Bearbeitungspanel**
2. Gehen Sie zum Bereich **Makros**
3. Waehlen Sie die Makros aus, die der Agent nutzen darf

Im Chat sieht das LLM jedes zugewiesene Makro als aufrufbares Tool. Wenn das Modell ein Makro aufruft, **fuehrt die Chrome-Erweiterung die aufgezeichneten Schritte** im Browser aus und gibt die Ergebnisse an das Gespraech zurueck. Der Agent kann die extrahierten Daten dann fuer seine Antwort verwenden.
