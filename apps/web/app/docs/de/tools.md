# Tools

Ein Tool ist eine kurze JavaScript-Funktion. Es nimmt `params` und ein `browser`-Objekt, macht etwas auf einer Webseite und gibt Daten zurueck.

```javascript
async (params, browser) => {
  await browser.open('https://example.com')
  const title = await browser.evaluate('document.title')
  return { title }
}
```

Das war's. Keine Frameworks, keine Abhaengigkeiten, kein Build-Schritt.

## Echte Beispiele

### Preis eines Produkts abrufen

```javascript
async (params, browser) => {
  await browser.open(params.url)
  await browser.waitForSelector('.price')
  return { price: await browser.getText('.price') }
}
```

### Google durchsuchen und Ergebnisse zurueckgeben

```javascript
async (params, browser) => {
  await browser.open(`https://www.google.com/search?q=${params.query}`)
  await browser.waitForSelector('h3')

  return await browser.evaluate(`
    [...document.querySelectorAll('h3')].slice(0, 5).map(el => ({
      title: el.textContent,
      url: el.closest('a')?.href
    }))
  `)
}
```

### GitHub-Benachrichtigungen lesen

```javascript
async (params, browser) => {
  // Sie sind bereits eingeloggt - die Erweiterung nutzt Ihre echte Browser-Sitzung
  await browser.open('https://github.com/notifications')
  await browser.waitForSelector('.notification')

  return await browser.evaluate(`
    [...document.querySelectorAll('.notification')].map(el => ({
      title: el.querySelector('.title')?.textContent?.trim(),
      repo: el.querySelector('.repo')?.textContent?.trim()
    }))
  `)
}
```

### Formular ausfuellen und absenden

```javascript
async (params, browser) => {
  await browser.open('https://example.com/login')
  await browser.type('input[name="email"]', params.email)
  await browser.type('input[name="password"]', params.password)
  await browser.click('button[type="submit"]')
  await browser.waitForUrl('/dashboard')
  return { success: true }
}
```

## Browser API

Alle Methoden sind async. Verwenden Sie `await`.

### Navigation

| Methode | Was sie macht |
|---------|--------------|
| `browser.open(url)` | URL in neuem Tab oeffnen |
| `browser.navigate(url)` | Aktuellen Tab navigieren |
| `browser.close()` | Tab schliessen |
| `browser.getUrl()` | Aktuelle URL abrufen |
| `browser.attachActiveTab()` | Offenen Tab des Nutzers verwenden |

### Interaktion

| Methode | Was sie macht |
|---------|--------------|
| `browser.click(selector)` | Element anklicken |
| `browser.type(selector, text)` | In Eingabefeld tippen (loescht zuerst) |
| `browser.select(selector, value)` | Dropdown-Option waehlen |
| `browser.scroll()` | 500px nach unten scrollen |

### Lesen

| Methode | Was sie macht |
|---------|--------------|
| `browser.getText(selector)` | Textinhalt abrufen |
| `browser.getAttribute(selector, attr)` | Attribut abrufen |
| `browser.getValue(selector)` | Eingabewert abrufen |
| `browser.exists(selector)` | Pruefen ob Element existiert |

### Warten

| Methode | Was sie macht |
|---------|--------------|
| `browser.waitForSelector(sel)` | Auf Element warten |
| `browser.waitForUrl(pattern)` | Auf URL-Muster warten |
| `browser.waitForLoad()` | Auf Seitenladen warten |
| `browser.wait(ms)` | N Millisekunden warten |

### Erweitert

| Methode | Was sie macht |
|---------|--------------|
| `browser.evaluate(js)` | JS im Seitenkontext ausfuehren |
| `browser.snapshot()` | Accessibility-Baum als Text |

`browser.evaluate()` ist die maechtigste Methode. Sie fuehrt JavaScript direkt auf der Seite aus - voller DOM-Zugriff, fetch, localStorage, Cookies, alles.

## Parameter

```json
[
  { "name": "url", "type": "string", "required": true },
  { "name": "max_results", "type": "number", "required": false }
]
```

Die KI uebergibt diese beim Tool-Aufruf. Im Code greifen Sie mit `params.url`, `params.max_results` darauf zu.
