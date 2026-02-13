# Analitik

## Genel Bakış

Analitik sayfası, **token kullanımınızı ve maliyetlerinizi** model, agent ve araç bazında gösterir. Her LLM API çağrısı tarayıcınızın IndexedDB'sine kaydedilir -- hiçbir veri cihazınızdan çıkmaz.

Analitik sayfasına ana sayfa başlığındaki **grafik ikonundan** ulaşabilirsiniz.

## Özet Kartları

Sayfanın üst kısmında, seçili zaman aralığı için dört özet kart bulunur:

- **Toplam Maliyet** -- USD cinsinden toplam harcamanız, önceki dönemle karşılaştıran trend göstergesiyle birlikte
- **Toplam Token** -- giriş ve çıkış tokenlarının toplamı, tür bazlı kırılımla
- **API Çağrıları** -- toplam LLM istek sayısı
- **Ort / Çağrı** -- çağrı başına ortalama maliyet

## Zaman Aralığı

Segmentli kontrol ile verileri zaman aralığına göre filtreleyin:

- **7g** -- son 7 gün
- **30g** -- son 30 gün (varsayılan)
- **90g** -- son 90 gün
- **Tümü** -- kaydedilen tüm veri

Toplam Maliyet kartındaki trend göstergesi, mevcut dönemi bir önceki dönemle karşılaştırır (örn. bu 7 gün ile önceki 7 gün).

## Zaman İçinde Kullanım

Günlük kullanımı gösteren bir bar grafik. **Maliyet** ve **Token** görünümleri arasında geçiş yapabilirsiniz:

- **Maliyet** -- günlük USD harcama
- **Token** -- giriş tokenları (mavi) ve çıkış tokenları (yeşil) olarak yığılmış barlar

Tam değerleri görmek için barların üzerine gelin.

## Kırılımlar

### Agent Bazlı

Hangi agentların en çok bütçe tükettiğini gösterir. Her agent, en çok harcayan agente göre oranlanmış bir ilerleme çubuğu ve toplam maliyetiyle birlikte görüntülenir.

### Model Bazlı

Agent kırılımıyla aynı düzende, model ID'sine göre gruplanmış (örn. `gpt-4.1`, `claude-sonnet-4-5-20250929`). Sağlayıcılar arası maliyet verimliliğini karşılaştırmak için kullanışlıdır.

### Araç Kullanımı

**En çok çağrılan 10 aracı** çağrı sayısıyla listeler. Agentlarınızın hangi MCP araçlarına en çok bağımlı olduğunu belirlemeye yardımcı olur.

## Verileri Temizleme

Tüm analitik kayıtlarını silmek için başlıktaki **çöp kutusu ikonuna** tıklayın. Veri silinmeden önce bir onay penceresi görünür. Bu işlem geri alınamaz.

## Nasıl Çalışır

Her LLM çağrısı tamamlandığında (araç çağırma döngüsündeki her tur dahil), IndexedDB'ye şu bilgilerle bir kullanım kaydı kaydedilir:

- Giriş ve çıkış token sayıları
- Sağlayıcının fiyatlandırmasından hesaplanan maliyet
- Agent ve model tanımlayıcıları
- O turda çağrılan araç isimleri

Tüm hesaplamalar istemci tarafında yapılır. Hiçbir analitik verisi herhangi bir sunucuya gönderilmez.
