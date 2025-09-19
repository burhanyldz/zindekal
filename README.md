ZindeKal Modal - Ön Uç Geliştirici Dokümantasyonu (Türkçe)

Bu belge, ZindeKal modal eklentisini hızlıca entegre etmek için gereken temel bilgileri içerir.

1) Hızlı Başlangıç

- Dosyalar
  - `zinde-kal-modal.js` — Ana plugin sınıfı.
  - `audio-player.js` —  Dahili ses çalar.
  - `index.html` — örnek kullanım ve demo düğmeleri.

- Başlatma (örnek):

```html
<script>
  const config = {
    container: document.body,
    modal: { title: "Zinde Kal" },
    exercise: { videos: [ /* video nesneleri */ ] },
    relaxing: { videos: [ /* video nesneleri */ ] },
    music: { tracks: [ /* track nesneleri */ ], currentTrack: 0 }
  };

  const modal = new ZindeKalModal(config);
</script>
```

2) Konfigürasyon (Sadece veri)

- `modal` — temel modal ayarları (başlık, kapatma davranışları).
- `exercise.videos` — video nesneleri. Her video örneği:
  ```js
  {
    id: "ankle-1",
    categoryId: "ankle", // kategori id'si sabit kategorilerden gelmelidir
    title: "Ayak Bileği Egzersizi",
    description: "...",
    thumbnail: "thumbnails/serengeti.png",
    src: "videos/...mp4",
    duration: "02:15"
  }
  ```
- `relaxing.videos` — rahatlatıcı videoların listesi (aynı şekil).
- `music.tracks` — müzik listesi; her parça: `{ id, title, artist, src, duration }`.

3) Olaylar (Events)

Artık olaylar `config.events` içinde değil. Event bağlamak için public metodları kullanın (örnek zincirleme):

```js
modal
  .onOpen(modal => { /* açılış */ })
  .onClose(modal => { /* kapanış */ })
  .onTabChange((newTab, oldTab, modal) => { /* sekme değişti */ })
  .onVideoPlay((videoSrc, modal) => { /* video oynat */ })
  .onAudioPlay((track, modal) => { /* ses çalındı */ })
  .onAudioPause((track, modal) => { /* ses duraklatıldı */ });
```

4) Toast - Bildirim

Herhangi bir yerden bildirim göstermek için:

```js
modal.showToast('Mesajınız burada', { autoHideDelay: 5000, icon: 'images/kanka.png' });
modal.hideToast();
```

5) Public metodlar (kısa)

- `open()` / `close()` — modal açma/kapatma
- `switchTab(tabName)` — 'exercise' | 'music' | 'relaxing'
- `showToast(message, options)` / `hideToast()`
- `toggleAudioPlay()` / `nextTrack()` / `previousTrack()` — müzik kontrol
- `getConfig()` — mevcut config'i döner
- `destroy()` — eklentiyi DOM'dan temizler

6) Veri kaynağı önerisi

- Sunucudan gelen veriyi `exercise.videos`, `relaxing.videos` ve `music.tracks` içinde gönderin.
- Kategoriler sabit olduğundan, `video.categoryId` alanları sabit kategori id'lerinden olmalıdır (ör: `ankle`, `shoulder-standing`, `shoulder-sitting`, `walking`, `eye`, `back-standing`, `breathing`).

7) Örnek: Sunucudan çekme ve başlatma

```js
fetch('/api/zinde-data').then(r => r.json()).then(data => {
  const config = {
    container: document.body,
    modal: { title: 'Zinde Kal' },
    exercise: { videos: data.exerciseVideos },
    relaxing: { videos: data.relaxingVideos },
    music: { tracks: data.musicTracks }
  };
  const modal = new ZindeKalModal(config);
});
```