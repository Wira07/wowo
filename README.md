# Merge KOPDES Merah Putih

Game puzzle drop & merge (HTML5 Canvas + Matter.js) sesuai `PRD_Game_Puzzle_Merge_Kopdes_Merah_Putih.md`.

## Menjalankan
Buka lewat server lokal (agar PWA/offline & service worker aktif):

    node tools/serve.js 8080      # lalu buka http://localhost:8080
    # atau: python -m http.server 8080

`index.html` juga bisa dibuka langsung (tanpa fitur PWA).

## Struktur
- `index.html`, `style.css`, `game.js` (logika, objek `LEVELS`), `audio.js` (SFX suara karakter, efek WebAudio & musik latar)
- `assets/` aset gambar transparan (`lvl1..6.png`), ikon PWA (`icon-192.png`, `icon-512.png`), dan suara merge (`merge_lvl1.wav`, `merge_lvl2.wav`, `merge_lvl3.wav`)
- `vendor/matter.min.js` Matter.js 0.20.0 (lokal, agar offline)
- `sw.js`, `manifest.webmanifest` PWA
- `tools/prep_assets.py` (hapus background dari gambar asli), `tools/make_icons.py`, `tools/serve.js`

## Suara Merge (SFX)
- **Orang Kurus + Orang Kurus (→ Level 2):** `assets/merge_lvl1.wav` (*"19 juta lapangan pekerjaan"* dari `WhatsApp Video 2026-11-05 at 18.41.25.mp4`)
- **Orang Ke-2 / Gendut + Orang Ke-2 (→ Level 3):** `assets/merge_lvl2.wav` (*"Hai! Antek-antek asing!"* dari `WhatsApp Video 2026-11-05 at 18.40.31.mp4`)
- **Sawit + Sawit (→ Level 4):** `assets/merge_lvl3.wav` (*"Kalau bangsa ini lapar, saya yang tanggung jawab..."* dari `WhatsApp Video 2026-11-05 at 18.40.32.mp4`)

## Pemetaan aset
1 Orang Kurus = `Gemini_..x9iw..jpg` · 2 Orang Ke-2 = `Gemini_..9kc0..jpg` ·
3 Sawit = `Tandan Buah Kelapa Sawit Realistis.png` · 4 Orang Berjas (memegang sawit) = `Gemini_..g2lm..jpg` ·
5 Makanan = `a_high_resolution_..png` · 6 Logo = `Logo Rumah Merah Putih...png`

Ubah level/radius/skor/gambar di objek `LEVELS` pada `game.js`.
