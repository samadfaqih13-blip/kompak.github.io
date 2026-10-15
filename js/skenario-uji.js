/*
 * KOMPAK — 10 Skenario Uji
 * ---------------------------------------------------------------
 * Setiap skenario: indikator yang tidak disebut bernilai NORMAL.
 * harapan.status   : kode kesimpulan yang diharapkan ("-" = belum dapat disimpulkan)
 * harapan.aturan   : aturan yang diharapkan menjadi dasar kesimpulan
 * harapan.valid    : false jika masukan seharusnya ditolak
 */
(function (root) {
  "use strict";

  var NORMAL = {
    I1: "normal", I2: "normal", I3: "normal", I4: "berfungsi", I5: "terhubung",
    I6: "memenuhi", I7: "cukup", I8: "baik", I9: "normal", I10: "bersih"
  };

  function dengan(ubah) {
    var hasil = {};
    Object.keys(NORMAL).forEach(function (k) { hasil[k] = NORMAL[k]; });
    Object.keys(ubah || {}).forEach(function (k) {
      if (ubah[k] === undefined) delete hasil[k]; else hasil[k] = ubah[k];
    });
    return hasil;
  }

  var skenario = [
    { id: "S1", jenis: "Umum", uraian: "Semua indikator normal",
      fakta: dengan({}), harapan: { valid: true, status: "K1", aturan: ["R12"] } },
    { id: "S2", jenis: "Umum", uraian: "I7 = Kurang dari 20 GB",
      fakta: dengan({ I7: "kurang" }), harapan: { valid: true, status: "K2", aturan: ["R10"] } },
    { id: "S3", jenis: "Umum", uraian: "I1 = Gagal booting",
      fakta: dengan({ I1: "gagal" }), harapan: { valid: true, status: "K3", aturan: ["R1"] } },
    { id: "S4", jenis: "Umum", uraian: "I9 = Belum terpasang",
      fakta: dengan({ I9: "belum_terpasang" }), harapan: { valid: true, status: "K3", aturan: ["R6"] } },
    { id: "S5", jenis: "Umum", uraian: "I6 = Di bawah kebutuhan, I1 = Lambat",
      fakta: dengan({ I6: "kurang", I1: "lambat" }), harapan: { valid: true, status: "K4", aturan: ["R8"] } },
    { id: "S6", jenis: "Batas", uraian: "I6 = Di bawah, I8 = Peringatan, I1 = Normal",
      fakta: dengan({ I6: "kurang", I8: "peringatan" }), harapan: { valid: true, status: "K2", aturan: ["R9"] } },
    { id: "S7", jenis: "Konflik", uraian: "I6 = Di bawah, I1 = Lambat, I10 = Terdeteksi",
      fakta: dengan({ I6: "kurang", I1: "lambat", I10: "terdeteksi" }), harapan: { valid: true, status: "K3", aturan: ["R7"] } },
    { id: "S8", jenis: "Tanpa aturan", uraian: "I1 = Lambat saja",
      fakta: dengan({ I1: "lambat" }), harapan: { valid: true, status: "-", aturan: [] } },
    { id: "S9", jenis: "Tidak valid", uraian: "I5 tidak diisi (kosong)",
      fakta: dengan({ I5: undefined }), harapan: { valid: false } },
    { id: "S10", jenis: "Tidak valid", uraian: "I1 = \"rusak_parah\" (di luar pilihan)",
      fakta: dengan({ I1: "rusak_parah" }), harapan: { valid: false } }
  ];

  // Jalankan semua skenario dan bandingkan dengan harapan.
  function jalankan(kb, mesin) {
    return skenario.map(function (s) {
      var h = mesin.inferensi(s.fakta, kb);
      var lulus, aktual;
      if (!s.harapan.valid) {
        lulus = h.valid === false;
        aktual = h.valid ? "Diterima (" + h.status.kode + ")" : "Ditolak: " + h.galat.map(function (g) { return g.pesan; }).join(" ");
      } else if (!h.valid) {
        lulus = false;
        aktual = "Ditolak: " + h.galat[0].pesan;
      } else {
        var idPemenang = h.pemenang.map(function (r) { return r.id; });
        var aturanSama = s.harapan.aturan.every(function (a) { return idPemenang.indexOf(a) >= 0; });
        lulus = h.status.kode === s.harapan.status && aturanSama;
        aktual = (h.status.kode === "-" ? "Belum dapat disimpulkan" : h.status.kode + " " + h.status.nama) +
          (h.terpicu.length ? " (" + h.terpicu.map(function (r) { return r.id; }).join(", ") + ")" : "");
      }
      var diharapkan = !s.harapan.valid ? "Masukan ditolak / pesan validasi"
        : (s.harapan.status === "-" ? "Belum dapat disimpulkan" : s.harapan.status + " (" + s.harapan.aturan.join(", ") + ")");
      return { id: s.id, jenis: s.jenis, uraian: s.uraian, diharapkan: diharapkan, aktual: aktual, lulus: lulus };
    });
  }

  var Uji = { NORMAL: NORMAL, skenario: skenario, jalankan: jalankan };

  if (typeof module !== "undefined" && module.exports) { module.exports = Uji; }
  else { root.KOMPAK_UJI = Uji; }
})(this);
