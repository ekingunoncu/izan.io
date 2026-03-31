# Chrome Eklentisi

izan.io Chrome eklentisi, dogrudan tarayicinizda bir MCP sunucusu calistirir. MCP istemcileri, kopru CLI araciligiyla eklentiye baglanir ve web sayfalariyla etkilesim kuran araclari cagirabilir.

## Eklenti Ne Yapar

Eklenti, tarayici otomasyon yeteneklerini MCP araclari olarak sunar. Bir MCP istemcisi bir araci cagirdiginda, eklenti bunu tarayici baglaminda calistirir -- sayfalarda gezinir, elemanlara tiklar, veri cikarir ve sonuclari dondurur.

## Yan Panel

Yan paneli acmak icin arac cubugundaki izan.io simgesine tiklayin. Buradan sunlari yapabilirsiniz:

- **Arac olusturma** -- Yerlesik duzenleyici ile yeni araclar yazin
- **Arac duzenleme** -- Mevcut arac tanimlarini degistirin
- **Arac test etme** -- Araclari test parametreleriyle manuel olarak calistirin
- **Arac yonetimi** -- Araclari etkinlestirin, devre disi birakin veya silin

Her aracin bir adi, aciklamasi, parametre tanimlari ve bir JavaScript fonksiyon govdesi vardir.

## Arac Depolama

Araclar yerel olarak `chrome.storage.local` icinde saklanir. Siz acikca disa aktarmadikca veya yayinlamadikca tarayicinizdan cikmaz. Bu su anlama gelir:

- Araclar tarayici yeniden baslatmalarina ragmen korunur
- Araclar Chrome profilinize baglidir
- Eklentiyi kaldirmak tum araclari siler

## Baglanti Durumu

Yan panel mevcut baglanti durumunu gosterir:

- **Bagli** -- Kopru calisiyor ve bir MCP istemcisi bagli
- **Bekliyor** -- Eklenti hazir ama kopru bagli degil
- **Baglanti Kesildi** -- Eklenti kopru ile iletisim kuramiyor

"Baglanti Kesildi" goruyorsaniz, koprunun calistigindan (`npx izan-mcp`) ve MCP istemcinizin dogru yapilandirildigindan emin olun.
