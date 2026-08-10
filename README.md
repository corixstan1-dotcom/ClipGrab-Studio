# ClipGrab Studio (PC versiyonu)

YouTube, TikTok ve Instagram videolarını indirmek veya MP3'e çevirmek için Electron + React tabanlı masaüstü uygulaması.

## Nasıl çalışıyor?

- **Electron** masaüstü pencereyi ve dosya sistemi erişimini sağlıyor.
- **React (Vite)** arayüzü çiziyor — renk paleti sana attığın "Realtime Colors" görselindeki tonlara göre ayarlandı (`src/App.css`).
- **yt-dlp** (npm paketi `yt-dlp-wrap` üzerinden) video bilgisini çekiyor ve indirmeyi yapıyor. İlk açılışta yt-dlp binary'sini otomatik indirir, tekrar indirmene gerek yok.
- **ffmpeg** (npm paketi `ffmpeg-static` ile birlikte geliyor) ses/görüntü birleştirme ve MP3 dönüştürme için kullanılıyor.

## Kurulum (kendi bilgisayarında)

Node.js (18 veya üstü) kurulu olmalı. Sonra proje klasöründe:

```bash
npm install
```

## Geliştirme modunda çalıştırma

```bash
npm run dev
```

Bu komut hem Vite dev server'ı hem Electron penceresini aynı anda açar.

## Windows için kurulum dosyası (launcher/.exe) oluşturma

```bash
npm run build:win
```

`release/` klasöründe `ClipGrab Studio Setup x.x.x.exe` dosyası oluşur — bunu çalıştırınca masaüstü kısayolu ile kurulan bir "launcher" uygulaması olur.

macOS için `npm run build:mac`, Linux için `npm run build:linux` kullanabilirsin.

## Uygulama akışı

1. Üstten **Video** ya da **MP3** modunu seç.
2. Video modundaysan platform seç (YouTube/TikTok/Instagram) — bu sadece görsel, yt-dlp linki otomatik tanıyor.
3. Linki yapıştır, **Önizle**'ye bas → thumbnail, başlık ve kullanılabilir kaliteler gelir.
4. Kalite (1080p/720p/480p/144p) ve ses açık/kapalı seçimini yap.
5. **Videoyu indir**'e bas. Dosya varsayılan İndirilenler klasörüne kaydedilir.
6. MP3 modunda direkt linki yapıştırıp **MP3 olarak indir**'e basman yeterli.

## Önemli notlar

- Bu proje **kendi bilgisayarında** çalıştırılmak üzere hazırlandı — burada (bu sohbette) çalıştırılmadı, çünkü Electron bir masaüstü penceresi açıyor ve yt-dlp gerçek internet indirmesi yapıyor.
- YouTube/TikTok/Instagram'ın kullanım şartları içerik indirmeyi genelde kısıtlıyor; bu uygulamayı kendi kişisel kullanımın için kullanman senin sorumluluğunda.
- Mobil (Android/iOS) versiyonu bu iskeleti kapsamıyor — ayrı bir React Native/Flutter projesi olarak sıradaki adımda ele alacağız.

## Sıradaki adımlar (istersen)

- İndirme geçmişi listesi (son indirilen dosyalar)
- Toplu link ekleme (birden fazla linki aynı anda indirme)
- Uygulama ikonu (`build/icon.ico` / `.icns` / `.png` ekleyip gerçek bir logo koyman gerekiyor)
- Mobil versiyon için React Native scaffold
