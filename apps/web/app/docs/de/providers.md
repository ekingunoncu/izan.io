# Anbieter

izan.io unterstuetzt ueber **17 LLM-Anbieter** und bietet damit eine der umfangreichsten Integrationen fuer KI-Modelle in einer einzigen Plattform. Sie koennen zwischen Anbietern und Modellen frei wechseln, ohne die Oberflaeche zu verlassen.

## Unterstuetzte Anbieter

- **OpenAI** -- GPT-4o, GPT-5, o1, o3, o4 und weitere
- **Anthropic** -- Claude Opus, Sonnet, Haiku
- **Google** -- Gemini Pro, Flash, Ultra
- **Groq** -- schnelle Inferenz mit Open-Source-Modellen
- **Cerebras** -- extrem schnelle Inferenz
- **Cohere** -- Command R und Command R+
- **Together AI** -- Open-Source-Modelle in der Cloud
- **DeepSeek** -- DeepSeek V3, R1 und weitere
- **Mistral** -- Mistral Large, Medium, Small
- **xAI** -- Grok-Modelle
- **Fireworks** -- optimierte Open-Source-Modelle
- **Ollama** -- lokale Ausfuehrung auf Ihrem eigenen Rechner
- Und weitere Anbieter, die laufend ergaenzt werden

## Kostenlose Optionen

Sie muessen nicht bezahlen, um izan.io zu nutzen. Mehrere Anbieter bieten grosszuegige kostenlose Kontingente:

- **Google AI Studio** -- bis zu 250 Anfragen pro Tag ohne Kosten
- **Groq** -- kostenloses Kontingent fuer schnelle Inferenz
- **Cerebras** -- bis zu 1 Million Tokens pro Tag kostenlos
- **Ollama** -- vollstaendig kostenlos, da die Modelle lokal auf Ihrer Hardware laufen

## Einrichtung

1. Oeffnen Sie die **Einstellungen** ueber das Zahnrad-Symbol.
2. Suchen Sie den gewuenschten **Anbieter** in der Liste.
3. Geben Sie Ihren **API-Schluessel** ein (wird nur lokal gespeichert).
4. Waehlen Sie ein **Modell** aus der Modellliste des Anbieters.

## Modellfaehigkeiten

Nicht alle Modelle bieten dieselben Funktionen. izan.io kennzeichnet die Faehigkeiten jedes Modells:

- **Tool-Unterstuetzung** -- das Modell kann MCP-Tools und Makros aufrufen
- **Vision-Unterstuetzung** -- das Modell kann Bilder analysieren
- **Reasoning** -- das Modell verfuegt ueber erweiterte Denkfaehigkeiten (z. B. Chain-of-Thought)

## Flexibler Einsatz

Jedes Modell kann mit **jedem Agenten** kombiniert werden. Sie koennen beispielsweise den Domain-Experten mit einem guenstigen Modell fuer einfache Abfragen nutzen und fuer anspruchsvolle Aufgaben auf ein leistungsfaehigeres Modell wechseln -- alles innerhalb derselben Oberflaeche.

## Ersatzmodell (Fallback)

Sie koennen ein **Ersatzmodell** konfigurieren, das automatisch uebernimmt, wenn der primaere Anbieter mit einem voruebergehenden Fehler ausfaellt (Rate-Limit, Serverfehler oder Netzwerkproblem).

### Einrichtung

1. Oeffnen Sie die **Einstellungen**
2. Finden Sie die Karte **Ersatzmodell** (unterhalb der API-Schluessel)
3. Waehlen Sie einen **Ersatz-Provider** aus der Dropdown-Liste (nur Anbieter mit gespeichertem API-Schluessel werden angezeigt)
4. Waehlen Sie ein **Ersatzmodell** dieses Anbieters

### Funktionsweise

- Wenn das primaere Modell einen **429** (Rate-Limit), **500+** (Serverfehler) oder einen **Netzwerkfehler** zurueckgibt, wiederholt izan.io die Anfrage automatisch mit dem Ersatzmodell
- Im Chat wird ein Hinweis angezeigt: "Primaeres Modell fehlgeschlagen. Erneuter Versuch mit Provider / Modell..."
- **Authentifizierungsfehler** (401, 403) loesen kein Fallback aus -- diese deuten auf ein Schluesselproblem hin
- Wenn auch das Ersatzmodell fehlschlaegt, wird der Fehler wie gewohnt angezeigt (kein weiterer Versuch)
- Wenn Ersatz-Provider und -Modell mit dem primaeren identisch sind, ist das Fallback deaktiviert

### Tipps

- Waehlen Sie ein Fallback von einem **anderen Anbieter** fuer maximale Ausfallsicherheit (z. B. primaer OpenAI, Fallback Anthropic)
- Kostenlose Anbieter wie **Groq** oder **Cerebras** eignen sich hervorragend als Fallback
- Das Ersatzmodell muss keine Tool-Unterstuetzung haben -- ohne Tools wird das Gespraech als reiner Chat fortgesetzt
