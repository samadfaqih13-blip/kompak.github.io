# KOMPAK — Komputer Praktikum Analisis Kelayakan

Sistem pakar berbasis web untuk menentukan **kelayakan komputer laboratorium sebelum praktikum**.
Asisten lab mengisi 10 indikator hasil pengamatan; sistem menarik kesimpulan dengan **forward chaining**
atas 12 aturan IF–THEN, lalu menampilkan status, aturan pendukung, dan tindakan yang disarankan.

Tugas Proyek Kecerdasan Buatan 2026 · Teknik Komputer UNM.

## Cara menjalankan

Tidak perlu instalasi, server, database, atau koneksi internet.

1. Buka folder `kompak`.
2. Klik dua kali `index.html` (terbuka di Chrome / Edge / Firefox).
3. Isi 10 indikator, lalu tekan **Periksa kelayakan**.
   Untuk demo cepat, pilih salah satu skenario di menu **Isi cepat dari skenario uji**.

Alur untuk memeriksa banyak PC: setelah hasil muncul, tekan **Periksa PC berikutnya** (nomor PC bertambah otomatis).
Semua pemeriksaan tercatat di tabel **Riwayat** dan bisa diekspor ke CSV (pemisah titik koma, cocok untuk Excel berlokal Indonesia).
Menu **Isi cepat dari skenario uji** ada di bagian *Mode demo* yang dilipat.

