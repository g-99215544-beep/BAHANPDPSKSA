/* ═══════════════════════════════════════════════════════════
   storage.js — Firebase Storage: Muat Naik, Padam & Lihat
   ═══════════════════════════════════════════════════════════ */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc', 'docx',
  'ppt', 'pptx',
  'xls', 'xlsx',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'mp4', 'webm', 'mov', 'avi',
];

// ── UTILITI ───────────────────────────────────────────────────

/**
 * Dapatkan ikon dan kelas CSS berdasarkan nama fail.
 * @param {string} filename
 * @returns {{ icon: string, cls: string }}
 */
function getFileTypeInfo(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf')                          return { icon: '📄', cls: 'ft-pdf' };
  if (['doc','docx'].includes(ext))           return { icon: '📝', cls: 'ft-doc' };
  if (['ppt','pptx'].includes(ext))           return { icon: '📊', cls: 'ft-ppt' };
  if (['xls','xlsx'].includes(ext))           return { icon: '📗', cls: 'ft-doc' };
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return { icon: '🖼️', cls: 'ft-img' };
  if (['mp4','webm','mov','avi'].includes(ext))        return { icon: '🎬', cls: 'ft-vid' };
  return { icon: '📎', cls: 'ft-other' };
}

/**
 * Semak sama ada fail dibenarkan (saiz & jenis).
 * @param {File} file
 * @returns {string|null} - mesej ralat atau null jika OK
 */
function validateFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Jenis fail .${ext} tidak dibenarkan.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `Fail "${file.name}" melebihi had 50 MB.`;
  }
  return null;
}

/**
 * Format saiz fail kepada string yang mudah dibaca.
 * @param {number} bytes
 * @returns {string}
 */
function fmtSize(bytes) {
  if (bytes < 1024)     return bytes + ' B';
  if (bytes < 1048576)  return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Format tarikh semasa.
 * @returns {string}
 */
function fmtDate() {
  return new Date().toLocaleDateString('ms-MY', { day:'2-digit', month:'short', year:'numeric' });
}

/**
 * Jana ID unik untuk fail.
 * @returns {string}
 */
function uid() {
  return 'f' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

/**
 * Sanitize nama folder supaya selamat untuk path Storage.
 * @param {string} str
 * @returns {string}
 */
function safePath(str) {
  return str.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase().substr(0, 50);
}

/**
 * Escape HTML untuk elak XSS.
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── MUAT NAIK ─────────────────────────────────────────────────

/**
 * Muat naik satu fail ke Firebase Storage.
 * Path: bahan/{sj}/{cat}/{year}/{safeTopic}/{uid_filename}
 *
 * @param {File}     file       - Objek fail dari input
 * @param {string}   sj         - ID subjek
 * @param {string}   cat        - 'latihan' atau 'peperiksaan'
 * @param {number}   year       - Tahun (1–6)
 * @param {string}   topicName  - Nama tajuk
 * @param {function} onProgress - fn(percentage) semasa muat naik
 * @returns {Promise<{ storagePath, downloadURL }>}
 */
function uploadFileToStorage(file, sj, cat, year, topicName, onProgress) {
  const ext        = file.name.split('.').pop().toLowerCase();
  const safeFile   = safePath(file.name.replace(/\.[^/.]+$/, ''));
  const uniqueName = `${Date.now()}_${safeFile}.${ext}`;
  const storagePath = `bahan/${sj}/${cat}/${year}/${safePath(topicName)}/${uniqueName}`;

  const ref  = fbStorage.ref(storagePath);
  const task = ref.put(file, { contentType: file.type || 'application/octet-stream' });

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      snap => {
        const pct = (snap.bytesTransferred / snap.totalBytes) * 100;
        if (onProgress) onProgress(Math.round(pct));
      },
      err => reject(err),
      async () => {
        try {
          const downloadURL = await task.snapshot.ref.getDownloadURL();
          resolve({ storagePath, downloadURL });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/**
 * Padam fail dari Firebase Storage.
 * @param {string} storagePath - path fail dalam Storage
 */
async function deleteFileFromStorage(storagePath) {
  if (!storagePath) return;
  try {
    await fbStorage.ref(storagePath).delete();
  } catch (e) {
    // Abaikan jika fail sudah tidak ada
    if (e.code !== 'storage/object-not-found') {
      console.warn('Gagal padam fail dari Storage:', e);
    }
  }
}

// ── PENONTON FAIL (VIEWER) ────────────────────────────────────

/**
 * Bina HTML kandungan viewer berdasarkan jenis fail.
 * @param {object} file - objek fail (dengan .name dan .downloadURL)
 * @returns {string} HTML
 */
function buildViewerHTML(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const url = file.downloadURL;

  // Gambar
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    return `<img src="${escHtml(url)}" alt="${escHtml(file.name)}" style="max-width:100%;max-height:90vh;object-fit:contain;margin:auto;display:block;padding:1rem;">`;
  }

  // Video
  if (['mp4','webm','ogg','mov'].includes(ext)) {
    return `
      <video controls style="max-width:100%;max-height:90vh;margin:auto;display:block;">
        <source src="${escHtml(url)}">
        <p style="color:#fff;text-align:center;padding:2rem;">Pelayar anda tidak menyokong video HTML5.</p>
      </video>`;
  }

  // PDF — guna iframe
  if (ext === 'pdf') {
    return `<iframe src="${escHtml(url)}" title="${escHtml(file.name)}" style="width:100%;height:100%;border:none;flex:1;"></iframe>`;
  }

  // Word / PowerPoint / Excel — guna Google Docs Viewer
  if (['doc','docx','ppt','pptx','xls','xlsx'].includes(ext)) {
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return `<iframe src="${escHtml(viewerUrl)}" title="${escHtml(file.name)}" style="width:100%;height:100%;border:none;flex:1;"
      onload="this.dataset.loaded='1'"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"></iframe>
      <div class="viewer-fallback" style="display:none">
        <div class="big-icon">📄</div>
        <h4>${escHtml(file.name)}</h4>
        <p>Fail tidak dapat dipapar secara langsung.<br>Sila muat turun untuk membukanya.</p>
        <a href="${escHtml(url)}" target="_blank" download="${escHtml(file.name)}" class="btn-open-tab">⬇️ Muat Turun Fail</a>
      </div>`;
  }

  // Jenis lain — paparan fallback
  return `
    <div class="viewer-fallback">
      <div class="big-icon">📎</div>
      <h4>${escHtml(file.name)}</h4>
      <p>Jenis fail ini tidak boleh dipapar secara langsung.<br>Sila muat turun untuk membukanya.</p>
      <a href="${escHtml(url)}" target="_blank" download="${escHtml(file.name)}" class="btn-open-tab">⬇️ Muat Turun Fail</a>
    </div>`;
}

/**
 * Buka modal viewer dengan kandungan fail.
 * @param {object} file - objek fail
 */
function openFileViewer(file) {
  document.getElementById('viewerTitle').textContent = file.name;
  document.getElementById('viewerContent').innerHTML = buildViewerHTML(file);
  document.getElementById('viewerDlBtn').href     = file.downloadURL;
  document.getElementById('viewerDlBtn').setAttribute('download', file.name);
  document.getElementById('viewerNewTabBtn').href = file.downloadURL;
  openModal('viewerModal');
}
