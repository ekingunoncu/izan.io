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
- **Selektor** -- **Selector** butonuna tiklayarak CSS selektor cikarma panelini acin (asagidaki [Cikarma Yontemleri](#cikarma-yontemleri) bolumune bakin)
- **A11y** -- **A11y** butonuna tiklayarak erisebilirlik cikarma panelini acin; ARIA rolu ile veri cikarabilir veya tam sayfa erisebilirlik goruntusu alabilirsiniz
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

Veri cikarma, makrolarin web sayfalarindan **yapilandirilmis veri cekmesini** saglar. Cikarma adimlari olusturmanin birkac yolu vardir:

### Eleman Secici (Liste ve Tekil)

Eleman secici, sayfada gorsel bir kaplama kullanarak eleman secmenizi saglar.

**Liste modu:**

1. Kayit sirasinda **Liste** butonuna tiklayin
2. Tekrarlanan bir elemanin (ornegin bir arama sonucu ogesi) uzerine gelin -- sari renkle vurgulanir
3. Tiklayarak secin -- tum benzer elemanlar algilanir ve vurgulanir
4. Cikarma adimi, oge sayisini ve alan tanimlarini yakalar
5. Calisma zamaninda, eslesen tum elemanlarin verileri yapilandirilmis liste olarak dondurulur

**Tekil modu:**

1. Kayit sirasinda **Tekil** butonuna tiklayin
2. Hedef elemanin uzerine gelin ve tiklayin
3. Alanlar elemandan **otomatik olarak algilanir** (metin, baglantilar, gorseller, giris alanlari) -- liste modu gibi
4. Istege bagli olarak ek alt elemanlara tiklayarak daha fazla alan ekleyin
5. **Bitti** butonuna tiklayin -- cikarma adimi hemen olusturulur
6. Calisma zamaninda, cikarilan veriler tek bir nesne olarak dondurulur

### Cikarma Yontemleri

Arac cubugunda cikarma icin iki ayri buton bulunur:

#### CSS Selektor (Selector butonu)

**Selector** butonuna tiklayarak CSS cikarma panelini acin. Manuel olarak bir CSS selektoru girin (ornegin `.post-item`, `table tbody tr`). **Liste** veya **Tekil** modu secin, ardindan **Extract** butonuna tiklayin.

- **Liste** -- eslesen tum elemanlar oge olarak islenir; alanlar ilk ogeden otomatik algilanir
- **Tekil** -- ilk eslesen eleman kullanilir; alanlar ondan otomatik algilanir
- Ipucu: DevTools'ta bir elemana sag tiklayin → Kopyala → Selektoru kopyala

#### Erisebilirlik (A11y butonu)

**A11y** butonuna tiklayarak erisebilirlik cikarma panelini acin. Bu yontem CSS selektoru yerine **ARIA rolu** ile eleman cikarimi yapar -- stil degisikliklerine karsi daha dayaniklidir, Shadow DOM sinirlarini asar ve sinif adlarina bagimli degildir.

1. Acilir menuden bir veya birden fazla **rol** secin (ornegin `link`, `button`, `heading`, `article`, `listitem`, `row`)
2. Istege bagli olarak sonuclari filtrelemek icin bir **erisebilir ad** girin -- yer tutucu, secilen role gore ornekler gosterir (ornegin `link` icin: "Sign In", "Read more")
3. **Include children** secenegini ayarlayin:
   - **ACIK** (varsayilan) -- her eslesen eleman bir konteyner olarak islenir ve alt icerigi (baglantilar, metin, gorseller) ayri alanlar olarak otomatik algilanir. `article`, `listitem`, `row` gibi ic ice icerik barindiran zengin elemanlar icin kullanin.
   - **KAPALI** -- yalnizca eslesen elemanlarin dogrudan ozellikleri cikarilir (metin icerigi, baglantilar icin `href`, gorseller icin `src`/`alt`, giris alanlari icin `value`). `link`, `button`, `heading` gibi basit elemanlar icin kullanin.
4. **Extract** butonuna tiklayin

Erisebilirlik yontemi her zaman eslesen tum elemanlarin bir listesini uretir. Calisma zamaninda, A11y yontemiyle olusturulan cikarma adimlari **gercek erisebilirlik agacini** Chrome DevTools Protokolu uzerinden kullanir; bu sayede dinamik sinif adlarina veya karmasik HTML yapisina sahip sitelerde bile guvenilir calisir.

#### Komsular (Neighbors)

**Komsular** sekmesi, erisebilirlik agacindaki belirli bir elemanin cevresindeki baglami cikarir. Bir **hedef adi** girin (ornegin "Price"), istege bagli olarak **rol** ile filtreleyin, kac **kardes** dahil edilecegini ayarlayin (1--20, varsayilan 3) ve **yon** secin (her iki yon/yukari/asagi). Hedef dugum ciktida `← TARGET` ile isaretlenir.

Role dayali cikarma cok duz bir sonuc dondurdugunde ve cevre yapisina ihtiyac duydugunuzda kullanislidir -- ornegin bir "Price" basligini bulup altindaki 3 kardesi gormek icin.

#### Erisebilirlik Goruntusu (Snapshot)

A11y panelinde ayrica bir **Goruntu** bolumu bulunur. **Snapshot** butonuna tiklayarak mevcut sayfanin **tam erisebilirlik agacini** alin. Bu, sayfa yapisini roller, isimler ve ozelliklerle gosteren kompakt bir metin temsili dondurur -- hangi rolleri cikaracaginiza karar vermeden once sayfa yapisini anlamak icin kullanislidir.

Goruntu ayni zamanda `accessibility_snapshot` adli yerlesik bir MCP araci olarak da mevcuttur (bkz. [Agentlara Makro Atama](#agentlara-makro-atama)).

### Tablo Otomatik Algilama

Eleman secici bir `<table>` elemani algiladiginda, tablo basliklarini anahtar olarak kullanarak her sutunu otomatik olarak bir alana esler. Boylece alanlari manuel tanimlamadan satirlar halinde yapilandirilmis veri elde edersiniz.

### Cikarma Alanlarini Duzenleme

Bir cikarma adimi olusturulduktan sonra, adim kartindaki "Edit fields" butonuna tiklayarak **alanlari tek tek duzenleyebilirsiniz**. Her alan karti su bilgileri gosterir:

- **Anahtar** -- cikis nesnesindeki ozellik adi
- **Tip** acilir menusu -- `text`, `html`, `attribute`, `value`, `regex`, `nested` veya `nested_list` secenekleri
- **Donusum** acilir menusu -- `trim`, `lowercase`, `uppercase` veya `number` son isleme uygulama
- **Selektor** -- elemani bulmak icin kullanilan CSS selektoru (monospace etiket olarak gosterilir)

Secilen tipe gore ek giris alanlari goruntulenir:

- **attribute** -- cikarilacak HTML ozellik adi icin acilir menu (ornegin `href`, `src`), gercek elemandan doldurulur
- **regex** -- regex deseni icin giris ve istege bagli varsayilan deger
- **nested / nested_list** -- alt alan sayisi goruntulenir; alt alanlari JSON disa/ice aktarma ile duzenleyin

"+ Alan Ekle" butonu ile **yeni alan ekleyebilir** veya her karttaki x butonu ile **alan silebilirsiniz**. Degisiklikler adim verisine aninda uygulanir ve makroyu kaydederken veya disa aktarirken dahil edilir.

### Veri Onizleme

Bir cikarma adimi olusturuldugunda, canli sayfadan cikarilan verilerin bir **onizlemesi** yakalanir ve adim kartinda dogrudan gosterilir -- herhangi bir seyi genisletmenize gerek yoktur. Alanlari duzenledikce onizleme canli olarak guncellenir.

- **Liste modunda** onizleme, ilk birkac ogeyi anahtar-deger ciftleriyle gosterir
- **Tekil modda** onizleme, cikarilan nesnenin anahtar-deger ciftlerini gosterir
- Degerler okunabilirlik icin kisaltilir; ic ice nesneler ve diziler boyutlarini gosterir
- Daraltmak/genisletmek icin onizleme basligina tiklayin

Onizleme, makroyu kaydetmeden once dogru verilerin cikarildigini dogrulamaniza yardimci olur.

### Varsayilan Degerler

Alanlar, selektor hicbir elemanla eslesmediginde veya cikarma bos sonuc verdiginde dondurulecek bir **varsayilan degere** sahip olabilir. Varsayilan degerleri alan duzenleyici veya JSON disa aktarma ile ayarlayin.

### Donusum Hatti

Her alan, cikarmadan sonra uygulanan istege bagli bir **donusum** destekler:

- **trim** -- bastaki/sondaki bosluklari kaldir
- **lowercase** -- kucuk harfe donustur
- **uppercase** -- buyuk harfe donustur
- **number** -- metni sayi olarak ayristir

### Limitler

| Limit | Deger | Kapsam |
|-------|-------|--------|
| AX agac satirlari | 2.000 | cikarma basina |
| Rol ogeleri | 100 | cikarma basina |
| Metin degerleri | 500 karakter | cikarma basina |
| Tablo hucreleri | 200 karakter | cikarma basina |
| Tablo satirlari | 200 | cikarma basina |
| Toplam yanit | 50.000 karakter | tum arac yaniti |

Cikarma basina limitler **serit basina** uygulanir -- 4 paralel serit snapshot cikarirsa toplam 4 × 2.000 AX agac satiri olusabilir. Toplam yanit limiti tum seritlerin birlesik ciktisina en son uygulanir. Verileriniz kesiliyorsa daha spesifik selektorler veya rol adi filtreleri ile kapsamini daraltin.

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

### Yerlesik Erisebilirlik Goruntusu Araci

Kullanici tarafindan olusturulan makrolara ek olarak, makro etkinlestirilmis her agent otomatik olarak `accessibility_snapshot` aracina erisebilir. Bu yerlesik arac, mevcut otomasyon tarayici sayfasinin **tam erisebilirlik agacini** kompakt metin olarak dondurur -- roller, isimler ve ozellikler agac formatinda. Agentlar bunu sayfa yapisini anlamak, navigasyon sonuclarini dogrulamak veya hangi elemanlarla etkilesime gecilecegine karar vermek icin kullanabilir.
