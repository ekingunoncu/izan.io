<p align="center">
  <img src="thumbnail.png" alt="izan.io" width="280" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-AGPL--3.0-blue.svg" alt="AGPL-3.0" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/MCP-Protocol-green" alt="MCP" />
</p>

<h1 align="center">izan.io</h1>
<p align="center">
  <strong>Yerel AI Asistan - Open Source, Şeffaf, Özgür</strong>
</p>
<p align="center">
  <em>Bilgelik • Anlayış • Akıl</em>
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.de.md">Deutsch</a>
</p>
<p align="center">
  <a href="https://izan.io">🌐 Canlı deneyin → izan.io</a>
</p>

<br />

<p align="center">
  <img src="https://izan-media.s3.eu-west-1.amazonaws.com/izan-demo.gif?v=2" alt="izan.io demo" width="720" />
</p>

---

## ⚡ Ne bu?

**izan.io**, tüm AI modellerini tek platformda toplayan, gizliliğinizi ön planda tutan açık kaynak bir AI asistan platformudur. Kendi API anahtarlarınızla kendi verilerinizle çalışın.

> 🚨 **Copyleft:** Bu proje [AGPL-3.0](./LICENSE) altındadır. Fork/ değiştirir/ türev oluşturursanız **kodunuzu da açık kaynak yapmak zorundasınız**. Ağ üzerinden sunulan türevler kaynak kodu sağlamalıdır. Detay: [LICENSE](./LICENSE)

---

## ✨ Öne Çıkanlar

| Özellik | Açıklama |
|--------|----------|
| 🔐 **Gizlilik** | API anahtarları yalnızca tarayıcınızda. Sunucularımıza gönderilmez. |
| 🧠 **Çoklu Sağlayıcı** | 17+ AI sağlayıcı desteklenir (aşağıda). |
| 🤖 **Akıllı Ajanlar** | MCP ile bağlı ajanlar - web araması, kod, vb. |
| 🔗 **Çoklu Agent Orkestrasyonu** | Agentları birbirine bağlayın - birinin çıktısı diğerinin girdisi olur. 3 seviye derinliğe kadar. |
| 🌐 **MCP** | Hazır ve özel MCP sunucuları. |
| 🎬 **Aksiyon Kaydedici** | Tarayıcı aksiyonları kaydedin, CSS veya erişilebilirlik ağacı ile veri çıkarın ve MCP aracı olarak kaydedin; kod gerekmez ([docs/visual-mcp-tool-builder.md](docs/visual-mcp-tool-builder.md)). |
| ⏱️ **Uzun Süreli Görevler** | Agentlar karmaşık araştırma ve çok adımlı iş akışlarında arka planda çalışır. Sonuçlar hazır olduğunda bildirim alın. |
| 📅 **Zamanlanmış Otomasyonlar** | Agent görevlerini zamanlayıcıyla çalıştırın - fiyat takibi, veri toplama ve tekrarlayan iş akışları otomatik pilotta. |

---

## 🔌 Desteklenen Sağlayıcılar

**OpenAI** · **Google** (Gemini) · **Groq** · **Mistral** · **xAI** (Grok) · **DeepSeek** · **Qwen** (DashScope) · **Together AI** · **Fireworks AI** · **Perplexity** · **Cerebras** · **Deep Infra** · **Cohere** · **Moonshot AI** (Kimi) · **MiniMax** · **OpenRouter** (yüzlerce model) · **Ollama** (yerel) · **Custom** (OpenAI uyumlu uç noktalar)

---

## 🏗️ Mimari

```
izan.io/
├── apps/web/                    # React + Vite web uygulaması
├── packages/
│   ├── agent-core/             # Ajan yönlendirme, araç çalıştırma, LLM-bağımsız
│   ├── mcp-client/              # MCP protokol istemcisi
│   ├── mcp-browser-servers/     # Tarayıcı MCP sunucuları (TabServerTransport)
│   │   ├── crypto-analysis/     # CoinGecko, teknik göstergeler
│   │   ├── domain-check/       # RDAP + DoH domain uygunluğu
│   │   └── general/            # get_time, random_number, uuid, calculate, generate_password
│   ├── mcp-extension-servers/   # Chrome extension: yan panel kayıt, dinamik MCP, CDP otomasyon
│   └── infra/                   # CDK altyapı (S3/CloudFront, /mcp-tools/ dahil)
```

