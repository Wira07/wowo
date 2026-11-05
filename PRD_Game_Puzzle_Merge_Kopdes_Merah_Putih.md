# PRD — Game Puzzle Merge "Kopdes Merah Putih"

| | |
|---|---|
| **Versi** | 1.0 (Draft) |
| **Tanggal** | 5 November 2026 |
| **Platform** | Web (HTML5 Canvas), mobile-first, bisa dimainkan di desktop |
| **Genre** | Casual merge puzzle (drop & merge) |

---

## 1. Ringkasan

Game puzzle casual di mana pemain menjatuhkan item ke dalam sebuah wadah. Dua item **yang sama** yang bertabrakan akan **menyatu** menjadi item level berikutnya. Rantai evolusi dimulai dari orang kurus dan berakhir di **logo "KOPDES Merah Putih"**.

**Tujuan pemain:** menyusun rantai merge sampai berhasil membuat logo KOPDES Merah Putih, lalu mengejar skor setinggi mungkin tanpa membuat wadah penuh.

## 2. Tujuan & Metrik Sukses

| Tujuan | Metrik |
|---|---|
| Mudah dipahami dalam < 10 detik | Tutorial selesai oleh ≥ 90% pemain baru |
| Adiktif, mendorong main ulang | Rata-rata ≥ 3 sesi per pengguna |
| Pemain merasa ada "tujuan akhir" | ≥ 30% pemain mencapai level 6 (logo) |
| Ringan dan cepat dimuat | Load awal < 3 detik di 4G, ukuran total < 5 MB |

## 3. Target Pengguna

- Pemain casual usia 13–45 tahun, mobile browser sebagai perangkat utama.
- Audiens yang akrab dengan konteks Koperasi Desa/Kelurahan Merah Putih (cocok untuk sosialisasi atau media kampanye).

## 4. Rantai Evolusi (Core Mechanic)

| Level | Nama Item | Aset | Aturan Merge |
|---|---|---|---|
| 1 | Orang Kurus | `Gemini_Generated_Image_x9iwetx9iwetx9iw.jpg`* | Level 1 + Level 1 → Level 2 |
| 2 | Orang Ke-2 (berkemeja biru, lebih berisi) | `Gemini_Generated_Image_9kc0tl9kc0tl9kc0.jpg`* | Level 2 + Level 2 → Level 3 |
| 3 | Buah Sawit | `Gemini_Generated_Image_g2lmvrg2lmvrg2lm.jpg`* | Level 3 + Level 3 → Level 4 |
| 4 | Orang Berjas | `Gemini_Generated_Image_n3e3cxn3e3cxn3e3.jpg`* | Level 4 + Level 4 → Level 5 |
| 5 | Seporsi Makanan (food tray) | `a_high_resolution_top_down_shot_of_the_same_stainl.png` | Level 5 + Level 5 → Level 6 |
| 6 | **Logo KOPDES Merah Putih** | `Logo_Rumah_Merah_Putih_dengan_Bendera_Indonesia.png` | Level 6 + Level 6 → hilang + bonus skor besar |

\* Pemetaan nama file ke level berdasarkan isi gambar; mohon dikonfirmasi saat implementasi.

**Aturan penting:**
- Merge hanya terjadi antar item **level yang sama**. Item beda level hanya saling menumpuk/memantul.
- Item hasil merge muncul di titik tengah antara dua item yang bertabrakan.
- Level 6 adalah level tertinggi. Dua logo yang bertemu hilang dan memberi bonus (lihat bagian Skor).

## 5. Gameplay

### 5.1 Alur Satu Sesi
1. Game dimulai, wadah kosong. Item pertama yang muncul selalu **Orang Kurus (Level 1)**.
2. Pemain menggeser posisi horizontal item di atas wadah, lalu melepas (tap/klik) untuk menjatuhkannya.
3. Item jatuh dengan fisika (gravitasi, tumbukan, pantulan ringan).
4. Jika dua item sama bersentuhan → merge → animasi + suara + skor bertambah.
5. Sebuah item "berikutnya" ditampilkan sebagai preview.
6. Game berakhir jika ada item yang diam di atas **garis batas** selama > 2 detik.

