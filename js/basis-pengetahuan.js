/*
 * KOMPAK — Basis Pengetahuan
 * ---------------------------------------------------------------
 * File ini HANYA berisi pengetahuan pakar (data), tidak berisi logika.
 * Jika aturan berubah (misalnya setelah wawancara laboran), cukup ubah
 * file ini; mesin inferensi tidak perlu disentuh.
 *
 * Isi:
 *   1. indikator  : 10 fakta masukan beserta pilihan nilainya
 *   2. kesimpulan : 4 status kelayakan + prioritas resolusi konflik
 *   3. aturan     : 12 aturan IF–THEN
 *   4. sumber     : sumber pengetahuan
 *
 * Format kondisi aturan (bisa bersarang):
 *   { fakta: "I1", nilai: "gagal" }      -> I1 = gagal
 *   { semua: [kondisi, kondisi, ...] }   -> AND
 *   { salahSatu: [kondisi, kondisi, ...] } -> OR
 */
(function (root) {
  "use strict";

  // 1. INDIKATOR ------------------------------------------------------
  // Pilihan pertama pada setiap indikator adalah kondisi NORMAL.
  var indikator = [
    { kode: "I1", nama: "Proses booting", petunjuk: "Nyalakan PC dan hitung waktu sampai desktop siap.",
      pilihan: [
        { nilai: "normal", label: "Normal" },
        { nilai: "lambat", label: "Lambat (> 3 menit)" },
        { nilai: "gagal", label: "Gagal booting" } ] },
    { kode: "I2", nama: "Suhu dan kipas", petunjuk: "Raba casing dan dengarkan suara kipas.",
      pilihan: [
        { nilai: "normal", label: "Normal" },
        { nilai: "panas", label: "Panas atau berisik" },
        { nilai: "mati", label: "Mati mendadak" } ] },
    { kode: "I3", nama: "Monitor", petunjuk: "Perhatikan tampilan layar.",
      pilihan: [
        { nilai: "normal", label: "Normal" },
        { nilai: "bergaris", label: "Bergaris atau berkedip" },
        { nilai: "tidak_tampil", label: "Tidak tampil" } ] },
    { kode: "I4", nama: "Keyboard dan mouse", petunjuk: "Coba ketik dan gerakkan kursor.",
      pilihan: [
        { nilai: "berfungsi", label: "Berfungsi" },
        { nilai: "sebagian", label: "Sebagian bermasalah" },
        { nilai: "tidak_berfungsi", label: "Tidak berfungsi" } ] },
    { kode: "I5", nama: "Koneksi LAN", petunjuk: "Buka situs atau ping ke server lab.",
      pilihan: [
        { nilai: "terhubung", label: "Terhubung" },
        { nilai: "putus_sambung", label: "Putus-sambung" },
        { nilai: "tidak_terhubung", label: "Tidak terhubung" } ] },
    { kode: "I6", nama: "Kapasitas RAM", petunjuk: "Bandingkan RAM terpasang dengan kebutuhan aplikasi praktikum.",
      pilihan: [
        { nilai: "memenuhi", label: "Memenuhi" },
        { nilai: "kurang", label: "Di bawah kebutuhan praktikum" } ] },
    { kode: "I7", nama: "Ruang kosong drive sistem", petunjuk: "Lihat sisa ruang drive C: di File Explorer.",
      pilihan: [
        { nilai: "cukup", label: "Cukup (≥ 20 GB)" },
        { nilai: "kurang", label: "Kurang dari 20 GB" } ] },
    { kode: "I8", nama: "Kesehatan penyimpanan", petunjuk: "Lihat status di CrystalDiskInfo.",
      pilihan: [
        { nilai: "baik", label: "Baik" },
        { nilai: "peringatan", label: "Peringatan" },
        { nilai: "buruk", label: "Buruk" } ] },
    { kode: "I9", nama: "Aplikasi praktikum", petunjuk: "Buka aplikasi yang dipakai pada praktikum.",
      pilihan: [
        { nilai: "normal", label: "Berjalan normal" },
        { nilai: "belum_terpasang", label: "Belum terpasang" },
        { nilai: "error", label: "Error saat dibuka" } ] },
    { kode: "I10", nama: "Antivirus", petunjuk: "Jalankan pemindaian cepat.",
      pilihan: [
        { nilai: "bersih", label: "Bersih" },
        { nilai: "terdeteksi", label: "Terdeteksi ancaman" } ] }
  ];

  // 2. KESIMPULAN -----------------------------------------------------
  // prioritas: makin besar makin berat. Dipakai untuk resolusi konflik
  // (K3 > K4 > K2 > K1).
  var kesimpulan = {
    K1: { kode: "K1", nama: "Layak pakai", prioritas: 1, warna: "hijau",
          deskripsi: "Komputer siap dipakai untuk praktikum.",
          tindakanUmum: ["Komputer boleh langsung dipakai praktikan."] },
    K2: { kode: "K2", nama: "Layak dengan catatan", prioritas: 2, warna: "kuning",
          deskripsi: "Komputer masih boleh dipakai, tetapi perlu perawatan ringan.",
          tindakanUmum: ["Boleh dipakai, catat di buku log lab.", "Jadwalkan perawatan ringan setelah praktikum."] },
    K4: { kode: "K4", nama: "Tidak layak, usulkan peremajaan", prioritas: 3, warna: "ungu",
          deskripsi: "Spesifikasi tidak lagi memadai untuk praktikum.",
          tindakanUmum: ["Jangan dipakai untuk praktikum berat.", "Ajukan usulan peremajaan ke kepala lab (tambah RAM, ganti ke SSD, atau unit baru)."] },
    K3: { kode: "K3", nama: "Tidak layak sementara", prioritas: 4, warna: "merah",
          deskripsi: "Ada kerusakan atau gangguan yang harus ditangani sebelum dipakai.",
          tindakanUmum: ["Jangan dipakai praktikum; pindahkan praktikan ke PC lain.", "Pasang label \"Rusak\" dan laporkan ke teknisi."] }
  };

  // Hasil khusus jika tidak ada aturan yang cocok.
  var belumDisimpulkan = {
    kode: "-", nama: "Belum dapat disimpulkan", prioritas: 0, warna: "abu",
    deskripsi: "Kombinasi kondisi ini belum tercakup oleh aturan mana pun.",
    tindakanUmum: ["Lakukan pemeriksaan manual oleh teknisi.", "Catat kombinasi ini sebagai bahan penambahan aturan baru."]
  };

  // 3. ATURAN ---------------------------------------------------------
  function f(kode, nilai) { return { fakta: kode, nilai: nilai }; }

  var aturan = [
    { id: "R1", maka: "K3", kondisi: f("I1", "gagal"),
      alasan: "PC gagal booting sehingga tidak dapat dipakai sama sekali.",
      tindakan: ["Periksa kabel daya, RAM, dan drive boot."] },
    { id: "R2", maka: "K3", kondisi: f("I2", "mati"),
      alasan: "PC mati mendadak, tanda panas berlebih atau catu daya bermasalah.",
      tindakan: ["Bersihkan kipas dan heatsink, periksa catu daya (PSU)."] },
    { id: "R3", maka: "K3", kondisi: { salahSatu: [f("I3", "tidak_tampil"), f("I4", "tidak_berfungsi")] },
      alasan: "Monitor atau perangkat masukan tidak berfungsi.",
      tindakan: ["Periksa kabel monitor/keyboard/mouse, ganti perangkat cadangan bila ada."] },
    { id: "R4", maka: "K3", kondisi: f("I5", "tidak_terhubung"),
      alasan: "PC tidak terhubung ke jaringan lab.",
      tindakan: ["Periksa kabel LAN, port switch, dan pengaturan IP."] },
    { id: "R5", maka: "K3", kondisi: f("I8", "buruk"),
      alasan: "Kesehatan penyimpanan buruk, data berisiko hilang.",
      tindakan: ["Cadangkan data penting dan ganti drive penyimpanan."] },
    { id: "R6", maka: "K3", kondisi: { salahSatu: [f("I9", "error"), f("I9", "belum_terpasang")] },
      alasan: "Aplikasi praktikum belum terpasang atau error.",
      tindakan: ["Pasang ulang atau perbaiki aplikasi praktikum."] },
    { id: "R7", maka: "K3", kondisi: f("I10", "terdeteksi"),
      alasan: "Antivirus mendeteksi ancaman.",
      tindakan: ["Putuskan dari jaringan, karantina ancaman, lalu pindai ulang."] },
    { id: "R8", maka: "K4", kondisi: { semua: [ { salahSatu: [f("I6", "kurang"), f("I8", "peringatan")] }, f("I1", "lambat") ] },
      alasan: "Spesifikasi kurang (RAM/penyimpanan) dan sudah berdampak pada booting yang lambat.",
      tindakan: ["Usulkan tambah RAM atau ganti HDD ke SSD."] },
    { id: "R9", maka: "K2", kondisi: { semua: [ { salahSatu: [f("I6", "kurang"), f("I8", "peringatan")] }, f("I1", "normal") ] },
      alasan: "Spesifikasi mulai kurang, tetapi kinerja booting masih normal.",
      tindakan: ["Pantau kinerja; masukkan ke daftar calon peremajaan."] },
    { id: "R10", maka: "K2", kondisi: { salahSatu: [f("I7", "kurang"), f("I2", "panas")] },
      alasan: "Ruang drive sistem menipis atau PC panas/berisik.",
      tindakan: ["Hapus berkas sementara (Disk Cleanup) dan bersihkan debu kipas."] },
    { id: "R11", maka: "K2", kondisi: { salahSatu: [f("I3", "bergaris"), f("I4", "sebagian"), f("I5", "putus_sambung")] },
      alasan: "Ada gangguan ringan pada monitor, perangkat masukan, atau jaringan.",
      tindakan: ["Rapikan kabel/konektor dan catat perangkat yang perlu diganti."] }
  ];

  // R12 dibangun otomatis: semua indikator bernilai normal (pilihan pertama).
  aturan.push({
    id: "R12", maka: "K1",
    kondisi: { semua: indikator.map(function (i) { return f(i.kode, i.pilihan[0].nilai); }) },
    alasan: "Semua indikator berada pada kondisi normal.",
    tindakan: []
  });

  // 4. SUMBER PENGETAHUAN --------------------------------------------
  var sumber = [
    "Pengalaman pemeriksaan komputer laboratorium dan wawancara dengan laboran/teknisi lab.",
    "Afdal, dkk. (2026). Pendas: Jurnal Ilmiah Pendidikan Dasar, 11(01), 135–148. doi:10.23969/jp.v11i01.42815",
    "Anita, dkk. (2026). JATI (Jurnal Mahasiswa Teknik Informatika), 10(2), 2281–2286. doi:10.36040/jati.v10i2.17226",
    "Firdaus & Asyiah (2026). Jurnal Ilmu Komputer, 4(2), 246–262.",
    "Saputra, dkk. (2022). Jurnal JTIK, 6(2), 234–242. doi:10.35870/jtik.v6i2.416"
  ];

  var KB = { indikator: indikator, kesimpulan: kesimpulan, belumDisimpulkan: belumDisimpulkan, aturan: aturan, sumber: sumber };

  if (typeof module !== "undefined" && module.exports) { module.exports = KB; }
  else { root.KOMPAK_KB = KB; }
})(this);
