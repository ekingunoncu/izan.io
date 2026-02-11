# MCP Sunuculari

## MCP Nedir?

**Model Context Protocol (MCP)**, yapay zeka modellerine arac ve veri erisimi saglayan standart bir protokoldur. MCP sayesinde bir LLM modeli sadece metin uretmekle kalmaz; hesaplama yapabilir, web'de arama gerceklestirebilir, domain sorgulayabilir ve daha bircok islemi gerceklestirebilir. izan.io, MCP'yi tam olarak destekler ve hem yerlesik hem de ozel MCP sunuculariyla calisir.

## Yerlesik Sunucular

izan.io ile birlikte gelen yerlesik MCP sunuculari **tamamen tarayicinizda calisir** -- herhangi bir dis sunucu baglantisi gerektirmez:

### General (Genel)

- Saat ve tarih bilgisi
- Matematiksel hesaplamalar
- Guvenli sifre uretimi
- UUID olusturma

### Domain Check (Domain Kontrolu)

- RDAP protokolu ile domain sorgulama
- DoH (DNS over HTTPS) ile DNS kayitlarini kontrol etme
- Alan adi uygunluk kontrolu

## Ozel MCP Sunuculari Ekleme

Kendi MCP sunucularinizi veya ucuncu parti sunuculari ekleyebilirsiniz:

1. **Ayarlar** sayfasina gidin
2. **Ozel MCP Sunuculari** bolumunu bulun
3. MCP sunucusunun **URL'sini** girin ve ekleyin
4. Sunucu otomatik olarak baglanacak ve araclari kesfedilecektir

## CORS Yonetimi

Tarayicidan dogrudan dis MCP sunucularina baglanirken CORS (Cross-Origin Resource Sharing) kisitlamalariyla karsilasilabilir. izan.io bu durumu otomatik olarak yonetir:

- Once **dogrudan baglanti** denenir
- Basarisiz olursa, istekler **Lambda proxy** uzerinden otomatik olarak yeniden yonlendirilir
- Proxy yalnizca CORS atlatmasi icin kullanilir; API anahtarlarinizi gormez ve saklamaz

## Sunuculari Agentlara Atama

Her MCP sunucusunu bir veya birden fazla agente atayabilirsiniz. Agentlar yalnizca kendilerine atanan sunucularin araclarini kullanabilir. Bu sayede her agent yalnizca ihtiyac duydugu araclara erisir ve gereksiz sunucu baglantilari olusturulmaz.

## MCP Gelistiricileri Icin

izan.io, kendi MCP sunucunuzu gelistiriyorsaniz **mukemmel bir test ortami** sunar. Ozel sunucu URL'nizi ekleyerek araclarinizi gercek bir LLM ile aninda test edebilir, farkli agentlarla deneyebilir ve hata ayiklama surecini hizlandirabilirsiniz.