### 5.2 Aturan Spawn
- Item yang bisa muncul dari atas: **Level 1 (70%) dan Level 2 (30%)**.
- 3 item pertama selalu Level 1 agar pemain paham mekaniknya.
- Level 3 ke atas hanya didapat lewat merge.

### 5.3 Kontrol
| Perangkat | Kontrol |
|---|---|
| Mobile | Geser jari untuk posisi, lepas jari untuk menjatuhkan |
| Desktop | Gerak mouse untuk posisi, klik untuk menjatuhkan; panah kiri/kanan + spasi sebagai alternatif |

### 5.4 Skor
| Kejadian | Poin |
|---|---|
| Merge menghasilkan Level 2 | 10 |
| Merge menghasilkan Level 3 | 25 |
| Merge menghasilkan Level 4 | 50 |
| Merge menghasilkan Level 5 | 100 |
| Merge menghasilkan Level 6 (logo) | 250 |
| Dua logo bertemu (hilang) | 1000 |
| Combo (merge beruntun < 1 detik) | Pengali ×1.5, ×2, ×3 |

### 5.5 Kondisi Menang & Kalah
- **Milestone menang:** pertama kali logo KOPDES Merah Putih terbentuk → layar selebrasi (confetti merah-putih), game bisa dilanjutkan (endless).
- **Kalah:** item melewati garis batas lebih dari 2 detik → layar Game Over (skor, skor tertinggi, tombol main lagi).

## 6. Spesifikasi Visual

### 6.1 Ukuran & Fisika Item
Area permainan portrait 480 × 720 px (diskalakan responsif). Bentuk collider lingkaran.

| Level | Radius collider (px) |
|---|---|
| 1 | 28 |
| 2 | 38 |
| 3 | 50 |
| 4 | 64 |
| 5 | 80 |
| 6 | 100 |

### 6.2 Persiapan Aset
- Semua aset **wajib transparan (PNG tanpa background)**. Aset karakter dan sawit saat ini berlatar hitam, dan food tray serta logo berlatar putih, jadi perlu proses *remove background*.
- Crop ke bounding box item, lalu skala sesuai radius collider (gambar sedikit lebih besar dari collider ±5–10%).
- Ekspor ke WebP/PNG, maksimal 512 px sisi terpanjang per aset.
- Warna tema UI: merah `#D7000F` dan putih, sesuai logo.

### 6.3 Layar
1. **Splash / Menu Utama** — logo KOPDES, tombol Main, tombol Cara Bermain, skor tertinggi.
2. **Layar Game** — wadah, garis batas, preview item berikutnya, skor, skor tertinggi, tombol pause/mute.
3. **Panel Evolusi** — strip kecil menampilkan 6 level secara berurutan (level yang belum dibuka berupa siluet).
4. **Game Over** — skor, rekor, level tertinggi yang dicapai, tombol main lagi dan bagikan.
5. **Layar Selebrasi** — muncul saat logo pertama kali terbentuk.

### 6.4 Efek ("Game Feel")
- Animasi *pop/squash* saat merge, partikel kecil, getar layar ringan untuk Level 5–6.
- Teks mengambang "+skor" di titik merge.
- Efek khusus (kilau + confetti merah putih) saat Level 6 terbentuk.

## 7. Audio
- Musik latar ringan (bisa dimatikan).
- SFX: jatuh, merge (nada naik sesuai level), combo, game over, kemenangan.
- Tombol mute tersedia di semua layar dan pengaturan tersimpan.

## 8. Kebutuhan Fungsional

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-01 | Item bergerak horizontal sebelum dijatuhkan | P0 |
| FR-02 | Fisika jatuh dan tumbukan antar item | P0 |
| FR-03 | Merge otomatis untuk item level sama sesuai tabel evolusi | P0 |
| FR-04 | Item pertama selalu Level 1 (Orang Kurus) | P0 |
| FR-05 | Preview item berikutnya | P0 |
| FR-06 | Skor dan skor tertinggi (disimpan lokal) | P0 |
| FR-07 | Deteksi Game Over lewat garis batas | P0 |
| FR-08 | Layar selebrasi saat logo pertama terbentuk | P1 |
| FR-09 | Panel evolusi (progres level yang pernah dicapai) | P1 |
| FR-10 | Sistem combo | P1 |
| FR-11 | SFX dan musik dengan tombol mute | P1 |
| FR-12 | Pause dan resume | P1 |
| FR-13 | Tutorial singkat saat pertama kali main | P1 |
| FR-14 | Tombol bagikan skor | P2 |
| FR-15 | Leaderboard online | P2 |

