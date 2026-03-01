/* ═══════════════════════════════════════════════════════════
   db.js — Operasi Firebase Realtime Database
   ═══════════════════════════════════════════════════════════ */

// ── FAIL METADATA ─────────────────────────────────────────────

/**
 * Dengar perubahan senarai fail secara masa nyata.
 * Panggil callback setiap kali data berubah.
 * @param {function} callback - fn(filesArray)
 */
function dbListenFiles(callback) {
  fbDB.ref('files').on('value', snap => {
    const raw = snap.val() || {};
    // Tukar objek {id: fileObj} kepada array
    callback(Object.values(raw));
  });
}

/**
 * Simpan metadata satu fail ke database.
 * @param {object} fileData - objek fail lengkap
 */
async function dbSaveFile(fileData) {
  await fbDB.ref(`files/${fileData.id}`).set(fileData);
}

/**
 * Padam metadata fail dari database.
 * @param {string} id - ID fail
 */
async function dbDeleteFile(id) {
  await fbDB.ref(`files/${id}`).remove();
}

// ── TOPIK PEPERIKSAAN ─────────────────────────────────────────

/**
 * Dengar perubahan semua topik peperiksaan secara masa nyata.
 * @param {function} callback - fn(peepObj)
 */
function dbListenPeep(callback) {
  fbDB.ref('peep').on('value', snap => {
    callback(snap.val() || {});
  });
}

/**
 * Simpan senarai topik peperiksaan untuk subjek + tahun tertentu.
 * @param {string} sj   - ID subjek
 * @param {number} year - Tahun
 * @param {Array}  list - Senarai nama topik
 */
async function dbSavePeep(sj, year, list) {
  await fbDB.ref(`peep/${sj}/${year}`).set(list);
}

// ── STATISTIK ─────────────────────────────────────────────────

/**
 * Tambah bilangan muat turun sebanyak 1 (transaksi selamat).
 */
async function dbIncDL() {
  await fbDB.ref('stats/downloads').transaction(n => (n || 0) + 1);
}

/**
 * Dengar perubahan statistik (bilangan muat turun).
 * @param {function} callback - fn(statsObj)
 */
function dbListenStats(callback) {
  fbDB.ref('stats').on('value', snap => {
    callback(snap.val() || { downloads: 0 });
  });
}
