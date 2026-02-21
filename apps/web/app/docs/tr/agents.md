# Agentlar

Agentlar, izan.io'nun temel yapisini olusturan **uzman AI asistanlaridir**. Her agent, MCP (Model Context Protocol) araciligiyla yerlesik araclara erisebilir ve bu araclari kullanarak gercek dunyayla etkilesim kurabilir. Bir agent sadece metin ureten bir model degil, arac cagirma yetenegine sahip akilli bir asistandir.

## Yerlesik Agentlar

izan.io, genis bir kategori yelpazesini kapsayan **80'den fazla yerlesik agent** ile gelir. Her agent, ozel bir sistem prompt'u ve gerektiginde MCP araclari veya tarayici otomasyon makrolariyla onceden yapilandirilmistir.

### Temel Agentlar

- **Genel Asistan** -- gunluk araclar (saat, hesap makinesi, sifre uretici, UUID)
- **Domain Uzmani** -- RDAP ve DNS-over-HTTPS ile domain arastirmasi
- **Web Fetch** -- herhangi bir URL'den icerik cekme

### Platform Yoneticileri (Chrome eklentisi gerektirir)

Kayitli tarayici makrolari araciligiyla web platformlariyla etkilesim kurabilen agentlar:

- **GitHub**, **Gmail**, **Slack**, **Notion**, **Jira**, **Trello**, **Todoist**
- **X (Twitter)**, **LinkedIn**, **Instagram**, **Facebook**, **Discord**, **Reddit**, **Bluesky**, **Threads**, **WhatsApp**, **Telegram**, **Pinterest**
- **Spotify**, **Sheets**, **Calendar**

### Arastirma & Bilgi

- **Google Scholar**, **arXiv**, **Wikipedia**, **Hacker News**, **Stack Overflow**, **Kaggle**, **HuggingFace**, **Wayback**
- **Google News**, **News**, **Medium**, **Substack**, **Quora**, **Product Hunt**

### Alisveris & Seyahat

- **Amazon**, **eBay**, **Etsy**, **Walmart**, **AliExpress**, **StockX**, **Shopify**
- **Google Flights**, **Flights**, **Booking**, **Expedia**, **Airbnb**, **TripAdvisor**, **Zillow**

### Eglence & Medya

- **YouTube**, **Spotify**, **IMDb**, **Rotten Tomatoes**, **Letterboxd**, **Goodreads**
- **SoundCloud**, **Bandcamp**, **Last.fm**, **Twitch**, **TikTok**

### Finans & Veri

- **Yahoo Finance**, **CoinMarketCap**, **Coinbase**, **OpenSea**
- **Transfermarkt**, **ESPN**

### Ve Daha Fazlasi

- **Glassdoor**, **Indeed**, **Coursera**, **Udemy**, **Duolingo**
- **Yelp**, **Craigslist**, **Strava**, **MyFitnessPal**, **Untappd**, **Vivino**, **Tinder**
- **Figma**, **Canva**, **Play Store**, **Maps Scout**

Tam katalogu **Agentlar** sayfasindan gorebilirsiniz. Duzentli olarak yeni agentlar eklenmektedir.

## Ozel Agent Olusturma

Kendi agentlarinizi olusturmak icin **Agentlar** sayfasina gidin ve yeni bir agent ekleyin. Tanimlamaniz gerekenler:

- **Isim ve Aciklama**: Agentin amacini belirleyin
- **Sistem Prompt'u**: Agentin davranisini ve uzmanlik alanini tanimlayin
- **Model Parametreleri**: Sicaklik (temperature) ve diger uretim ayarlarini yapilandirin

## Agentlari Birbirine Baglama

izan.io, **coklu agent orkestrasyonu** destekler. Bir agenti baska bir agentin araci olarak atayabilirsiniz. Ornegin, bir "Proje Yoneticisi" agenti hem "Kod Analisti" hem de "Domain Uzmani" agentlarini cagirabilir. Sistem **maksimum 3 seviye derinlige** kadar zincirleme agent cagrilarini destekler.

### Orkestrasyon Editoru

**Orkestrasyon** sayfasi, coklu agent is akislarini gorsel olarak tasarlamak ve yonetmek icin bir kanvas sunar. **Agentlar** sayfasindan erisebilirsiniz.

**Kanvas ozellikleri:**

- **Kok agent secici** -- is akisinizin giris noktasi olacak agenti secin
- **Gorsel graf** -- kok agent, bagli agentlari ve tum alt baglantilari ozyinelemeli olarak gorun. Dongusel baglantilar guvenli sekilde islenir (her agent sadece bir kez gorunur)
- **Agent Bagla butonu** -- araç cubugundan dogrudan yeni agentlari koke baglayin
- **Otomatik duzenleme** -- dugumler soldan saga hiyerarsik olarak otomatik yerlestirilir
- **Surukle birak** -- dugumleri kanvas uzerinde serbestce konumlandirin
- **Detaya inme** -- herhangi bir bagli agente cift tiklayarak kendi alt agacini kesfedin, geri donmek icin geri butonu kullanin
- **Kategori renkleri** -- dugumler kategoriye gore renklendirilir (mavi: genel, yesil: web arama, mor: kod, turuncu: ozel)
- **Sohbeti Test Et** -- ust cubuktan mevcut kok agentle sohbet baslatin
- **Tikla ve duzenle** -- herhangi bir dugume tek tiklayarak duzenleme panelini acin

