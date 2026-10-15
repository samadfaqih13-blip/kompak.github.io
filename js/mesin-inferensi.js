/*
 * KOMPAK — Mesin Inferensi (Forward Chaining)
 * ---------------------------------------------------------------
 * Alur:
 *   1. validasi()   : pastikan semua indikator terisi dan nilainya sah.
 *   2. inferensi()  : forward chaining — cocokkan fakta di memori kerja
 *                     dengan setiap aturan; aturan yang cocok "dipicu"
 *                     dan kesimpulannya ditambahkan ke memori kerja.
 *                     Diulang sampai tidak ada aturan baru yang terpicu.
 *   3. Resolusi konflik: jika beberapa aturan terpicu dengan kesimpulan
 *                     berbeda, ambil kesimpulan dengan prioritas tertinggi
 *                     (K3 > K4 > K2 > K1).
 *   4. Jika tidak ada aturan terpicu -> "Belum dapat disimpulkan".
 */
(function (root) {
  "use strict";

  // ---------- 1. Validasi masukan ----------
  function validasi(fakta, kb) {
    var galat = [];
    fakta = fakta || {};
    kb.indikator.forEach(function (ind) {
      var v = fakta[ind.kode];
      if (v === undefined || v === null || v === "") {
        galat.push({ kode: ind.kode, pesan: ind.kode + " (" + ind.nama + ") belum diisi." });
        return;
      }
      var sah = ind.pilihan.some(function (p) { return p.nilai === v; });
      if (!sah) {
        galat.push({ kode: ind.kode, pesan: ind.kode + " (" + ind.nama + "): nilai \"" + v + "\" tidak dikenal. Masukan ditolak." });
      }
    });
    return { valid: galat.length === 0, galat: galat };
  }

  // ---------- Pencocokan kondisi (rekursif) ----------
  function cocok(kondisi, memori) {
    if (kondisi.semua) return kondisi.semua.every(function (k) { return cocok(k, memori); });
    if (kondisi.salahSatu) return kondisi.salahSatu.some(function (k) { return cocok(k, memori); });
    return memori[kondisi.fakta] === kondisi.nilai;
  }

  // ---------- Kondisi -> teks "I1 = Gagal booting" ----------
  function teksKondisi(kondisi, kb, tingkat) {
    tingkat = tingkat || 0;
    if (kondisi.semua || kondisi.salahSatu) {
      var daftar = kondisi.semua || kondisi.salahSatu;
      var sambung = kondisi.semua ? " AND " : " OR ";
      var isi = daftar.map(function (k) { return teksKondisi(k, kb, tingkat + 1); }).join(sambung);
      return tingkat > 0 ? "(" + isi + ")" : isi;
    }
    var ind = cariIndikator(kb, kondisi.fakta);
    var p = ind ? ind.pilihan.filter(function (x) { return x.nilai === kondisi.nilai; })[0] : null;
    return kondisi.fakta + " = " + (p ? p.label : kondisi.nilai);
  }

  function teksAturan(aturan, kb) {
    if (aturan.id === "R12") return "IF semua indikator normal THEN " + aturan.maka;
    return "IF " + teksKondisi(aturan.kondisi, kb) + " THEN " + aturan.maka;
  }

  function cariIndikator(kb, kode) {
    return kb.indikator.filter(function (i) { return i.kode === kode; })[0];
  }

  // ---------- 2. Forward chaining ----------
  function inferensi(fakta, kb) {
    var cek = validasi(fakta, kb);
    if (!cek.valid) {
      return { valid: false, galat: cek.galat };
    }

    // Memori kerja diisi fakta awal.
    var memori = {};
    Object.keys(fakta).forEach(function (k) { memori[k] = fakta[k]; });

    var terpicu = [];        // aturan yang terpicu (urut sesuai waktu terpicu)
    var sudah = {};          // penanda aturan yang sudah dipicu
    var jejak = [];          // catatan langkah inferensi untuk penjelasan
    var siklus = 0, adaBaru = true;

    while (adaBaru) {
      adaBaru = false;
      siklus++;
      kb.aturan.forEach(function (r) {
        if (sudah[r.id]) return;
        var hasil = cocok(r.kondisi, memori);
        if (siklus === 1) jejak.push({ siklus: siklus, aturan: r.id, cocok: hasil });
        if (hasil) {
          sudah[r.id] = true;
          terpicu.push(r);
          memori["kesimpulan_" + r.id] = r.maka;   // fakta baru di memori kerja
          adaBaru = true;
        }
      });
    }

    // ---------- 4. Tidak ada aturan cocok ----------
    if (terpicu.length === 0) {
      return {
        valid: true, status: kb.belumDisimpulkan, terpicu: [], pemenang: [],
        tindakan: kb.belumDisimpulkan.tindakanUmum.slice(), jejak: jejak, siklus: siklus, konflik: false
      };
    }

    // ---------- 3. Resolusi konflik ----------
    var status = terpicu
      .map(function (r) { return kb.kesimpulan[r.maka]; })
      .reduce(function (a, b) { return b.prioritas > a.prioritas ? b : a; });

    var pemenang = terpicu.filter(function (r) { return r.maka === status.kode; });
    var kalah = terpicu.filter(function (r) { return r.maka !== status.kode; });

    // Tindakan = tindakan umum status + tindakan spesifik semua aturan terpicu.
    var tindakan = status.tindakanUmum.slice();
    terpicu.forEach(function (r) {
      r.tindakan.forEach(function (t) { if (tindakan.indexOf(t) < 0) tindakan.push(t); });
    });

    return {
      valid: true, status: status, terpicu: terpicu, pemenang: pemenang, kalah: kalah,
      konflik: kalah.length > 0, tindakan: tindakan, jejak: jejak, siklus: siklus
    };
  }

  var Mesin = { validasi: validasi, inferensi: inferensi, cocok: cocok, teksAturan: teksAturan, teksKondisi: teksKondisi };

  if (typeof module !== "undefined" && module.exports) { module.exports = Mesin; }
  else { root.KOMPAK_MESIN = Mesin; }
})(this);
