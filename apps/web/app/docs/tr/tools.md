# Araçlar

Bir araç kısa bir JavaScript fonksiyonudur. `params` ve `browser` objesi alır, web sayfasında bir şey yapar ve veri döner.

```javascript
async (params, browser) => {
  await browser.open('https://example.com')
  const title = await browser.evaluate('document.title')
  return { title }
}
```

Bu kadar. Framework yok, bağımlılık yok, derleme adımı yok.

## Gerçek Örnekler

### Bir ürünün fiyatını al

```javascript
async (params, browser) => {
  await browser.open(params.url)
  await browser.waitForSelector('.price')
  return { price: await browser.getText('.price') }
}
```

### Google'da ara ve sonuçları döndür

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

### GitHub bildirimlerini oku

```javascript
async (params, browser) => {
  // Zaten giriş yapmış durumdasınız - uzantı gerçek tarayıcı oturumunuzu kullanır
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

### Form doldur ve gönder

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

Tüm metodlar async. `await` ile çağırın.

### Navigasyon

| Metod | Ne yapar |
|-------|----------|
| `browser.open(url)` | Yeni sekmede URL aç |
| `browser.navigate(url)` | Mevcut sekmede gezin |
| `browser.close()` | Sekmeyi kapat |
| `browser.getUrl()` | Geçerli URL'yi al |
| `browser.attachActiveTab()` | Kullanıcının açık sekmesini kullan |

### Etkileşim

| Metod | Ne yapar |
|-------|----------|
| `browser.click(selector)` | Elemente tıkla |
| `browser.type(selector, text)` | Input'a yaz (önce temizler) |
| `browser.select(selector, value)` | Dropdown'dan seç |
| `browser.scroll()` | 500px aşağı kaydır |

### Okuma

| Metod | Ne yapar |
|-------|----------|
| `browser.getText(selector)` | Metin içeriğini al |
| `browser.getAttribute(selector, attr)` | Nitelik değerini al |
| `browser.getValue(selector)` | Input değerini al |
| `browser.exists(selector)` | Element var mı kontrol et |

### Bekleme

| Metod | Ne yapar |
|-------|----------|
| `browser.waitForSelector(sel)` | Elementin görünmesini bekle |
| `browser.waitForUrl(pattern)` | URL'nin eşleşmesini bekle |
| `browser.waitForLoad()` | Sayfa yüklemesini bekle |
| `browser.wait(ms)` | N milisaniye bekle |

### Gelişmiş

| Metod | Ne yapar |
|-------|----------|
| `browser.evaluate(js)` | Sayfa bağlamında JS çalıştır |
| `browser.snapshot()` | Erişilebilirlik ağacını metin olarak al |

`browser.evaluate()` en güçlü metoddur. JavaScript'i doğrudan sayfada çalıştırır - tam DOM erişimi, fetch, localStorage, çerezler, her şey.

## Parametreler

```json
[
  { "name": "url", "type": "string", "required": true },
  { "name": "max_results", "type": "number", "required": false }
]
```

AI aracı çağırırken bunları gönderir. Kodunuzda `params.url`, `params.max_results` şeklinde erişin.
