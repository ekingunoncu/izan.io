# Agentlar

Agentlar, izan.io'nun temel yapisini olusturan **uzman AI asistanlaridir**. Her agent, MCP (Model Context Protocol) araciligiyla yerlesik araclara erisebilir ve bu araclari kullanarak gercek dunyayla etkilesim kurabilir. Bir agent sadece metin ureten bir model degil, arac cagirma yetenegine sahip akilli bir asistandir.

## Yerlesik Agentlar

### Genel Asistan

Gunluk gorevler icin tasarlanmis cok amacli bir agenttir. Sahip oldugu araclar:

- **Saat**: Guncel tarih ve saat bilgisi
- **Hesaplama**: Matematiksel islemler
- **Sifre Uretici**: Guvenli rastgele sifre olusturma
- **UUID Uretici**: Benzersiz tanimlayici uretme

### Domain Uzmani

Alan adi aramalari ve uygunluk kontrolu icin ozellestirilmis agenttir:

- **Domain Arama**: RDAP ve DoH protokolleri ile domain sorgulama
- **Uygunluk Kontrolu**: Bir alan adinin kayit icin musait olup olmadigini kontrol etme

## Ozel Agent Olusturma

Kendi agentlarinizi olusturmak icin **Agentlar** sayfasina gidin ve yeni bir agent ekleyin. Tanimlamaniz gerekenler:

- **Isim ve Aciklama**: Agentin amacini belirleyin
- **Sistem Prompt'u**: Agentin davranisini ve uzmanlik alanini tanimlayin
- **Model Parametreleri**: Sicaklik (temperature) ve diger uretim ayarlarini yapilandirin

## Agentlari Birbirine Baglama

izan.io, **coklu agent orkestrasyonu** destekler. Bir agenti baska bir agentin araci olarak atayabilirsiniz. Ornegin, bir "Proje Yoneticisi" agenti hem "Kod Analisti" hem de "Domain Uzmani" agentlarini cagirabilir. Sistem **maksimum 3 seviye derinlige** kadar zincirleme agent cagrilarini destekler.

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
