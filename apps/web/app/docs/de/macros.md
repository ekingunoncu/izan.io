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
- **Selektor** -- klicken Sie auf **Selector**, um das CSS-Selektor-Extraktions-Panel zu oeffnen (siehe [Extraktionsmethoden](#extraktionsmethoden) unten)
- **A11y** -- klicken Sie auf **A11y**, um das Accessibility-Extraktions-Panel zu oeffnen; dort koennen Sie Daten per ARIA-Rolle extrahieren oder einen vollstaendigen Accessibility-Snapshot der Seite abrufen
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

Extraktion ermoeglicht es Makros, **strukturierte Daten** aus Webseiten zu extrahieren. Es gibt mehrere Wege, Extraktionsschritte zu erstellen:

### Element-Picker (Liste & Einzel)

Der Element-Picker verwendet ein visuelles Overlay auf der Seite zur Elementauswahl.

**Listenmodus:**

1. Klicken Sie waehrend der Aufnahme auf **Liste**
2. Fahren Sie ueber ein sich wiederholendes Element (z. B. ein Suchergebnis) -- es wird gelb hervorgehoben
3. Klicken Sie zur Auswahl -- alle aehnlichen Elemente werden erkannt und hervorgehoben
4. Der Extraktionsschritt erfasst die Elementanzahl und Felddefinitionen
5. Zur Laufzeit werden die Daten aller uebereinstimmenden Elemente als strukturierte Liste zurueckgegeben

**Einzelmodus:**

1. Klicken Sie waehrend der Aufnahme auf **Einzel**
2. Fahren Sie ueber das Zielelement und klicken Sie
3. Felder werden **automatisch erkannt** (Text, Links, Bilder, Eingabefelder) -- wie im Listenmodus
4. Optional koennen Sie auf weitere Unterelemente klicken, um zusaetzliche Felder hinzuzufuegen
5. Klicken Sie auf **Fertig** -- der Extraktionsschritt wird sofort erstellt
6. Zur Laufzeit werden die extrahierten Daten als einzelnes Objekt zurueckgegeben

### Extraktionsmethoden

Die Werkzeugleiste bietet zwei separate Buttons fuer die Extraktion:

#### CSS-Selektor (Selector-Button)

Klicken Sie auf **Selector**, um das CSS-Extraktions-Panel zu oeffnen. Geben Sie manuell einen CSS-Selektor ein (z. B. `.post-item`, `table tbody tr`). Waehlen Sie **Liste** oder **Einzel**, dann klicken Sie auf **Extract**.

- **Liste** -- alle uebereinstimmenden Elemente werden als Items behandelt; Felder werden vom ersten Item automatisch erkannt
- **Einzel** -- das erste uebereinstimmende Element wird verwendet; Felder werden davon automatisch erkannt
- Tipp: Rechtsklick auf ein Element in DevTools → Kopieren → Selektor kopieren

#### Accessibility (A11y-Button)

Klicken Sie auf **A11y**, um das Accessibility-Extraktions-Panel zu oeffnen. Dieser Ansatz extrahiert Elemente anhand ihrer **ARIA-Rolle** statt CSS-Selektoren -- resistenter gegen Styling-Aenderungen, durchdringt Shadow-DOM-Grenzen und ist nicht von Klassennamen abhaengig.

1. Waehlen Sie eine oder mehrere **Rollen** aus dem Dropdown (z. B. `link`, `button`, `heading`, `article`, `listitem`, `row`)
2. Geben Sie optional einen **barrierefreien Namen** ein, um Ergebnisse zu filtern -- der Platzhalter zeigt Beispiele fuer die gewaehlte Rolle (z. B. fuer `link`: "Sign In", "Read more")
3. Stellen Sie **Include children** ein:
   - **AN** (Standard) -- jedes gefundene Element wird als Container behandelt und sein Unterinhalt (Links, Text, Bilder) wird als separate Felder automatisch erkannt. Verwenden Sie dies fuer reichhaltige Elemente wie `article`, `listitem` oder `row` mit verschachteltem Inhalt.
   - **AUS** -- nur direkte Eigenschaften der gefundenen Elemente werden extrahiert (Textinhalt, `href` fuer Links, `src`/`alt` fuer Bilder, `value` fuer Eingabefelder). Verwenden Sie dies fuer einfache Elemente wie `link`, `button` oder `heading`.
4. Klicken Sie auf **Extract**

Die Accessibility-Methode erzeugt immer eine Liste aller uebereinstimmenden Elemente. Zur Laufzeit verwenden mit der A11y-Methode erstellte Extraktionsschritte den **echten Accessibility-Baum** ueber das Chrome DevTools Protocol -- zuverlaessig auch auf Websites mit dynamischen Klassennamen oder verschleiertem Markup.

#### Nachbarn (Neighbors)

Der **Nachbarn**-Tab extrahiert Kontext um ein bestimmtes Element im Accessibility-Baum. Geben Sie einen **Zielnamen** ein (z. B. "Price"), filtern Sie optional nach **Rolle**, legen Sie die Anzahl der **Geschwister** fest (1--20, Standard 3) und waehlen Sie eine **Richtung** (beide/oben/unten). Der Zielknoten wird in der Ausgabe mit `← TARGET` markiert.

Nuetzlich, wenn die rollenbasierte Extraktion zu flach ist und Sie die umgebende Struktur benoetigen -- z. B. eine "Price"-Ueberschrift finden und die 3 Geschwister darunter sehen.

#### Accessibility-Snapshot

Das A11y-Panel enthaelt ausserdem einen **Snapshot**-Bereich. Klicken Sie auf **Snapshot**, um den **vollstaendigen Accessibility-Baum** der aktuellen Seite abzurufen. Dies liefert eine kompakte Textdarstellung der Seitenstruktur mit Rollen, Namen und Eigenschaften -- nuetzlich, um die Seitenstruktur zu verstehen, bevor Sie entscheiden, welche Rollen extrahiert werden sollen.

Der Snapshot ist auch als eingebautes MCP-Tool namens `accessibility_snapshot` verfuegbar (siehe [Makros Agenten zuweisen](#makros-agenten-zuweisen)).

### Automatische Tabellenerkennung

Wenn der Element-Picker ein `<table>`-Element erkennt, wird jede Spalte automatisch einem Feld zugeordnet, wobei die Tabellenueberschriften als Schluessel verwendet werden. So erhalten Sie strukturierte Daten zeilenweise, ohne Felder manuell definieren zu muessen.

### Extraktionsfelder bearbeiten

Nach der Erstellung eines Extraktionsschritts koennen Sie **einzelne Felder** durch Klick auf "Edit fields" auf der Schrittkarte bearbeiten. Jede Feldkarte zeigt:

- **Schluessel** -- der Eigenschaftsname im Ausgabeobjekt
- **Typ**-Dropdown -- waehlen Sie aus `text`, `html`, `attribute`, `value`, `regex`, `nested` oder `nested_list`
- **Transform**-Dropdown -- wenden Sie `trim`, `lowercase`, `uppercase` oder `number` als Nachverarbeitung an
- **Selektor** -- der CSS-Selektor zum Auffinden des Elements (als Monospace-Label angezeigt)

Je nach ausgewaehltem Typ erscheinen zusaetzliche Eingabefelder:

- **attribute** -- Dropdown fuer den HTML-Attributnamen (z. B. `href`, `src`), befuellt aus dem tatsaechlichen Element
- **regex** -- Eingabe fuer das Regex-Muster sowie ein optionaler Standardwert
- **nested / nested_list** -- Anzahl der Unterfelder wird angezeigt; Unterfelder ueber JSON-Export/Import bearbeiten

Mit dem Button "+ Feld hinzufuegen" koennen Sie **neue Felder hinzufuegen** oder mit dem x-Button auf jeder Karte **Felder entfernen**. Aenderungen werden sofort auf die Schrittdaten angewendet und beim Speichern oder Exportieren des Makros uebernommen.

### Datenvorschau

Wenn ein Extraktionsschritt erstellt wird, wird eine **Vorschau** der extrahierten Daten von der Live-Seite erfasst und direkt auf der Schrittkarte angezeigt -- kein Aufklappen noetig. Die Vorschau aktualisiert sich live, wenn Sie Felder bearbeiten.

- Im **Listenmodus** zeigt die Vorschau die ersten Eintraege mit ihren Schluessel-Wert-Paaren
- Im **Einzelmodus** zeigt die Vorschau die Schluessel-Wert-Paare des extrahierten Objekts
- Werte werden zur besseren Lesbarkeit gekuerzt; verschachtelte Objekte und Arrays zeigen ihre Groesse an
- Klicken Sie auf die Vorschau-Ueberschrift, um sie ein-/auszuklappen

Die Vorschau hilft Ihnen zu ueberpruefen, ob die richtigen Daten extrahiert werden, bevor Sie das Makro speichern.

### Standardwerte

Felder koennen einen **Standardwert** haben, der zurueckgegeben wird, wenn der Selektor kein Element findet oder die Extraktion ein leeres Ergebnis liefert. Standardwerte koennen ueber den Feldeditor oder JSON-Export gesetzt werden.

### Transform-Pipeline

Jedes Feld unterstuetzt eine optionale **Transformation**, die nach der Extraktion angewendet wird:

- **trim** -- fuehrende/nachfolgende Leerzeichen entfernen
- **lowercase** -- in Kleinbuchstaben umwandeln
- **uppercase** -- in Grossbuchstaben umwandeln
- **number** -- Text als Zahl parsen

### Limits

| Limit | Wert | Geltungsbereich |
|-------|------|-----------------|
| AX-Baumzeilen | 2.000 | pro Extraktion |
| Rollen-Elemente | 100 | pro Extraktion |
| Zeichenkettenwerte | 500 Zeichen | pro Extraktion |
| Tabellenzellen | 200 Zeichen | pro Extraktion |
| Tabellenzeilen | 200 | pro Extraktion |
| Gesamtantwort | 50.000 Zeichen | gesamte Tool-Antwort |

Pro-Extraktion-Limits gelten **pro Lane** -- 4 parallele Lanes mit jeweils einem Snapshot ergeben bis zu 4 × 2.000 AX-Baumzeilen. Das Gesamtantwort-Limit wird zuletzt auf die kombinierte Ausgabe aller Lanes angewendet. Wenn Daten abgeschnitten werden, grenzen Sie den Bereich mit spezifischeren Selektoren oder Rollennamenfiltern ein.

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

### Eingebautes Accessibility-Snapshot-Tool

Zusaetzlich zu benutzerdefinierten Makros hat jeder Agent mit aktivierten Makros automatisch Zugriff auf das `accessibility_snapshot`-Tool. Dieses eingebaute Tool gibt den **vollstaendigen Accessibility-Baum** der aktuellen Automatisierungs-Browserseite als kompakten Text zurueck -- Rollen, Namen und Eigenschaften in Baumstruktur. Agenten koennen es nutzen, um die Seitenstruktur zu verstehen, Navigationsergebnisse zu ueberpruefen oder zu entscheiden, mit welchen Elementen als Naechstes interagiert werden soll.
