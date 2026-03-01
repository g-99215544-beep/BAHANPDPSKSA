/* ═══════════════════════════════════════════════════════════
   auth.js — Pengesahan Admin
   ═══════════════════════════════════════════════════════════
   Admin log masuk dengan kata laluan sahaja.
   Sesi kekal selama 24 jam walaupun selepas refresh halaman.
   ═══════════════════════════════════════════════════════════ */

const ADMIN_PASS = 'admin123';

const SESSION_KEY      = 'adminSession';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 jam dalam milisaat

function saveSession()    { localStorage.setItem(SESSION_KEY, Date.now().toString()); }
function clearSession()   { localStorage.removeItem(SESSION_KEY); }
function isSessionValid() {
  const ts = localStorage.getItem(SESSION_KEY);
  if (!ts) return false;
  return (Date.now() - parseInt(ts, 10)) < SESSION_DURATION;
}

/**
 * Log masuk: semak kata laluan, daftarkan sesi Firebase, simpan masa sesi.
 */
async function doLogin() {
  const p    = document.getElementById('loginPass').value.trim();
  const errEl = document.getElementById('loginErr');
  errEl.classList.remove('show');

  if (p !== ADMIN_PASS) {
    errEl.textContent = '⚠️ Kata laluan tidak betul!';
    errEl.classList.add('show');
    return;
  }

  try {
    saveSession(); // simpan sebelum sign-in supaya onAuthStateChanged nampak sesi sah
    await fbAuth.signInAnonymously();
    S.loggedIn = true;
    closeModal('loginModal');
    renderAuth();
    reRender();
    toast('✅ Selamat datang, Admin!', 'success');
  } catch (e) {
    console.error('Firebase sign-in error:', e);
    errEl.textContent = '❌ Gagal menyambung ke pelayan. Cuba lagi.';
    errEl.classList.add('show');
  }
}

/**
 * Log keluar: tamatkan sesi Firebase dan buang data sesi tempatan.
 */
async function doLogout() {
  try {
    await fbAuth.signOut();
  } catch (e) {
    console.warn('Sign-out error:', e);
  }
  clearSession();
  S.loggedIn = false;
  renderAuth();
  reRender();
  toast('Log keluar berjaya', '');
}

/**
 * Pantau perubahan sesi Firebase.
 * Pulihkan log masuk jika sesi tempatan masih dalam tempoh 24 jam.
 * Jika sesi sudah tamat, log keluar secara automatik.
 */
fbAuth.onAuthStateChanged(async user => {
  if (typeof S === 'undefined' || typeof renderAuth === 'undefined') return;

  if (user) {
    if (isSessionValid()) {
      // Sesi masih sah — pulihkan status admin
      S.loggedIn = true;
      renderAuth();
    } else {
      // Sesi sudah tamat 24 jam — log keluar automatik
      clearSession();
      try { await fbAuth.signOut(); } catch (_) {}
      S.loggedIn = false;
      renderAuth();
    }
  }
});
