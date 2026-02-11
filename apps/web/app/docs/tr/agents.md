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

## MCP Sunuculari ve Makro Atama

Her agente farkli MCP sunuculari ve makrolar atanabilir. Bu sayede her agent yalnizca ihtiyac duydugu araclara erisir. Atama islemini agent duzenleme ekranindan veya Ayarlar sayfasindan gerceklestirebilirsiniz. Agentlar arasi gecis yaptiginizda, kullanilmayan MCP sunuculari otomatik olarak devre disi birakilir ve yalnizca aktif agentin ihtiyac duydugu sunucular baglanir.
