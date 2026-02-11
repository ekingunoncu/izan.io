# Makros (Browser-Automatisierung)

Makros sind **aufgezeichnete Browser-Automatisierungen**, die als MCP-Tools registriert und von Agenten ausgefuehrt werden koennen. Damit lassen sich wiederkehrende Aufgaben im Browser automatisieren -- von Webrecherche ueber Formularausfuellung bis hin zur Datenextraktion.

## Makros aufzeichnen

Die Aufzeichnung erfolgt ueber die **Chrome-Erweiterung**:

1. Oeffnen Sie das **Seitenpanel** der Erweiterung ueber das Erweiterungssymbol.
2. Klicken Sie auf **Aufnehmen**.
3. Interagieren Sie mit der gewuenschten Website -- Klicks, Texteingaben, Navigation und Scrollvorgaenge werden automatisch erfasst.
4. Klicken Sie auf **Stopp**, um die Aufnahme zu beenden.
5. Vergeben Sie einen **Namen** und eine **Beschreibung** fuer das Makro.

## Makros bearbeiten

Nach der Aufzeichnung koennen Makros verfeinert werden:

- **Schritte aendern** -- einzelne Aktionen bearbeiten, verschieben oder entfernen
- **Parameter hinzufuegen** -- dynamische Eingabewerte definieren, die der Agent beim Aufruf uebergeben kann (z. B. ein Suchbegriff)
- **Extraktion konfigurieren** -- festlegen, welche Daten aus der Seite zurueckgegeben werden sollen (Texte, Attribute, Tabellendaten)

## Parallele Lanes

Fuer fortgeschrittene Automatisierungen unterstuetzen Makros **parallele Lanes**. Damit koennen mehrere Aktionsstraenge gleichzeitig in separaten Tabs ausgefuehrt werden. Das ist besonders nuetzlich, wenn Daten aus mehreren Quellen parallel abgerufen werden sollen.

## Export und Import

Makros werden als **JSON-Dateien** gespeichert und koennen exportiert und importiert werden. So lassen sich Automatisierungen einfach mit anderen teilen oder zwischen verschiedenen Browsern uebertragen.

## Makros Agenten zuweisen

Ein Makro wird erst nuetzlich, wenn es einem Agenten zugewiesen wird. Die Zuweisung erfolgt in den **Agenten-Einstellungen** im Bereich Makros. Ein Makro kann mehreren Agenten zugewiesen werden.

## Wie Agenten Makros nutzen

Der Ablauf ist vollstaendig automatisiert:

1. Der Benutzer stellt eine Frage im Chat.
2. Das **LLM erkennt**, dass ein Makro als Tool verfuegbar und geeignet ist.
3. Das Modell ruft das Makro als **MCP-Tool** auf und uebergibt die erforderlichen Parameter.
4. Die **Chrome-Erweiterung fuehrt die Schritte** im Browser aus -- oeffnet Tabs, klickt, gibt Text ein und extrahiert Daten.
5. Das **Ergebnis** wird an das LLM zurueckgegeben, das die Antwort formuliert.

Der Agent entscheidet selbststaendig, wann ein Makro eingesetzt wird -- der Benutzer muss es nicht manuell ausloesen.
