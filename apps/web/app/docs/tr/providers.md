# Saglayicilar

izan.io, **17'den fazla LLM saglayicisini** tek bir arayuzde birlestirerek farkli modelleri kolayca denemenizi ve karsilastirmanizi saglar. Herhangi bir modeli herhangi bir agentle kullanabilirsiniz.

## Desteklenen Saglayicilar

### Buyuk Saglayicilar

- **OpenAI** -- GPT-4o, GPT-4 Turbo, o1, o3, o4-mini ve daha fazlasi
- **Anthropic** -- Claude 4 Opus, Claude 4 Sonnet, Claude 3.5 Haiku
- **Google** -- Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0
- **xAI** -- Grok modelleri
- **DeepSeek** -- DeepSeek-V3, DeepSeek-R1

### Hizli ve Ucretsiz Saglayicilar

- **Groq** -- Cok dusuk gecikme suresiyle hizli cikti
- **Cerebras** -- Gunde 1 milyon token ucretsiz kullanim
- **Google AI Studio** -- Gunde 250 istek ucretsiz

### Diger Saglayicilar

- **Cohere** -- Command R+ ve diger modeller
- **Together AI** -- Acik kaynakli modellere erisim
- **Mistral** -- Mistral Large, Mistral Medium ve diger modeller
- **Fireworks** -- Hizli acik kaynakli model sunumu
- **Ollama** -- Kendi bilgisayarinizda calisan **tamamen ucretsiz** yerel modeller

## Ucretsiz Secenekler

Hic para odemeden baslamak icin su secenekleri degerlendirebilirsiniz:

- **Google AI Studio**: Gunde 250 istek ile Gemini modellerini ucretsiz kullanin
- **Groq**: Hizli ve ucretsiz erisim
- **Cerebras**: Gunde 1 milyon tokena kadar ucretsiz
- **Ollama**: Bilgisayarinizda yerel olarak calisan modeller, tamamen ucretsiz ve internet gerektirmez

## Kurulum

1. **Ayarlar** sayfasina gidin
2. Kullanmak istediginiz **saglayiciyi** bulun
3. Saglayicinin web sitesinden aldiginiz **API anahtarini** girin
4. Sohbet ekraninda kullanmak istediginiz **modeli** secin

## Model Yetenekleri

Her modelin farkli yetenekleri vardir. izan.io bu yetenekleri otomatik olarak tanimlar:

- **Arac Destegi**: MCP araclarini ve makrolari cagirabilme yetenegi
- **Goruntu Destegi**: Gorselleri anlama ve analiz edebilme
- **Muhakeme**: Karmasik problemlerde adim adim dusunme yetenegi (o1, o3, DeepSeek-R1 gibi modeller)

Arac destegi olmayan modeller agentlarla birlikte kullanildiginda MCP araclarini cagiramazlar. Arac gerektiren gorevler icin arac destegi olan bir model sectiginizden emin olun.

## Yedek Model

Birincil saglayici gecici bir hatayla basarisiz oldugunda (rate limit, sunucu hatasi veya ag sorunu) otomatik olarak devreye giren bir **yedek model** yapilandirabilirsiniz.

### Kurulum

1. **Ayarlar** sayfasina gidin
2. **Yedek Model** kartini bulun (provider key'lerinin altinda)
3. Dropdown'dan bir **yedek provider** secin (sadece API key'i kayitli provider'lar gosterilir)
4. O provider'dan bir **yedek model** secin

### Nasil Calisir

- Birincil model **429** (rate limit), **500+** (sunucu hatasi) veya **ag hatasi** dondurdugunde, izan.io istegi otomatik olarak yedek modelle tekrar dener
- Sohbette gecis hakkinda bir bilgi notu gosterilir: "Birincil model basarisiz oldu. Provider / Model ile yeniden deneniyor..."
- **Kimlik dogrulama hatalari** (401, 403) yedek modeli tetiklemez -- bunlar gecici degil, anahtar sorunlarini isaret eder
- Yedek model de basarisiz olursa, hata her zamanki gibi gosterilir (ikinci deneme yapilmaz)
- Yedek provider ve model birincil ile ayniysa, yedek devre disi kalir

### Ipuclari

- Maksimum dayaniklilik icin **farkli bir provider'dan** yedek secin (orn. birincil OpenAI, yedek Anthropic)
- **Groq** veya **Cerebras** gibi ucretsiz saglayicilar harika yedekler olabilir
- Yedek modelin arac destegi olmasi gerekmez -- yoksa sohbet duzyazi olarak devam eder