**Aksiyon kaydedici:** Extension (`mcp-extension-servers`) yan panelde tıklama, yazma, scroll kaydı; URL/path parametreleme; CSS veya erişilebilirlik ağacı (ARIA rolleri, tam sayfa snapshot) ile veri çıkarma sunar. Element seçici aktif kayıt olmadan da çalışır. Kayıtlar MCP aracı tanımına dönüşür (JSON olarak IndexedDB veya S3'te). Ajanlara her zaman hazır `accessibility_snapshot` aracı sunulur. Bkz. [docs/visual-mcp-tool-builder.md](docs/visual-mcp-tool-builder.md).

---

## 🚀 Hızlı Başlangıç

**Gereksinimler:** Node.js 18+, npm 10+

```bash
git clone https://github.com/ekingunoncu/izan.io.git
cd izan.io
npm install
npm run dev
```

`http://localhost:5173` adresini açın. Ayarlardan sağlayıcı ve API anahtarı ekleyip sohbet etmeye başlayın.

`apps/web/.env.example` dosyasına bakın. API anahtarları tarayıcıda saklanır.

---

## 📦 MCP Sunucuları

| Tür | Paket | Açıklama |
|-----|-------|----------|
| **Tarayıcı** | `mcp-browser-servers/` | crypto-analysis, domain-check (RDAP/DoH), general. TabServerTransport, istemci tarafı. |
| **Extension** | `mcp-extension-servers/` | Chrome extension: yan panel (React + shadcn), aksiyon kayıt, element seçici (CSS + erişilebilirlik), dinamik MCP sunucusu, dahili `accessibility_snapshot` aracı. Kullanıcı araçları JSON olarak saklanır. |

**MCP kaydı:** Extension'ı kurun, yan paneli açın, **Kaydet**'e tıklayın; aksiyon kaydedici tıklama, yazma, scroll ve URL parametrelerini yakalar. **Liste** / **Tekil** ile CSS, veya **A11y** ile ARIA rolleri ya da tam sayfa erişilebilirlik ağacı kullanarak veri çıkarın. **Tamamla** akışı web uygulamasına gönderir; Ayarlar'dan MCP aracı olarak kaydedin.

---

## 🌐 Deploy

`npm run deploy:infra` veya GitHub Actions (main'e push) ile deploy. Stack S3 + CloudFront kullanır.

**Özel domain (izan.io, www.izan.io):** Bu domainler için **us-east-1**'de ACM sertifikası alıp `IZAN_DOMAIN_CERTIFICATE_ARN` ile verin. DNS (A/CNAME) elle yönetilir.

---

## 🛠️ Teknoloji

React 19 · React Router 7 · Vite 7 · Tailwind CSS 4 · Zustand · IndexedDB (Dexie) · react-i18next · npm workspaces + Turbo

---

## 🤝 Katkı

PR'lar memnuniyetle karşılanır. Detaylar: [CONTRIBUTING.md](./CONTRIBUTING.md)

1. Fork → branch → commit → push → PR
2. Katkılar AGPL-3.0 ile uyumlu olacaktır.

---

## 📜 Lisans

**GNU Affero General Public License v3.0 (AGPL-3.0)**

- ✅ Kullan, değiştir, dağıt
- ⚠️ Türevler AGPL-3.0 altında olmalı
- ⚠️ Ağ üzerinden sunulan türevler kaynak sağlamalı

Detay: [LICENSE](./LICENSE)

---

<p align="center">
  <strong>izan.io</strong> - Wisdom • Understanding • Intellect
</p>
<p align="center">
  <sub>Fork et, geliştir, paylaş.</sub>
</p>
