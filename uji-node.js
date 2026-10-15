// Menjalankan 10 skenario uji dari terminal:  node uji-node.js
const kb = require("./js/basis-pengetahuan.js");
const mesin = require("./js/mesin-inferensi.js");
const uji = require("./js/skenario-uji.js");

const hasil = uji.jalankan(kb, mesin);
console.log("KOMPAK — Hasil 10 skenario uji\n");
hasil.forEach(h => {
  console.log(`${h.lulus ? "LULUS" : "GAGAL"}  ${h.id.padEnd(4)} [${h.jenis}] ${h.uraian}`);
  console.log(`        diharapkan: ${h.diharapkan}`);
  console.log(`        hasil     : ${h.aktual}\n`);
});
const lulus = hasil.filter(h => h.lulus).length;
console.log(`Kesesuaian: ${lulus}/${hasil.length} = ${(lulus / hasil.length * 100).toFixed(0)}%`);
process.exitCode = lulus === hasil.length ? 0 : 1;