## 9. Kebutuhan Non-Fungsional
- **Performa:** 60 FPS di perangkat Android kelas menengah, maksimal ±40 item aktif bersamaan.
- **Kompatibilitas:** Chrome, Safari, Firefox versi 2 tahun terakhir; layar 360 px ke atas.
- **Offline-capable:** bisa berjalan tanpa internet setelah pertama dimuat (opsional PWA).
- **Penyimpanan:** skor tertinggi dan pengaturan audio di `localStorage`.
- **Aksesibilitas:** kontras teks memadai, ukuran tombol minimal 44 px.

## 10. Arsitektur Teknis (Usulan)
- **Stack:** HTML5 + JavaScript, rendering Canvas 2D.
- **Fisika:** Matter.js (collision & body lingkaran).
- **Struktur:** satu halaman statis (`index.html`, `game.js`, folder `assets/`), bisa di-host di server lokal/Laravel/PHP apa pun.
- **Konfigurasi data:** daftar level (nama, aset, radius, skor) di satu objek `LEVELS` agar mudah diubah.

```js
const LEVELS = [
  { id: 1, name: "Orang Kurus",  img: "assets/lvl1.png", radius: 28,  score: 0 },
  { id: 2, name: "Orang Ke-2",   img: "assets/lvl2.png", radius: 38,  score: 10 },
  { id: 3, name: "Sawit",        img: "assets/lvl3.png", radius: 50,  score: 25 },
  { id: 4, name: "Orang Berjas", img: "assets/lvl4.png", radius: 64,  score: 50 },
  { id: 5, name: "Makanan",      img: "assets/lvl5.png", radius: 80,  score: 100 },
  { id: 6, name: "Logo Kopdes",  img: "assets/lvl6.png", radius: 100, score: 250 },
];
```

## 11. Kriteria Penerimaan (Acceptance Criteria)
1. Game dimulai dengan Orang Kurus sebagai item pertama.
2. Dua Orang Kurus bertabrakan → menjadi Orang Ke-2.
3. Dua Orang Ke-2 → Sawit.
4. Dua Sawit → Orang Berjas.
5. Dua Orang Berjas → Seporsi Makanan.
6. Dua Seporsi Makanan → Logo KOPDES Merah Putih, dan layar selebrasi tampil saat pertama kali.
7. Item beda level tidak pernah merge.
8. Game Over aktif tepat ketika item melewati garis batas > 2 detik.
9. Skor tertinggi tetap tersimpan setelah halaman di-refresh.

## 12. Rencana Rilis

| Milestone | Isi |
|---|---|
| M1 — Prototype | Fisika, drop, merge 6 level dengan placeholder |
| M2 — Core Complete | Aset final, skor, game over, preview, panel evolusi |
| M3 — Polish | Efek, audio, combo, selebrasi, tutorial |
| M4 — Release | Uji perangkat, optimasi, deploy |

## 13. Risiko

| Risiko | Mitigasi |
|---|---|
| Aset berlatar hitam/putih terlihat kotor di dalam game | Remove background di awal; uji di background UI final |
| Bentuk aset tidak bulat sehingga collider terasa janggal | Pakai collider lingkaran sedikit lebih kecil dari gambar |
| Karakter 3D yang mirip tokoh nyata dapat sensitif secara hak citra/politik bila dipublikasikan | Tinjau ulang aset sebelum rilis publik; siapkan versi karakter generik |
| Performa turun di HP lama | Batasi jumlah item, sprite ringan, fixed timestep |

## 14. Pertanyaan Terbuka
1. Mekanik utama: **drop & jatuh dengan fisika** (seperti Suika) atau **grid geser** (seperti 2048)? PRD ini memakai drop & fisika.
2. Apakah game perlu leaderboard online, atau cukup skor lokal?
3. Apakah ada teks/pesan edukasi tentang Kopdes Merah Putih yang ingin ditampilkan di layar selebrasi?
4. Konfirmasi pemetaan aset ke level 1–4 (lihat catatan tabel di bagian 4).
