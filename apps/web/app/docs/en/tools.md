# Tools

A tool is a short JavaScript function. It takes `params` and a `browser` object, does something on a web page, and returns data.

```javascript
async (params, browser) => {
  await browser.open('https://example.com')
  const title = await browser.evaluate('document.title')
  return { title }
}
```

That's it. No frameworks, no dependencies, no build step.

## Real Examples

### Get the price of a product

```javascript
async (params, browser) => {
  await browser.open(params.url)
  await browser.waitForSelector('.price')
  return { price: await browser.getText('.price') }
}
```

### Search Google and return results

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

### Read your GitHub notifications

```javascript
async (params, browser) => {
  // You're already logged in - the extension uses your real browser session
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

### Fill a form and submit

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

All methods are async. Call them with `await`.

### Navigate

| Method | What it does |
|--------|-------------|
| `browser.open(url)` | Open URL in a new tab |
| `browser.navigate(url)` | Navigate current tab |
| `browser.close()` | Close the tab |
| `browser.getUrl()` | Get current URL |
| `browser.attachActiveTab()` | Use the tab the user has open |

### Interact

| Method | What it does |
|--------|-------------|
| `browser.click(selector)` | Click an element |
| `browser.type(selector, text)` | Type into an input (clears first) |
| `browser.select(selector, value)` | Pick a dropdown option |
| `browser.scroll()` | Scroll down 500px |
| `browser.scroll({ direction, amount })` | Scroll with options |

### Read

| Method | What it does |
|--------|-------------|
| `browser.getText(selector)` | Get text content |
| `browser.getHtml(selector)` | Get inner HTML |
| `browser.getAttribute(selector, attr)` | Get an attribute |
| `browser.getValue(selector)` | Get input value |
| `browser.exists(selector)` | Check if element exists |

### Wait

| Method | What it does |
|--------|-------------|
| `browser.waitForSelector(sel)` | Wait for element to appear |
| `browser.waitForUrl(pattern)` | Wait for URL to match |
| `browser.waitForLoad()` | Wait for page load |
| `browser.wait(ms)` | Wait N milliseconds |

### Advanced

| Method | What it does |
|--------|-------------|
| `browser.evaluate(js)` | Run JS in the page context |
| `browser.snapshot()` | Get accessibility tree as text |

`browser.evaluate()` is the most powerful method. It runs JavaScript directly in the page - full DOM access, fetch, localStorage, cookies, everything.

## Parameters

Tools can define typed parameters:

```json
[
  { "name": "url", "type": "string", "required": true },
  { "name": "max_results", "type": "number", "required": false }
]
```

The AI passes these when calling the tool. Inside your code, access them as `params.url`, `params.max_results`.