Menjalankan 10 skenario uji dari terminal (opsional, perlu [Node.js](https://nodejs.org)):

```
node uji-node.js
```

Pengujian yang sama juga bisa dilihat di tab **Pengujian** pada aplikasi.

## Dependensi

| Komponen | Keterangan |
|---|---|
| Peramban web modern | Chrome, Edge, atau Firefox |
| Node.js (opsional) | Hanya untuk `uji-node.js` |
| Google Fonts (opsional) | Jika offline, aplikasi memakai font bawaan sistem |

Tidak ada pustaka/framework pihak ketiga; seluruh logika ditulis dengan JavaScript murni.

## Struktur folder

```
kompak/
├── index.html                 Halaman aplikasi (3 tab: Periksa PC, Basis pengetahuan, Pengujian)
├── css/style.css              Tampilan
├── js/basis-pengetahuan.js    BASIS PENGETAHUAN: indikator, kesimpulan, 12 aturan, sumber
├── js/mesin-inferensi.js      MESIN INFERENSI: validasi, forward chaining, resolusi konflik
├── js/skenario-uji.js         10 skenario uji + fungsi pembanding hasil
├── js/app.js                  Antarmuka (menghubungkan formulir dengan mesin inferensi)
├── uji-node.js                Menjalankan pengujian dari terminal
└── README.md
```

Basis pengetahuan dipisah dari mesin inferensi: untuk menambah atau mengubah aturan, cukup sunting
`js/basis-pengetahuan.js`.

## Metode: forward chaining

1. **Validasi** — semua 10 indikator wajib terisi dan nilainya harus salah satu pilihan yang sah.
   Jika tidak, masukan ditolak dan indikator yang bermasalah ditandai merah.
2. **Pencocokan** — fakta dimasukkan ke memori kerja; setiap aturan dicek kondisinya (mendukung AND/OR bersarang).
3. **Pemicuan** — aturan yang cocok dipicu dan kesimpulannya ditambahkan ke memori kerja.
   Siklus diulang sampai tidak ada aturan baru yang terpicu.
4. **Resolusi konflik** — jika beberapa aturan terpicu, dipilih status terberat: **K3 › K4 › K2 › K1**.
5. **Tidak ada aturan cocok** — hasil "Belum dapat disimpulkan", disarankan pemeriksaan manual oleh teknisi.
6. **Penjelasan** — aplikasi menampilkan aturan pendukung, aturan yang kalah prioritas, tindakan,
   dan jejak pencocokan seluruh aturan.

## Basis pengetahuan

### Indikator (masukan)

| Kode | Indikator | Pilihan (pertama = normal) |
|---|---|---|
| I1 | Proses booting | Normal / Lambat (> 3 menit) / Gagal booting |
| I2 | Suhu dan kipas | Normal / Panas atau berisik / Mati mendadak |
| I3 | Monitor | Normal / Bergaris atau berkedip / Tidak tampil |
| I4 | Keyboard dan mouse | Berfungsi / Sebagian bermasalah / Tidak berfungsi |
| I5 | Koneksi LAN | Terhubung / Putus-sambung / Tidak terhubung |
| I6 | Kapasitas RAM | Memenuhi / Di bawah kebutuhan praktikum |
| I7 | Ruang kosong drive sistem | Cukup (≥ 20 GB) / Kurang dari 20 GB |
| I8 | Kesehatan penyimpanan (CrystalDiskInfo) | Baik / Peringatan / Buruk |
| I9 | Aplikasi praktikum | Berjalan normal / Belum terpasang / Error saat dibuka |
| I10 | Antivirus | Bersih / Terdeteksi ancaman |

### Kesimpulan (keluaran)

| Kode | Kesimpulan | Prioritas |
|---|---|---|
| K1 | Layak pakai | 1 |
| K2 | Layak dengan catatan (perawatan ringan) | 2 |
| K4 | Tidak layak, usulkan peremajaan | 3 |
| K3 | Tidak layak sementara (perbaiki / laporkan teknisi) | 4 (terberat) |
| – | Belum dapat disimpulkan | — |

### Aturan

| Aturan | IF | THEN |
|---|---|---|
| R1 | I1 = Gagal | K3 |
| R2 | I2 = Mati mendadak | K3 |
| R3 | I3 = Tidak tampil OR I4 = Tidak berfungsi | K3 |
| R4 | I5 = Tidak terhubung | K3 |
| R5 | I8 = Buruk | K3 |
| R6 | I9 = Error OR I9 = Belum terpasang | K3 |
| R7 | I10 = Terdeteksi | K3 |
| R8 | (I6 = Di bawah OR I8 = Peringatan) AND I1 = Lambat | K4 |
| R9 | (I6 = Di bawah OR I8 = Peringatan) AND I1 = Normal | K2 |
| R10 | I7 = Kurang dari 20 GB OR I2 = Panas/berisik | K2 |
| R11 | I3 = Bergaris OR I4 = Sebagian OR I5 = Putus-sambung | K2 |
| R12 | Semua indikator normal | K1 |

### Sumber pengetahuan

- Pengalaman pemeriksaan komputer laboratorium dan wawancara dengan laboran/teknisi lab.
- Afdal, dkk. (2026). *Pendas: Jurnal Ilmiah Pendidikan Dasar*, 11(01), 135–148. doi:10.23969/jp.v11i01.42815
- Anita, dkk. (2026). *JATI*, 10(2), 2281–2286. doi:10.36040/jati.v10i2.17226
- Firdaus & Asyiah (2026). *Jurnal Ilmu Komputer*, 4(2), 246–262.
- Saputra, dkk. (2022). *Jurnal JTIK*, 6(2), 234–242. doi:10.35870/jtik.v6i2.416

## Hasil pengujian

| No | Jenis | Masukan (lainnya normal) | Diharapkan | Hasil sistem | Status |
|---|---|---|---|---|---|
| S1 | Umum | Semua normal | K1 (R12) | K1 (R12) | Sesuai |
| S2 | Umum | I7 = Kurang dari 20 GB | K2 (R10) | K2 (R10) | Sesuai |
| S3 | Umum | I1 = Gagal | K3 (R1) | K3 (R1) | Sesuai |
| S4 | Umum | I9 = Belum terpasang | K3 (R6) | K3 (R6) | Sesuai |
| S5 | Umum | I6 = Di bawah, I1 = Lambat | K4 (R8) | K4 (R8) | Sesuai |
| S6 | Batas | I6 = Di bawah, I8 = Peringatan, I1 = Normal | K2 (R9) | K2 (R9) | Sesuai |
| S7 | Konflik | I6 = Di bawah, I1 = Lambat, I10 = Terdeteksi | K3 (R7) | K3 (R7 menang atas R8) | Sesuai |
| S8 | Tanpa aturan | I1 = Lambat saja | Belum dapat disimpulkan | Belum dapat disimpulkan | Sesuai |
| S9 | Tidak valid | I5 kosong | Pesan validasi | Ditolak: I5 belum diisi | Sesuai |
| S10 | Tidak valid | I1 = "rusak_parah" | Masukan ditolak | Ditolak: nilai tidak dikenal | Sesuai |

Kesesuaian: **10/10 (100%)** terhadap hasil yang diharapkan pada skenario di atas.
Kesimpulan ini hanya berlaku untuk skenario yang diuji.

## Keterbatasan

- Masukan berupa kategori hasil pengamatan; ketepatan bergantung pada ketelitian asisten saat mengamati.
- Kombinasi yang tidak tercakup (misalnya booting lambat tanpa sebab yang tercatat) belum bisa disimpulkan.
- Riwayat pemeriksaan hanya disimpan di memori selama halaman terbuka (tanpa database); gunakan **Ekspor CSV** untuk menyimpannya. Hasil bisa dicetak lewat tombol **Cetak hasil**.
- Objek terbatas pada PC desktop laboratorium.

## Anggota kelompok

| Nama | NIM | Kontribusi |
|---|---|---|
| Muhammad Faisal Sam | | |
| A. Abd. Samad Faqih H | | |
| Khaeril | 250210500006 | |
