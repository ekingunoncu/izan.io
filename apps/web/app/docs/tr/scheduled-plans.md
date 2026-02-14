# Zamanlanmış Planlar

Zamanlanmış Planlar, agentlarınızı belirli bir prompt ile otomatik çalışacak şekilde zamanlamanıza olanak tanır - tek seferlik belirli bir zamanda veya cron ifadeleri kullanarak tekrarlayan şekilde.

## Genel Bakış

Zamanlanmış Planlar ile şunları yapabilirsiniz:

- **Agentları zamanlı çalıştırma** - günlük raporlar, haftalık özetler, periyodik kontroller
- **Tek seferlik çalıştırma** - bir agentı belirli bir tarih ve saatte çalışacak şekilde zamanlama
- **Tekrarlayan çalıştırma** - esnek zamanlama için standart cron ifadeleri kullanma
- **Kesintisiz çalıştırma** - planlar arka planda çalışır, mevcut sohbetinizi etkilemez
- **Çalıştırma geçmişi** - geçmiş çalıştırmaları görüntüleme ve oluşturulan sohbetlere bağlantı

## Plan Oluşturma

1. Ana navigasyondaki **Planlar** sayfasına gidin (CalendarClock ikonu)
2. **Plan Oluştur**'a tıklayın
3. Formu doldurun:
   - **Ad**: Plan için açıklayıcı bir isim
   - **Açıklama**: Planın ne yaptığının isteğe bağlı açıklaması
   - **Agent**: Planı çalıştıracak agentı seçin
   - **Prompt**: Agenta gönderilecek mesaj
   - **Zamanlama Türü**: "Bir Kez" veya "Tekrarlayan" seçin

### Tek Seferlik Planlar

"Bir Kez" seçin ve bir tarih ve saat belirleyin. Plan o zamanda çalışacak ve otomatik olarak tamamlandı olarak işaretlenecektir.

### Tekrarlayan Planlar

"Tekrarlayan" seçin ve standart 5 alanlı bir cron ifadesi girin veya hazır butonlardan birini kullanın:

| Hazır | Cron İfadesi | Açıklama |
|-------|-------------|----------|
| Her saat | `0 * * * *` | Her saatin başında çalışır |
| Her gün 09:00 | `0 9 * * *` | Her gün saat 09:00'da çalışır |
| Haftalık (Pazartesi) | `0 9 * * 1` | Her Pazartesi saat 09:00'da çalışır |
| Aylık (1.) | `0 9 1 * *` | Her ayın 1'inde saat 09:00'da çalışır |

Form, bir sonraki zamanlanmış çalıştırma zamanının canlı önizlemesini gösterir.

## Çalıştırma Nasıl Gerçekleşir

Bir planın zamanlanmış zamanı geldiğinde:

1. Seçilen agent için yeni bir sohbet oluşturulur (`[Plan]` ön ekiyle)
2. Prompt agenta kullanıcı mesajı olarak gönderilir
3. Agent, yapılandırılmış tüm araçları ve MCP sunucularını kullanarak yanıt verir
4. Çalıştırma planın geçmişine kaydedilir

Planlar **arka planda** çalışır - mevcut sohbet oturumunuzu kesintiye uğratmaz.

## Eklenti ve Yedek Modu

- **Chrome Eklentisi ile**: Planlar, sekme arka plandayken bile güvenilir zamanlama için `chrome.alarms` kullanır
- **Eklenti olmadan**: Planlar, izan.io sekmesi açıkken 30 saniyelik aralıklarla kontrol eder. Sekmeyi yeniden açtığınızda kaçırılan planları yakalar.

## Planları Yönetme

- **Duraklat/Devam**: Planın durumunu aktif ve duraklatılmış arasında değiştirin
- **Şimdi Çalıştır**: İstediğiniz zaman bir plan çalıştırmasını manuel olarak tetikleyin
- **Düzenle**: Planın adını, promptunu, agentını veya zamanlamasını değiştirin
- **Sil**: Bir planı ve çalıştırma geçmişini kaldırın

## Gereksinimler

- Seçili sağlayıcınız için bir **API anahtarı** yapılandırılmış olmalıdır
- Plana atanan **agent** mevcut ve etkin olmalıdır
