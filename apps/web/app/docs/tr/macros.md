# Makrolar (Tarayici Otomasyonu)

## Makrolar Nedir?

Makrolar, tarayicidaki etkilesimlerinizi kaydedip tekrar oynatmanizi saglayan **otomatik tarayici islemleridir**. izan.io'daki makrolar siradan otomasyon araclarindan farklidir: agentlar tarafindan **arac olarak cagrilabilir**. Bu sayede bir AI agenti, sizin adimlariniza web sayfalarinda gezinebilir, form doldurabilir, veri cikarabilir ve karmasik is akislarini otomatik olarak yurutebilir.

## Makro Sunuculari

Kayit yapmadan once makrolarinizi gruplamak icin bir **makro sunucusu** olusturmaniz gerekir. Sunucu, iliskili makrolarin bir arada tutuldugu isimlendirilmis bir gruptur.

- Yan panelde **Yeni Sunucu** butonuna tiklayarak olusturun
- Bir **isim** ve istege bagli **aciklama** girin
- Sunucu adinin yanindaki ikonlarla duzenleyin veya silin
- Her sunucu birden fazla makro icerebilir

## Makro Kaydetme

Makro kaydetmek icin **Chrome eklentisi** gereklidir:

1. Chrome eklentisinin **yan panelini** acin (eklenti simgesine tiklayin)
2. Eklemek istediginiz sunucunun altindaki **Makro Kaydet** butonuna tiklayin
3. **Kaydet** dugmesine basarak yakalamaya baslayin
4. Kaydetmek istediginiz web sitesinde **etkilesimlerinizi gerceklestirin** (tiklama, yazma, sayfa gecisi, kaydirma)
5. Islemleri tamamladiginizda **Durdur** dugmesine basin
6. **Bitti** dugmesine basarak kayit ekranina gecin
7. Makronuza bir **isim** verin, aciklama ekleyin ve kaydedin

Kaydedici, her etkilesimi element selektorleri, islem tipleri ve giris degerleri ile ayri bir adim olarak yakalar. Adimlar, sayfayla etkilesim kurarken yan panelde anlik olarak goruntulenir.

### Ek Kayit Kontrolleri

- **Liste cikarma** -- kayit sirasinda **Liste** butonuna tiklayarak benzer ogelerin listesini cikarabilirsiniz (ornegin arama sonuclari, tablo satirlari)
- **Tekil cikarma** -- **Tekil** butonuna tiklayarak tek bir elemandan veri cikarabilirsiniz
- **Bekleme adimi** -- **Bekle** butonuna tiklayarak adimlar arasina manuel gecikme ekleyebilirsiniz (0.1--30 saniye)
- **Serit** -- ayri sekmelerde eszamanli yurutme icin paralel serit ekleyebilirsiniz

## Parametrelestirme

Parametrelestirme, kaydedilen statik degerleri LLM'in calisma zamaninda sagladigi **dinamik girislere** donusturur. Uc tip vardir:

### URL Sorgu Parametreleri

Bir navigasyon adiminda URL sorgu parametreleri varsa (ornegin `?q=test`), her parametre bir **toggle anahtari** ile goruntulenir. Dinamik yapmak icin toggle'i acin:

1. Deger `test` yerine `{{q}}` olur
2. LLM'in ne saglamasi gerektigini anlatan bir **aciklama** girin (ornegin "Arama sorgusu")
3. Calisma zamaninda LLM gercek degeri doldurur

### URL Yol Parcalari

URL'deki yol parcalari da parametrelestirilebilir. Ornegin `github.com/user/repo/issues/123` adresinde:

1. Her yol parcasi (`user`, `repo`, `issues`, `123`) bir toggle ile goruntulenir
2. `123` uzerindeki toggle'i acarak dinamik yapin
3. Bir **parametre adi** (ornegin `issue_number`) ve **aciklama** girin
4. URL `github.com/user/repo/issues/{{issue_number}}` haline gelir

### Metin Girisi Degerleri

Giris alanlarina yazilan metinler parametrelestirilebilir:

1. Bir yazma adimi, kaydedilen metni bir toggle ile gosterir
2. Metni dinamik yapmak icin toggle'i acin
3. Bir **parametre adi** (ornegin `search_query`) ve **aciklama** girin
4. Calisma zamaninda LLM yazilacak metni saglar

