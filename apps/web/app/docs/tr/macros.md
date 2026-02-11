# Makrolar (Tarayici Otomasyonu)

## Makrolar Nedir?

Makrolar, tarayicidaki etkilesimlerinizi kaydedip tekrar oynatmanizi saglayan **otomatik tarayici islemleridir**. izan.io'daki makrolar siradan otomasyon araclarindan farklidir: agentlar tarafindan **arac olarak cagrilabilir**. Bu sayede bir AI agenti, sizin adimlariniza web sayfalarinda gezinebilir, form doldurabilir, veri cikarabilir ve karmasik is akislarini otomatik olarak yurutebilir.

## Makro Kaydetme

Makro kaydetmek icin **Chrome eklentisi** gereklidir:

1. Chrome eklentisinin **yan panelini** acin (eklenti simgesine tiklayin)
2. **Kaydet** dugmesine basin
3. Kaydetmek istediginiz web sitesine gidin ve etkilesimlerinizi gerceklestirin (tiklama, yazma, kaydirma vb.)
4. Islemleri tamamladiginizda **Durdur** dugmesine basin
5. Makronuza bir **isim** verin ve kaydedin

## Makro Duzenleme

Kaydedilen makrolar duzenlenebilir:

- **Adimlari degistirme**: Gereksiz adimlari silin veya siralamalarini duzenleyin
- **Parametre ekleme**: Makroyu dinamik hale getirmek icin degisken parametreler tanimlayin (ornegin aranacak kelime, doldurulacak form alani)
- **Veri cikarma yapilandirma**: Hangi verilerin sayfadan cekilecegini belirleyin (metin, baglanti, tablo verisi vb.)

## Paralel Seritler

Makrolar **paralel serit** destegi sunar. Farkli sekmelerde eszamanli olarak birden fazla islem yurutebilirsiniz. Ornegin, bir serit bir web sitesinde arama yaparken, diger serit baska bir siteden veri cekebilir. Bu ozellik karmasik is akislarinda onemli zaman tasarrufu saglar.

## JSON Disa/Ice Aktarma

Makrolar **JSON formatinda** disa ve ice aktarilabilir. Bu ozellik sayesinde:

- Makrolarinizi yedekleyebilirsiniz
- Baska kullanicilarla paylasabilirsiniz
- Farkli cihazlar arasinda tasiyabilirsiniz

## Agentlara Makro Atama

Makrolari belirli agentlara atayabilirsiniz. Atama islemini agent duzenleme ekranindan gerceklestirebilirsiniz. Bir agente makro atandiginda, o makro agentin kullanabilecegi araclar listesine eklenir.

## Agentlar Makrolari Nasil Kullanir?

Makro atanmis bir agentle sohbet ettiginizde, su surec otomatik olarak isler:

1. **LLM modeli** gorev icin uygun makroyu **arac olarak cagirmaya** karar verir
2. Cagri, **Chrome eklentisine** iletilir
3. Eklenti, makrodaki **adimlari sirasiyla yurutur** (sayfa acma, tiklama, veri girisi vb.)
4. Sonuclar (cikarilan veriler, ekran goruntuleri) **agente geri gonderilir**
5. Agent, elde edilen verileri kullanarak size **yanit olusturur**

Bu yaklasim, AI agentlarin gercek web siteleriyle etkilesim kurmasini ve veri toplamasini mumkun kilar.
