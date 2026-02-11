# API Anahtarlari ve Gizlilik

## Gizlilik Modeli

izan.io, **gizlilik oncelikli** bir yaklasimla tasarlanmistir. Platformu kullanmak icin **hesap olusturmaniz gerekmez**. Hicbir kisisel bilgi veya API anahtari izan.io sunucularinda saklanmaz. Tum verileriniz tamamen sizin kontrolunuzdedir.

## API Anahtarlarinin Saklanmasi

API anahtarlariniz, tarayicinizin **IndexedDB** veritabaninda yerel olarak saklanir. Bu anahtarlar:

- izan.io sunucularina **asla gonderilmez**
- Yalnizca **sizin tarayicinizda** bulunur
- Tarayici verilerinizi temizlediginizde silinir

## Dogrudan API Cagrilari

izan.io, LLM saglayicilarina yapilan API cagrilarini **dogrudan tarayicinizdan** gerceklestirir. Arada herhangi bir araci sunucu bulunmaz. Ornegin, OpenAI'a bir istek gonderdiginizde, bu istek tarayicinizdan dogrudan OpenAI'in sunucularina ulasir. Bu yaklasim, API anahtarlarinizin ucuncu bir taraf tarafindan gorulme riskini ortadan kaldirir.

## Yerel Veri Saklama

Konusmalariniz, agent tanimlariniz ve tercihleriniz **IndexedDB'de yerel olarak** saklanir. Bu veriler yalnizca sizin tarayicinizda bulunur ve hicbir sunucuya aktarilmaz. Verilerinizi istediginiz zaman tarayici ayarlarindan silebilirsiniz.

## Acik Kaynak Seffaflik

izan.io, **AGPL-3.0** lisansi altinda acik kaynaklidir. Kaynak kodu tamamen halka aciktir ve herkes tarafindan denetlenebilir. Bu seffaflik, platformun gizlilik vaatlerinin bagimsiz olarak dogrulanabilmesini saglar.

## MCP Proxy Hakkinda

Ozel MCP sunucularina baglanirken CORS kisitlamalarini asmak icin bir **Lambda proxy** kullanilabilir. Bu proxy:

- **Yalnizca** CORS atlatmasi icin devreye girer
- API anahtarlarinizi **gormez ve saklamaz**
- Istek icerigini hedef sunucuya oldugu gibi iletir
- Yerlesik MCP sunuculari icin **kullanilmaz** (bunlar tamamen tarayicida calisir)
