/* ═══════════════════════════════════════════════════════════
   auth.js — Pengesahan Guru (Firebase Anonymous Auth)
   ═══════════════════════════════════════════════════════════
   Guru log masuk dengan kata laluan dalaman, kemudian sistem
   menandatangani masuk ke Firebase secara tanpa nama (anonymous)
   supaya operasi tulis ke Storage dan Database dibenarkan.
   ═══════════════════════════════════════════════════════════ */

// Bukti masuk guru — ubah dalam fail ini jika perlu
// ⚠️  Untuk keselamatan lebih tinggi, gunakan Firebase Auth (Email/Password)
const GURU_USER = 'guru';
const GURU_PASS = 'sekolah123';

/**
 * Log masuk: semak kata laluan, kemudian daftarkan sesi Firebase.
 */
async function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const errEl = document.getElementById('loginErr');
  errEl.classList.remove('show');

  if (u !== GURU_USER || p !== GURU_PASS) {
    errEl.textContent = '⚠️ Nama pengguna atau kata laluan tidak betul!';
    errEl.classList.add('show');
    return;
  }

  try {
    // Daftar masuk Firebase secara tanpa nama supaya Storage rules dipenuhi
    await fbAuth.signInAnonymously();
    S.loggedIn = true;
    closeModal('loginModal');
    renderAuth();
    reRender();
    toast('✅ Selamat datang, Guru!', 'success');
  } catch (e) {
    console.error('Firebase sign-in error:', e);
    errEl.textContent = '❌ Gagal menyambung ke pelayan. Cuba lagi.';
    errEl.classList.add('show');
  }
}

/**
 * Log keluar: tamatkan sesi Firebase dan kosongkan status.
 */
async function doLogout() {
  try {
    await fbAuth.signOut();
  } catch (e) {
    console.warn('Sign-out error:', e);
  }
  S.loggedIn = false;
  renderAuth();
  reRender();
  toast('Log keluar berjaya', '');
}

/**
 * Pantau perubahan sesi Firebase.
 * Jika pengguna sudah log masuk sebelum ini (contoh: selepas refresh),
 * pulihkan status log masuk secara automatik.
 * Guard typeof digunakan kerana callback ini mungkin lebih awal dari app.js.
 */
fbAuth.onAuthStateChanged(user => {
  // Tunggu sehingga app.js selesai dimuatkan
  if (typeof S === 'undefined' || typeof renderAuth === 'undefined') return;
  if (user && !S.loggedIn) {
    // Sesi Firebase masih aktif — anggap guru masih log masuk
    S.loggedIn = true;
    renderAuth();
    // reRender dipanggil selepas data Firebase dimuatkan dalam init()
  }
});