Agentlar arasi **baglanti cizgileri** animasyonlu olarak cizilir ve baglanti yonunu gosterir. Bir cizgiye cift tiklayarak iki agentin bagini kaldirabilirsiniz.

## Derin Gorev Modu (Deep Task)

Agentin cok sayida arac cagrisi yaparak otonom calismasini gerektiren karmasik gorevler icin **Derin Gorev** modunu kullanin. Mesaj gondermeden once gonder butonunun yanindaki **yildirim ikonuna** tiklayin.

Derin Gorev aktifken:

- **Ilerleme banner'i** hemen gorunur, gecen sure ve adim sayisini gosterir
- **Tarayici bildirimleri** otomatik olarak etkinlestirilir -- gorev tamamlandiginda bildirim alirsiniz
- Agent, kullanici mudahalesi beklemeden arac cagirma dongusunu tamamlar

Derin Gorev; arastirma agirlikli gorevler, cok adimli is akislari ve agentin art arda birden fazla arac cagrisi yapmasi gereken durumlar icin idealdir.

### Uzun Gorev Otomatik Tespiti

Derin Gorev modu olmadan bile, izan.io bir gorevin **3 veya daha fazla arac cagirma turu** yaptigini tespit ettiginde otomatik olarak ilerleme banner'ini gosterir. Banner uzerinden tarayici bildirimlerini etkinlestirebilirsiniz.

### Arka Plan Gorevleri

Bir gorev hala calisirken farkli bir sohbete gecerseniz, calisan gorev **otomatik olarak arka plana tasinir**. Arka plan gorevleri calismaya devam eder ve:

- Kenar cubugundaki sohbetin yaninda bir **durum gostergesi** (donme animasyonu) gosterir
- Sohbet listesinde **adim ilerlemesini** gosterir
- Tamamlandiginda veya basarisiz oldugunda **tarayici bildirimi** gonderir
- Sekme odakta degilse **tarayici sekmesi basligini** yanip sondurur

### Maksimum Iterasyon

Her agentin yapilandirabilir bir **maksimum iterasyon** ayari vardir (varsayilan: 25). Bu, mesaj basina maksimum arac cagirma turu sayisini kontrol eder. Bunu agent duzenleme panelindeki **Model Parametreleri** bolumunden ayarlayabilirsiniz. Yuksek degerler daha uzun otonom gorevlere izin verirken, dusuk degerler gorevleri odakli tutar.

## Araclari Agentlara Atama

Agent duzenleme panelinden:

- **MCP sunucusu atama** -- agente bagli MCP sunucusunun araclarini kullandirma
- **Makro atama** -- agentin sohbet sirasinda calistirabilecegi tarayici otomasyonlarini ekleme
- **Diger agentlari baglama** -- coklu agent orkestrasyonu icin arac olarak cagrilabilecek agentlari secme

## Agent Dis/Ic Aktarim

Agent yapilandirmalarini baskalarıyla **paylasabilir** veya yedekleyebilirsiniz:

### Dis Aktarim (Export)

Agent duzenleme panelinden **dis aktarim butonuna** tiklayarak agenti JSON dosyasi olarak indirin. Dis aktarim su bilgileri icerir:

- Agent ismi, aciklamasi, sistem prompt'u, ikonu ve model parametreleri
- Tum bagli agentlar (ozyinelemeli olarak)
- Ozel MCP sunucu yapilandirmalari
- Agente atanmis makro sunuculari ve araclari

### Ic Aktarim (Import)

Agent duzenleme panelinden **ic aktarim butonuna** tiklayip bir JSON dosyasi secin. izan.io:

- Tum ayarlariyla birlikte agenti olusturur
- Bagli agentlari ozyinelemeli olarak ic aktarir
- Ozel MCP sunucu baglantilarini geri yukler
- Makro sunucularini ve araclarini geri yukler

## Agent Profil Sayfalari

Her agentin, agent listesinden erisilebilen bir **profil sayfasi** vardir. Profilde sunlar gosterilir:

- Agent ikonu, ismi ve aciklamasi
- Sistem prompt'u
- Atanmis araclar: yerlesik MCP'ler, ozel MCP'ler, makrolar ve bagli agentlar
- Agentle sohbet baslatmak icin bir **Agent'i Kullan** butonu

Ozel agentlar icin profilde ayrica "Kullanici Tarafindan Olusturuldu" etiketi gosterilir.
