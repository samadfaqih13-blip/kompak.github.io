/*
 * =============================================================================
 * KOMPAK — Antarmuka Pengguna & Logika Tampilan (UI/UX Controller)
 * Menghubungkan formulir observasi laboratorium dengan mesin inferensi
 * forward chaining dan menyajikan hasil diagnosis secara transparan (Explainable AI).
 * =============================================================================
 */
(function () {
  "use strict";

  var KB = window.KOMPAK_KB;
  var MESIN = window.KOMPAK_MESIN;
  var UJI = window.KOMPAK_UJI;

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Toast Notification System
  function showToast(pesan) {
    var t = $("#toast-notice");
    if (!t) return;
    var teksEl = t.querySelector(".toast-text");
    if (teksEl) teksEl.textContent = pesan;
    t.classList.add("show");
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(function () {
      t.classList.remove("show");
    }, 2800);
  }

  // Simbol per status untuk aksesibilitas dan cetak
  var IKON = { K1: "✓", K2: "!", K4: "↻", K3: "✕", "-": "?" };

  function labelStatus(s) {
    return '<span class="label ' + s.warna + '"><span aria-hidden="true">' + (IKON[s.kode] || "") + "</span> " +
      (s.kode === "-" ? "–" : s.kode) + "</span>";
  }

  function kurangiGerak() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function gulirKe(el, blok) {
    if (!el) return;
    el.scrollIntoView({ behavior: kurangiGerak() ? "auto" : "smooth", block: blok || "start" });
  }

  function waktuTampil(d) {
    return d.toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function dua(n) { return (n < 10 ? "0" : "") + n; }
  function waktuCsv(d) {
    return d.getFullYear() + "-" + dua(d.getMonth() + 1) + "-" + dua(d.getDate()) + " " + dua(d.getHours()) + ":" + dua(d.getMinutes());
  }

  // Tabel generik
  function tabel(kolom, baris, tanpaResponsif) {
    return '<div class="gulung"><table' + (tanpaResponsif ? "" : ' class="responsif"') + "><thead><tr>" +
      kolom.map(function (k) { return '<th scope="col">' + esc(k) + "</th>"; }).join("") +
      "</tr></thead><tbody>" +
      baris.map(function (b) {
        return "<tr>" + b.map(function (c, i) { return '<td data-label="' + esc(kolom[i]) + '"><span>' + c + "</span></td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  // Nilai yang muncul pada aturan K3 diberi warna merah pada tombol pilihan
  var nilaiParah = {};
  KB.aturan.filter(function (r) { return r.maka === "K3"; }).forEach(function (r) {
    (function kumpul(k) {
      if (k.semua || k.salahSatu) (k.semua || k.salahSatu).forEach(kumpul);
      else nilaiParah[k.fakta + ":" + k.nilai] = true;
    })(r.kondisi);
  });

  // ---------- Navigasi Tab Modern ----------
  var tautanTab = $$("[data-tab]");
  var menuTab = tautanTab.filter(function (x) { return x.closest(".menu-tab"); });

  function aktifkanTab(nama) {
    var targetLink = menuTab.filter(function (x) { return x.dataset.tab === nama; })[0];
    if (!targetLink) return;

    menuTab.forEach(function (x) {
      var on = x === targetLink;
      x.classList.toggle("aktif", on);
      if (x.closest("li")) x.closest("li").classList.toggle("menuitem-active", on);
      if (on) x.setAttribute("aria-current", "page"); else x.removeAttribute("aria-current");
    });

    $$(".panel-tab").forEach(function (p) {
      p.classList.toggle("aktif", p.id === "tab-" + nama);
    });

    var judul = targetLink.textContent.trim();
    if ($("#judul-halaman")) $("#judul-halaman").textContent = judul;
    if ($("#remah-halaman")) $("#remah-halaman").textContent = judul;
    document.title = judul + " · KOMPAK";

    if (nama === "pengujian") tampilkanPengujian();
  }

  tautanTab.forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      aktifkanTab(b.dataset.tab);
      window.scrollTo({ top: 0, behavior: kurangiGerak() ? "auto" : "smooth" });
      var utama = $("#utama");
      if (utama) utama.focus({ preventScroll: true });
    });
  });

  // Expose retest function
  window.KOMPAK_APP_RETEST = function () {
    tampilkanPengujian();
    showToast("Pengujian 10 skenario selesai dijalankan.");
  };

  // ---------- Pengelompokan Indikator (Cognitive Chunking) ----------
  var kategoriList = [
    {
      nama: "Fase 1: Perangkat Keras & Booting",
      ikon: "ri-computer-line",
      deskripsi: "Pemeriksaan fisik saat komputer dihidupkan, suhu casing, kipas pendingin, dan periferal input/output.",
      kodes: ["I1", "I2", "I3", "I4"]
    },
    {
      nama: "Fase 2: Performa & Media Penyimpanan",
      ikon: "ri-hard-drive-2-line",
      deskripsi: "Evaluasi kecukupan memori RAM, sisa kapasitas partisi sistem C:, dan kesehatan S.M.A.R.T drive.",
      kodes: ["I6", "I7", "I8"]
    },
    {
      nama: "Fase 3: Jaringan, Software & Keamanan",
      ikon: "ri-shield-check-line",
      deskripsi: "Konektivitas kabel LAN ke server lab, ketersediaan software praktikum, dan proteksi malware.",
      kodes: ["I5", "I9", "I10"]
    }
  ];

  var wadah = $("#daftar-indikator");
  if (wadah) {
    wadah.innerHTML = "";

    kategoriList.forEach(function (kat, katIdx) {
      var katSection = document.createElement("section");
      katSection.className = "category-section";
      katSection.setAttribute("aria-label", kat.nama);

      var katHeader = document.createElement("div");
      katHeader.className = "category-header";
      katHeader.innerHTML =
        '<div class="category-title-wrap">' +
          '<div class="category-icon-box"><i class="' + kat.ikon + '"></i></div>' +
          '<div><h3 class="category-name">' + esc(kat.nama) + '</h3>' +
          '<p class="category-desc">' + esc(kat.deskripsi) + '</p></div>' +
        '</div>' +
        '<span class="category-count-badge">' + kat.kodes.length + ' Indikator</span>';

      var katGrid = document.createElement("div");
      katGrid.className = "category-grid";

      kat.kodes.forEach(function (kode) {
        var ind = KB.indikator.filter(function (i) { return i.kode === kode; })[0];
        if (!ind) return;

        var el = document.createElement("div");
        el.className = "indikator";
        el.id = "kartu-" + ind.kode;
        el.setAttribute("role", "radiogroup");
        el.setAttribute("aria-labelledby", "judul-" + ind.kode);
        el.setAttribute("aria-describedby", "petunjuk-" + ind.kode);

        var pil = ind.pilihan.map(function (p, i) {
          var kelas = i === 0 ? "" : (nilaiParah[ind.kode + ":" + p.nilai] ? "parah" : "tidak-normal");
          return '<label><input type="radio" name="' + ind.kode + '" value="' + p.nilai + '">' +
                 '<span class="' + kelas + '">' + esc(p.label) + "</span></label>";
        }).join("");

        el.innerHTML =
          '<div class="atas">' +
            '<span class="kode">' + ind.kode + '</span>' +
            '<div><h3 id="judul-' + ind.kode + '">' + esc(ind.nama) + "</h3>" +
            '<p class="petunjuk" id="petunjuk-' + ind.kode + '">' + esc(ind.petunjuk) + "</p></div>" +
          '</div>' +
          '<div class="pilihan">' + pil + "</div>" +
          '<p class="pesan-salah" id="salah-' + ind.kode + '" hidden><i class="ri-error-warning-line"></i> Belum diisi. Silakan pilih salah satu opsi.</p>';

        katGrid.appendChild(el);
      });

      katSection.appendChild(katHeader);
      katSection.appendChild(katGrid);
      wadah.appendChild(katSection);
    });
  }

  function tandaiGalat(kode, ada) {
    var k = document.getElementById("kartu-" + kode);
    if (!k) return;
    k.classList.toggle("salah", ada);
    var pesanEl = document.getElementById("salah-" + kode);
    if (pesanEl) pesanEl.hidden = !ada;
    k.setAttribute("aria-describedby", "petunjuk-" + kode + (ada ? " salah-" + kode : ""));
    [].forEach.call(k.querySelectorAll("input"), function (r) {
      if (ada) r.setAttribute("aria-invalid", "true"); else r.removeAttribute("aria-invalid");
    });
  }

  function bersihkanGalat() {
    KB.indikator.forEach(function (i) { tandaiGalat(i.kode, false); });
  }

  function ambilFakta() {
    var fakta = {};
    KB.indikator.forEach(function (ind) {
      var t = document.querySelector('input[name="' + ind.kode + '"]:checked');
      fakta[ind.kode] = t ? t.value : "";
    });
    return fakta;
  }

  // Progres Pengisian Real-Time
  function perbaruiProgres() {
    var n = 0;
    KB.indikator.forEach(function (ind) {
      if (document.querySelector('input[name="' + ind.kode + '"]:checked')) n++;
    });

    var pct = Math.round((n / KB.indikator.length) * 100);
    var teksProg = $("#teks-progres");
    var isiProg = $("#isi-progres");
    var pctProg = $("#progres-persen");

    if (teksProg) teksProg.textContent = n + " dari " + KB.indikator.length + " indikator terisi";
    if (isiProg) isiProg.style.width = pct + "%";
    if (pctProg) pctProg.textContent = pct + "%";

    var progWrap = $(".progres");
    if (progWrap) progWrap.classList.toggle("penuh", n === KB.indikator.length);
  }

  // Deteksi Perubahan Masukan (Stale Result)
  var terakhir = null;
  function perbaruiBasi() {
    var basi = terakhir !== null && JSON.stringify(ambilFakta()) !== terakhir;
    var warnBasi = $("#peringatan-basi");
    var isiHasil = $("#isi-hasil");
    if (warnBasi) warnBasi.hidden = !basi;
    if (isiHasil) isiHasil.classList.toggle("basi", basi);
  }

  function isiFakta(fakta) {
    document.querySelectorAll('#daftar-indikator input[type="radio"]').forEach(function (r) {
      r.checked = fakta[r.name] === r.value;
    });
    bersihkanGalat();
    perbaruiProgres();
    perbaruiBasi();
  }

  if (wadah) {
    wadah.addEventListener("change", function (e) {
      var kartu = e.target.closest(".indikator");
      if (kartu) tandaiGalat(kartu.id.replace("kartu-", ""), false);
      perbaruiProgres();
      perbaruiBasi();
    });
  }

  // ---------- Mode Demo & Preset Cepat ----------
  var bannerOtomatis = $("#banner-otomatis");
  var pilihContoh = $("#pilih-contoh");

  if (pilihContoh) {
    UJI.skenario.forEach(function (s) {
      if (s.id === "S10") return; // S10 data di luar pilihan sah (hanya untuk uji mesin)
      var o = document.createElement("option");
      o.value = s.id;
      o.textContent = s.id + " · " + s.jenis + " — " + s.uraian;
      pilihContoh.appendChild(o);
    });

    pilihContoh.addEventListener("change", function () {
      var s = UJI.skenario.filter(function (x) { return x.id === pilihContoh.value; })[0];
      if (s) {
        isiFakta(s.fakta);
        if (bannerOtomatis) bannerOtomatis.hidden = false;
        showToast("Skenario " + s.id + " (" + (s.harapan.status || "Uji") + ") dimuat.");
      }
    });
  }

  // Quick Preset Pills Listener
  $$("[data-skenario]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sid = btn.dataset.skenario;
      var s = UJI.skenario.filter(function (x) { return x.id === sid; })[0];
      if (s) {
        isiFakta(s.fakta);
        if (pilihContoh) pilihContoh.value = sid;
        if (bannerOtomatis) bannerOtomatis.hidden = false;
        showToast("Preset " + sid + " (" + s.harapan.status + ") aktif.");
      }
    });
  });

  var btnNormal = $("#tombol-normal");
  if (btnNormal) {
    btnNormal.addEventListener("click", function () {
      isiFakta(UJI.NORMAL);
      if (pilihContoh) pilihContoh.value = "S1";
      if (bannerOtomatis) bannerOtomatis.hidden = false;
      showToast("Semua indikator diset normal (K1).");
    });
  }

  // ---------- Hasil: Keadaan Kosong (Empty State) ----------
  function kosongkanHasil() {
    terakhir = null;
    var panelHasil = $("#hasil");
    var warnBasi = $("#peringatan-basi");
    var isiHasil = $("#isi-hasil");

    if (panelHasil) panelHasil.classList.add("belum");
    if (warnBasi) warnBasi.hidden = true;
    if (isiHasil) {
      isiHasil.classList.remove("basi");
      isiHasil.innerHTML =
        '<div class="kosong-card">' +
          '<div class="kosong-radar">' +
            '<div class="radar-circle circle-1"></div>' +
            '<div class="radar-circle circle-2"></div>' +
            '<i class="ri-pulse-line"></i>' +
          '</div>' +
          '<h3 class="kosong-title">Menunggu Analisis</h3>' +
          '<p class="kosong-sub">Pilih opsi pada 10 indikator di sebelah kiri, lalu tekan <b>Periksa Kelayakan</b> untuk memulai inferensi penalaran maju.</p>' +
          '<div class="kosong-features">' +
            '<div class="kf-item"><i class="ri-check-line"></i> Evaluasi 12 Aturan IF–THEN Pakar</div>' +
            '<div class="kf-item"><i class="ri-shield-keyhole-line"></i> Resolusi Konflik K3 › K4 › K2 › K1</div>' +
            '<div class="kf-item"><i class="ri-file-list-3-line"></i> Rekomendasi Tindakan Laboran</div>' +
          '</div>' +
        '</div>';
    }
  }

  kosongkanHasil();
  perbaruiProgres();

  var formulir = $("#formulir");
  if (formulir) {
    formulir.addEventListener("reset", function () {
      setTimeout(function () {
        isiFakta({});
        if (bannerOtomatis) bannerOtomatis.hidden = true;
        if (pilihContoh) pilihContoh.value = "";
        kosongkanHasil();
        showToast("Formulir telah dikosongkan.");
      }, 0);
    });

    formulir.addEventListener("submit", function (e) {
      e.preventDefault();
      var fakta = ambilFakta();
      var hasil = MESIN.inferensi(fakta, KB);
      var nomorInput = $("#nomor-pc");
      var nomor = nomorInput ? nomorInput.value.trim() : "";
      tampilkanHasil(hasil, nomor, fakta);
      if (hasil.valid && window.innerWidth <= 1080) {
        var elHasil = $("#hasil");
        if (elHasil) gulirKe(elHasil);
      }
    });
  }

  // ---------- Tampilan Hasil Diagnosis (Explainable AI) ----------
  function kartuAturan(r, kalah) {
    return '<div class="aturan-kartu' + (kalah ? " kalah" : "") + '">' +
      '<p class="alasan"><span class="id">' + r.id + "</span>" + esc(r.alasan) +
      (kalah ? ' <span class="meta">(Kalah Prioritas)</span>' : "") + "</p>" +
      "<code>" + esc(MESIN.teksAturan(r, KB)) + "</code></div>";
  }

  function tampilkanHasil(h, nomor, fakta) {
    var el = $("#isi-hasil");
    var panelHasil = $("#hasil");
    var warnBasi = $("#peringatan-basi");

    if (panelHasil) panelHasil.classList.remove("belum");
    if (warnBasi) warnBasi.hidden = true;
    if (el) el.classList.remove("basi");

    // Jika masukan belum valid (ada yang kosong)
    if (!h.valid) {
      terakhir = null;
      h.galat.forEach(function (g) { tandaiGalat(g.kode, true); });

      if (el) {
        el.innerHTML =
          '<div class="galat-card">' +
            '<div class="galat-header">' +
              '<div class="galat-icon"><i class="ri-alert-fill"></i></div>' +
              '<div><h2>Pemeriksaan Belum Lengkap</h2>' +
              '<p>Lengkapi opsi pengamatan pada indikator berikut sebelum sistem menarik kesimpulan:</p></div>' +
            '</div>' +
            '<ul class="galat-list">' +
              h.galat.map(function (g) {
                return '<li><button type="button" data-fokus="' + g.kode + '"><span><i class="ri-arrow-right-s-line"></i> ' + esc(g.pesan) + "</span></button></li>";
              }).join("") +
            '</ul>' +
          '</div>';
      }
      fokusKartu(h.galat[0].kode);
      showToast(h.galat.length + " indikator perlu dilengkapi.");
      return;
    }

    var sekarang = new Date();
    var s = h.status;
    terakhir = JSON.stringify(fakta);
    catatRiwayat(h, nomor, sekarang);

    var html = '<div class="result-content">';

    // 1. Status Hero Banner
    html += '<div class="status ' + s.warna + '">' +
      '<div class="status-ikon" aria-hidden="true">' + (IKON[s.kode] || "✓") + '</div>' +
      '<div class="status-info">' +
        '<p class="mono">' + (nomor ? esc(nomor) + " · " : "") + (s.kode === "-" ? "TIDAK ADA ATURAN COCOK" : "STATUS " + s.kode) + '</p>' +
        '<h2>' + esc(s.nama) + '</h2>' +
        '<p>' + esc(s.deskripsi) + '</p>' +
        '<p class="waktu"><i class="ri-time-line"></i> Diperiksa pada ' + esc(waktuTampil(sekarang)) + '</p>' +
      '</div></div>';

    // 2. Tindakan yang Disarankan (Action Checklist)
    html += '<div class="bagian">' +
      '<h3><i class="ri-checkbox-line"></i> TINDAKAN YANG DISARANKAN</h3>' +
      '<ul class="tindakan">' +
        h.tindakan.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") +
      '</ul></div>';

    // 3. Tombol Aksi Cepat
    html += '<div class="bagian aksi-hasil">' +
      '<button type="button" class="tombol utama" data-aksi="berikutnya" title="Simpan hasil dan siapkan formulir untuk nomor PC selanjutnya">' +
        '<i class="ri-add-line"></i><span>Periksa PC Berikutnya</span>' +
      '</button>' +
      '<button type="button" class="tombol sekunder" data-aksi="cetak" title="Cetak formulir diagnosis resmi laboratorium">' +
        '<i class="ri-printer-line"></i><span>Cetak Hasil</span>' +
      '</button>' +
      '<button type="button" class="tombol sekunder" data-aksi="salin" title="Salin ringkasan teks diagnosis ke clipboard">' +
        '<i class="ri-file-copy-line"></i><span>Salin</span>' +
      '</button>' +
    '</div>';

    // 4. Mengapa Status Ini? (Explainable AI)
    html += '<div class="bagian">' +
      '<h3><i class="ri-questionnaire-line"></i> MENGAPA STATUS INI? (ATURAN PEMENANG)</h3>';
    if (h.pemenang.length) {
      html += h.pemenang.map(function (r) { return kartuAturan(r, false); }).join("");
    } else {
      html += '<p class="arahan">Kombinasi observasi ini belum terdefinisi pada basis pengetahuan sehingga forward chaining tidak menarik asumsi sembarangan.</p>';
    }
    html += '</div>';

    // 5. Resolusi Konflik (Bila Beberapa Aturan Terpicu)
    if (h.konflik) {
      html += '<div class="bagian">' +
        '<h3><i class="ri-shield-keyhole-line"></i> RESOLUSI KONFLIK PRIORITAS</h3>' +
        '<p class="category-desc">Aturan berikut juga terpicu, namun status <b>' + s.kode +
        '</b> diutamakan karena memiliki prioritas lebih berat (K3 › K4 › K2 › K1):</p>' +
        h.kalah.map(function (r) { return kartuAturan(r, true); }).join("") +
      '</div>';
    }

    // 6. Jejak Forward Chaining (Inference Trace)
    var adaYangCocok = {};
    h.terpicu.forEach(function (r) { adaYangCocok[r.id] = true; });

    html += '<div class="bagian">' +
      '<details class="jejak">' +
        '<summary><i class="ri-node-tree"></i> Lihat Jejak Penalaran Forward Chaining (' +
          h.terpicu.length + " dari " + KB.aturan.length + " aturan terpicu dalam " + h.siklus + " siklus)</summary>" +
        tabel(["Aturan", "Kondisi", "Terpicu?"], KB.aturan.map(function (r) {
          return ["<b>" + r.id + "</b>", "<code>" + esc(MESIN.teksAturan(r, KB)) + "</code>",
            adaYangCocok[r.id] ? '<span class="ya">✓ Cocok</span>' : '<span class="tidak">Tidak</span>'];
        }), true) +
        '<p class="meta">Siklus forward chaining berhenti saat tidak ada fakta baru yang dihasilkan pada memori kerja.</p>' +
      '</details></div>';

    html += '</div>';

    if (el) el.innerHTML = html;
    if (panelHasil) panelHasil.scrollTop = 0;

    var pengumuman = $("#pengumuman");
    if (pengumuman) {
      pengumuman.textContent = "Hasil untuk " + (nomor || "komputer") + ": " + s.nama;
    }
    showToast("Hasil: " + s.nama + " (" + s.kode + ")");
  }

  function fokusKartu(kode) {
    var kartu = document.getElementById("kartu-" + kode);
    if (!kartu) return;
    gulirKe(kartu, "center");
    var r = kartu.querySelector("input");
    if (r) r.focus({ preventScroll: true });
  }

  // Delegasi Klik pada Panel Hasil
  var panelHasil = $("#hasil");
  if (panelHasil) {
    panelHasil.addEventListener("click", function (e) {
      var fokus = e.target.closest("[data-fokus]");
      if (fokus) { fokusKartu(fokus.dataset.fokus); return; }

      var aksi = e.target.closest("[data-aksi]");
      if (!aksi) return;

      var jenisAksi = aksi.dataset.aksi;
      if (jenisAksi === "cetak") window.print();
      if (jenisAksi === "berikutnya") periksaBerikutnya();
      if (jenisAksi === "salin") salinRingkasanClipboard();
    });
  }

  // Fitur Salin Ringkasan ke Clipboard
  function salinRingkasanClipboard() {
    var nomor = ($("#nomor-pc") ? $("#nomor-pc").value.trim() : "") || "PC Laboratorium";
    var hasilEl = $("#isi-hasil");
    if (!hasilEl) return;

    var statusJudul = hasilEl.querySelector(".status h2");
    var statusNama = statusJudul ? statusJudul.textContent : "";
    var tindakanItems = $$("#isi-hasil .tindakan li").map(function (li, idx) {
      return (idx + 1) + ". " + li.textContent;
    }).join("\n");

    var teks = "📋 LAPORAN KELAYAKAN KOMPUTER (KOMPAK)\n" +
      "-------------------------------------------\n" +
      "Nomor PC : " + nomor + "\n" +
      "Status   : " + statusNama + "\n" +
      "Waktu    : " + waktuTampil(new Date()) + "\n\n" +
      "Tindakan Direkomendasikan:\n" +
      (tindakanItems || "-") + "\n" +
      "-------------------------------------------\n" +
      "Teknik Komputer UNM · Sistem Pakar Forward Chaining";

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(function () {
        showToast("Ringkasan berhasil disalin ke clipboard!");
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = teks;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showToast("Ringkasan berhasil disalin ke clipboard!");
    }
  }

  // Print Handling
  var terbukaSebelumCetak = [];
  window.addEventListener("beforeprint", function () {
    terbukaSebelumCetak = [];
    $$("#hasil details").forEach(function (d) {
      terbukaSebelumCetak.push(d.open);
      d.open = true;
    });
  });
  window.addEventListener("afterprint", function () {
    $$("#hasil details").forEach(function (d, i) {
      d.open = !!terbukaSebelumCetak[i];
    });
  });

  // Alur Beruntun: PC Berikutnya (Auto Increment: PC-01 -> PC-02)
  function nomorBerikutnya(t) {
    if (!t) return "PC-02";
    return t.replace(/\d+/, function (m) {
      var n = String(parseInt(m, 10) + 1);
      while (n.length < m.length) n = "0" + n;
      return n;
    });
  }

  function periksaBerikutnya() {
    var input = $("#nomor-pc");
    if (input) {
      input.value = nomorBerikutnya(input.value.trim());
    }
    isiFakta({});
    if (bannerOtomatis) bannerOtomatis.hidden = true;
    if (pilihContoh) pilihContoh.value = "";
    kosongkanHasil();
    window.scrollTo({ top: 0, behavior: kurangiGerak() ? "auto" : "smooth" });
    if (input) {
      input.focus({ preventScroll: true });
      input.select();
    }
    showToast("Siap memeriksa " + (input ? input.value : "PC berikutnya"));
  }

  // ---------- Riwayat Pemeriksaan & Statistik Sesi ----------
  var riwayat = [];
  var noRiwayat = 0;

  function perbaruiStatistikRiwayat() {
    var elTotal = $("#stat-total-pc");
    var elK1 = $("#stat-k1");
    var elK2 = $("#stat-k2");
    var elK3 = $("#stat-k3");

    if (!elTotal) return;

    var nK1 = riwayat.filter(function (r) { return r.status.kode === "K1"; }).length;
    var nK2 = riwayat.filter(function (r) { return r.status.kode === "K2"; }).length;
    var nK3 = riwayat.filter(function (r) { return r.status.kode === "K3" || r.status.kode === "K4"; }).length;

    elTotal.textContent = riwayat.length;
    if (elK1) elK1.textContent = nK1;
    if (elK2) elK2.textContent = nK2;
    if (elK3) elK3.textContent = nK3;
  }

  function catatRiwayat(h, nomor, waktu) {
    var entri = {
      nomor: nomor || "(tanpa nomor)",
      status: h.status,
      aturan: h.pemenang.map(function (r) { return r.id; }).join(", "),
      waktu: waktu
    };
    var akhir = riwayat[riwayat.length - 1];
    if (nomor && akhir && akhir.nomor === entri.nomor) {
      entri.no = akhir.no;
      riwayat[riwayat.length - 1] = entri;
    } else {
      entri.no = ++noRiwayat;
      riwayat.push(entri);
    }
    tampilkanRiwayat();
    perbaruiStatistikRiwayat();
  }

  function tampilkanRiwayat() {
    var riwayatSec = $("#riwayat");
    if (riwayatSec) riwayatSec.hidden = riwayat.length === 0;

    var urut = riwayat.slice().reverse();
    var wadahTabel = $("#tabel-riwayat");
    if (wadahTabel) {
      wadahTabel.innerHTML = tabel(["No", "Label PC", "Status Kelayakan", "Aturan Dasar", "Waktu Diperiksa"], urut.map(function (r) {
        return [
          r.no,
          "<b>" + esc(r.nomor) + "</b>",
          labelStatus(r.status) + " " + esc(r.status.nama),
          esc(r.aturan || "—"),
          esc(waktuTampil(r.waktu))
        ];
      }));
    }
  }

  function selCsv(v) {
    v = String(v);
    if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
    return '"' + v.replace(/"/g, '""') + '"';
  }

  var btnEkspor = $("#ekspor-csv");
  if (btnEkspor) {
    btnEkspor.addEventListener("click", function () {
      if (riwayat.length === 0) {
        showToast("Belum ada riwayat pemeriksaan untuk diekspor.");
        return;
      }
      var baris = [["No", "Nomor PC", "Kode Status", "Nama Status", "Aturan Terpicu", "Waktu"]].concat(riwayat.map(function (r) {
        return [r.no, r.nomor, r.status.kode, r.status.nama, r.aturan, waktuCsv(r.waktu)];
      }));
      var csv = "\ufeff" + baris.map(function (b) { return b.map(selCsv).join(";"); }).join("\r\n");
      var url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      var a = document.createElement("a");
      a.href = url;
      a.download = "riwayat-kompak-" + waktuCsv(new Date()).replace(/[-: ]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2") + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showToast("Berkas CSV berhasil diunduh.");
    });
  }

  var btnHapus = $("#hapus-riwayat");
  if (btnHapus) {
    btnHapus.addEventListener("click", function () {
      if (!window.confirm("Hapus seluruh riwayat pemeriksaan sesi ini?")) return;
      riwayat = [];
      tampilkanRiwayat();
      perbaruiStatistikRiwayat();
      showToast("Riwayat telah dibersihkan.");
    });
  }

  // ---------- Tab Basis Pengetahuan ----------
  (function tampilkanBasis() {
    var urut = ["K1", "K2", "K4", "K3"];
    var tabelKesimpulan = $("#tabel-kesimpulan");
    if (tabelKesimpulan) {
      tabelKesimpulan.innerHTML = tabel(["Kode", "Kesimpulan", "Uraian Praktis", "Tingkat Prioritas"],
        urut.map(function (k) {
          var s = KB.kesimpulan[k];
          return [labelStatus(s), "<b>" + esc(s.nama) + "</b>", esc(s.deskripsi), "Prioritas " + s.prioritas];
        }).concat([[labelStatus(KB.belumDisimpulkan), "<b>" + esc(KB.belumDisimpulkan.nama) + "</b>", esc(KB.belumDisimpulkan.deskripsi), "—"]]));
    }

    var tabelIndikator = $("#tabel-indikator");
    if (tabelIndikator) {
      tabelIndikator.innerHTML = tabel(["Kode", "Parameter Observasi", "Pilihan Jawaban (Opsi Awal = Normal)"],
        KB.indikator.map(function (i) {
          return ["<b>" + i.kode + "</b>", "<b>" + esc(i.nama) + "</b>", i.pilihan.map(function (p) { return esc(p.label); }).join(" / ")];
        }));
    }

    var tabelAturan = $("#tabel-aturan");
    if (tabelAturan) {
      tabelAturan.innerHTML = tabel(["Aturan", "IF (Kondisi Fakta)", "THEN (Kesimpulan)", "Dasar Alasan Teknis"],
        KB.aturan.map(function (r) {
          var jika = r.id === "R12" ? "Semua indikator bernilai normal" : MESIN.teksKondisi(r.kondisi, KB);
          return ["<b>" + r.id + "</b>", "<code>" + esc(jika) + "</code>", labelStatus(KB.kesimpulan[r.maka]), esc(r.alasan)];
        }));
    }

    var daftarSumber = $("#daftar-sumber");
    if (daftarSumber) {
      daftarSumber.innerHTML = KB.sumber.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    }
  })();

  // ---------- Tab Pengujian (Akurasi & Skenario Uji) ----------
  function tampilkanPengujian() {
    var hasil = UJI.jalankan(KB, MESIN);
    var lulus = hasil.filter(function (h) { return h.lulus; }).length;
    var pct = Math.round((lulus / hasil.length) * 100);

    var ringkasanEl = $("#ringkasan-uji");
    if (ringkasanEl) {
      ringkasanEl.innerHTML = "<b>" + pct + "%</b><span>" + lulus + " dari " + hasil.length + " skenario sesuai harapan</span>";
    }

    var tabelUji = $("#tabel-uji");
    if (tabelUji) {
      tabelUji.innerHTML = tabel(["No", "Klasifikasi", "Kondisi Uji (Lainnya Normal)", "Target Pakar", "Hasil Inferensi", "Verifikasi"],
        hasil.map(function (h) {
          return [
            "<b>" + h.id + "</b>",
            esc(h.jenis),
            esc(h.uraian),
            "<code>" + esc(h.diharapkan) + "</code>",
            "<code>" + esc(h.aktual) + "</code>",
            h.lulus ? '<span class="lulus">✓ SESUAI</span>' : '<span class="gagal">✕ TIDAK</span>'
          ];
        }));
    }
  }

})();