## Makro Duzenleme

Listedeki herhangi bir makroya tiklayarak **duzenleme gorunumunu** acabilirsiniz:

- Makronun **adini degistirme** ve aciklamasini guncelleme
- **Adimlari yeniden siralama**: tutma kolunu surukleyerek veya yukari/asagi oklari kullanarak
- **Adim silme**: uzerine gelip cop kutusu ikonuna tiklayarak
- **Ek adimlar kaydetme**: Kaydet butonuna basarak mevcut makroya yeni islemler ekleyebilirsiniz
- **Cikarma adimlari ekleme**: Duzenleme-kayit modundayken Liste/Tekil butonlarini kullanarak
- **Bekleme adimi ekleme**: Yapilandirtilabilir sureli manuel bekleme
- **Bekleme kosulu ayarlama**: Navigasyon adimlarinda Sayfa Yuklenmesi (varsayilan), DOM Hazir veya Ag Bosalma arasinda secim
- **Parametreleri ayarlama**: URL parametreleri, yol parcalari ve metin girisleri icin parametrelestirmeyi acip kapatma
- **JSON olarak disa aktarma**: Duzenleme gorunumunden makroyu disa aktarabilirsiniz

## Veri Cikarma

Veri cikarma, makrolarin web sayfalarindan **yapilandirilmis veri cekmesini** saglar. Kayit sirasinda:

### Liste Modu

1. Kayit sirasinda **Liste** butonuna tiklayin
2. Tekrarlanan bir elemanin (ornegin bir arama sonucu ogesi) uzerine gelin -- sari renkle vurgulanir
3. Tiklayarak secin -- tum benzer elemanlar algilanir ve vurgulanir
4. Cikarma adimi, oge sayisini ve alan tanimlarini yakalar
5. Calisma zamaninda, eslesen tum elemanlarin verileri yapilandirilmis liste olarak dondurulur

### Tekil Mod

1. Kayit sirasinda **Tekil** butonuna tiklayin
2. Hedef elemanin uzerine gelin ve tiklayin
3. Tek bir elemanin verileri yakalanir
4. Calisma zamaninda, cikarilan veriler tek bir nesne olarak dondurulur

## Paralel Seritler

Makrolar, **ayri tarayici sekmelerinde** eszamanli olarak birden fazla adim dizisini calistirmak icin **paralel serit** destegi sunar.

- Yeni serit olusturmak icin **Serit** (kayit gorunumu) veya **Serit Ekle** (duzenleme gorunumu) butonuna tiklayin
- Serit sekmeleri arasinda tiklayarak **gecis yapin**
- Sekme adina cift tiklayarak **yeniden adlandirin**
- Sekme uzerindeki X butonuyla **seridi kaldirin**
- Her serit bagimsiz olarak calisir -- birden fazla siteyi eszamanli olarak aramak veya sayfalar arasi verileri karsilastirmak icin idealdir

## Paylasim

Makrolar ve sunucular **JSON olarak disa ve ice aktarilabilir**:

### Disa Aktarma

- Sunucu adinin yanindaki indirme ikonu ile **sunucuyu** (tum araclariyla birlikte) disa aktarin
- Arac satirindaki indirme ikonu veya duzenleme gorunumunden **tek bir araci** disa aktarin

### Ice Aktarma

- Listenin altindaki "JSON Ice Aktar" butonu ile **sunucu ice aktarin**
- Sunucu adinin yanindaki yukleme ikonu ile **belirli bir sunucuya arac ice aktarin**

Bu ozellik sayesinde otomasyon is akislarini ekipler arasinda paylasabilir veya makrolarinizi yedekleyebilirsiniz.

## Agentlara Makro Atama

Bir makroyu agente atamak icin:

1. **Agent duzenleme panelini** acin
2. **Makrolar** bolumune gidin
3. Agentin kullanabilecegi makrolari secin

Sohbet sirasinda LLM, atanmis her makroyu cagrilabilir bir arac olarak gorur. Model bir makroyu cagirmaya karar verdiginde, **Chrome eklentisi kaydedilen adimlari tarayicida yurutur** ve sonuclari sohbete dondurur. Agent daha sonra cikarilan verileri kullanarak yanitini olusturur.
