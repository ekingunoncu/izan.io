# Chrome Eklentisi

## Eklenti Ne Yapar?

izan.io Chrome eklentisi, **makro kaydetme ve yurutme** islevselligini saglar. Eklenti sayesinde tarayicidaki etkilesimlerinizi kaydedebilir, bu kayitlari makro olarak saklayabilir ve AI agentlarinin bu makrolari otomatik olarak calistirmasina olanak taniyabilirsiniz. Makro kullanan agentlar icin eklentinin kurulu ve aktif olmasi **zorunludur**.

## Kurulum

Eklentiyi iki yontemle kurabilirsiniz:

- **Chrome Web Store**: Magazadan dogrudan yukleyerek en kolay sekilde kurulum yapabilirsiniz
- **Kaynaktan derleme**: Projeyi klonlayin, `npm run build:extension` komutunu calistirin ve olusturulan dosyalari Chrome'a "Paketlenmemis uzanti yukle" secenegiyle ekleyin

## Yan Panel

Eklenti simgesine tikladiginizda **yan panel** acilir. Yan panel su kontrolleri icerir:

- **Kayit kontrolleri**: Kaydi baslatma, duraklatma ve durdurma
- **Makro listesi**: Kaydedilmis makrolarin listesi
- **Durum gostergesi**: Kayit veya yurutme durumu hakkinda bilgi

## Kayit Is Akisi

1. Yan paneli acin ve **Kaydet** dugmesine tiklayin
2. Kaydetmek istediginiz web sayfasina gidin
3. Normal sekilde **etkilesimlerinizi gerceklestirin** (tiklama, metin girisi, sayfa gecisleri)
4. Islemleri tamamladiginizda **Durdur** dugmesine basin
5. Makroya bir **isim** verin ve kaydedin

Kaydedilen makro artik izan.io uzerinden agentlara atanabilir ve otomatik olarak calistirtilabilir.

## izan.io ile Iletisim

Eklenti, izan.io web uygulamasiyla **content script ve sayfa arasi postMessage** mekanizmasi uzerinden iletisim kurar. `izan:*` protokol etiketleri kullanilarak mesajlar guvenli bir sekilde iletilir. Bu iletisim, makro calistirma komutlarinin ve sonuclarinin web uygulamasi ile eklenti arasinda tasinmasini saglar.
