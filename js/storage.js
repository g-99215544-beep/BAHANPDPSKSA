/* ═══════════════════════════════════════════════════════════
   storage.js — Firebase Storage: Muat Naik, Padam & Lihat
   ═══════════════════════════════════════════════════════════ */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc', 'docx',
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
  if (['ppt','pptx'].includes(ext))           return { icon: '🚫', cls: 'ft-other' };
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

// ── JANA THUMBNAIL ─────────────────────────────────────────────

/**
 * Jana thumbnail JPG halaman 1 daripada fail PDF tempatan.
 * @param {File} file - File object PDF
 * @returns {Promise<Blob|null>} - JPG blob atau null jika gagal
 */
async function generatePdfThumbnail(file) {
  const canvas = document.createElement('canvas');
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1 });
    const scale    = Math.min(1.5, 900 / viewport.width);
    const vp       = page.getViewport({ scale });

    canvas.width  = vp.width;
    canvas.height = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

    return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
  } catch (e) {
    console.warn('generatePdfThumbnail gagal:', e);
    return null;
  } finally {
    canvas.width  = 0;
    canvas.height = 0;
  }
}

/**
 * Jana thumbnail JPG halaman 1 daripada fail DOCX tempatan.
 * @param {File} file - File object DOCX
 * @returns {Promise<Blob|null>} - JPG blob atau null jika gagal
 */
async function generateDocxThumbnail(file) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:fixed;left:-9999px;top:0;width:794px;min-height:1px;' +
    'background:#fff;overflow:hidden;z-index:-1;';
  document.body.appendChild(wrapper);
  try {
    await docx.renderAsync(file, wrapper, null, {
      className: 'docx-render',
      inWrapper: false,
      ignoreWidth: true,
      ignoreHeight: true,
      ignoreFonts: false,
      breakPages: false,
      useBase64URL: true,
    });
    const canvas = await html2canvas(wrapper, {
      scale: 0.7,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: 794,
      height: Math.min(wrapper.scrollHeight, 1123),
      windowWidth: 794,
    });
    return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.8));
  } catch (e) {
    console.warn('generateDocxThumbnail gagal:', e);
    return null;
  } finally {
    document.body.removeChild(wrapper);
  }
}

/**
 * Muat naik blob thumbnail JPG ke Firebase Storage.
 * @param {Blob}   blob     - JPG blob
 * @param {string} basePath - Path fail original (tanpa extension)
 * @returns {Promise<{ thumbPath: string, thumbnailURL: string }>}
 */
async function uploadThumbnail(blob, basePath) {
  try {
    const thumbPath = basePath + '_thumb.jpg';
    const ref = fbStorage.ref(thumbPath);
    const snapshot = await ref.put(blob, { contentType: 'image/jpeg' });
    const thumbnailURL = await snapshot.ref.getDownloadURL();
    return { thumbPath, thumbnailURL };
  } catch (e) {
    console.warn('uploadThumbnail gagal:', e);
    return null;
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

  // Gambar — terus papar, tiada delay
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) {
    return `<img src="${escHtml(url)}" alt="${escHtml(file.name)}"
      style="max-width:100%;max-height:90vh;object-fit:contain;margin:auto;display:block;padding:1rem;">`;
  }

  // Video — terus main
  if (['mp4','webm','ogg','mov'].includes(ext)) {
    return `
      <video controls autoplay style="max-width:100%;max-height:90vh;margin:auto;display:block;">
        <source src="${escHtml(url)}">
        <p style="color:#fff;text-align:center;padding:2rem;">Pelayar anda tidak menyokong video HTML5.</p>
      </video>`;
  }

  // PDF — render menggunakan PDF.js (halaman pertama muncul dalam ~1 saat)
  if (ext === 'pdf') {
    return `
      <div id="pdfContainer" style="overflow-y:auto;width:100%;height:100%;background:#525659;padding:16px;display:flex;flex-direction:column;gap:12px;align-items:center;">
        <div class="viewer-loading" id="viewerLoading">
          <div class="viewer-spinner"></div>
          <p>Memuatkan PDF...</p>
        </div>
      </div>`;
  }

  // Word (.docx) — docx-preview (render terus dalam browser)
  if (ext === 'docx') {
    return `
      <div class="viewer-loading" id="viewerLoading">
        <div class="viewer-spinner"></div>
        <p>Memuatkan dokumen Word...</p>
      </div>
      <div id="docxContainer" class="docx-container" style="display:none"></div>`;
  }

  // Word lama (.doc) — tidak boleh dipapar, tawar muat turun
  if (ext === 'doc') {
    return `
      <div class="viewer-fallback">
        <div class="big-icon">📝</div>
        <h4>${escHtml(file.name)}</h4>
        <p>Format .doc lama tidak boleh dipapar secara langsung.<br>Sila muat turun untuk membukanya.</p>
        <a href="${escHtml(url)}" target="_blank" download="${escHtml(file.name)}" class="btn-open-tab">⬇️ Muat Turun Fail</a>
      </div>`;
  }

  // Excel (.xlsx / .xls) — SheetJS (render jadual HTML)
  if (['xlsx', 'xls'].includes(ext)) {
    return `
      <div class="viewer-loading" id="viewerLoading">
        <div class="viewer-spinner"></div>
        <p>Memuatkan hamparan Excel...</p>
      </div>
      <div id="excelContainer" class="excel-container" style="display:none"></div>`;
  }

  // Jenis lain — fallback dengan muat turun
  return `
    <div class="viewer-fallback">
      <div class="big-icon">📎</div>
      <h4>${escHtml(file.name)}</h4>
      <p>Jenis fail ini tidak boleh dipapar secara langsung.<br>Sila muat turun untuk membukanya.</p>
      <a href="${escHtml(url)}" target="_blank" download="${escHtml(file.name)}" class="btn-open-tab">⬇️ Muat Turun Fail</a>
    </div>`;
}

/**
 * Render PDF menggunakan PDF.js — halaman pertama muncul serta-merta.
 * @param {string} url - URL fail PDF
 */
async function renderPDF(url) {
  const container = document.getElementById('pdfContainer');
  const loadingEl = document.getElementById('viewerLoading');
  if (!container) return;

  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const pdf = await pdfjsLib.getDocument(url).promise;
    if (loadingEl) loadingEl.remove();

    // Render setiap halaman — halaman pertama terus nampak
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page     = await pdf.getPage(pageNum);
      const scale    = Math.min(1.6, (container.clientWidth - 32) / page.getViewport({ scale: 1 }).width);
      const viewport = page.getViewport({ scale });

      const canvas  = document.createElement('canvas');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = 'max-width:100%;box-shadow:0 2px 12px rgba(0,0,0,0.4);background:#fff;';
      container.appendChild(canvas);

      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    }
  } catch (e) {
    console.error('PDF.js render error:', e);
    if (container) {
      container.innerHTML = `
        <div class="viewer-fallback">
          <div class="big-icon">📄</div>
          <h4>PDF tidak dapat dipapar</h4>
          <p>Sila muat turun fail untuk membukanya.</p>
          <a href="${escHtml(url)}" target="_blank" download class="btn-open-tab">⬇️ Muat Turun PDF</a>
        </div>`;
    }
  }
}

/**
 * Render fail Word (.docx) menggunakan docx-preview.
 * @param {string} url - URL fail .docx
 */
async function renderDocx(url) {
  const container = document.getElementById('docxContainer');
  const loadingEl = document.getElementById('viewerLoading');
  if (!container) return;

  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    if (loadingEl) loadingEl.remove();
    container.style.display = 'block';
    await docx.renderAsync(blob, container, null, {
      className: 'docx-render',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: true,
      ignoreFonts: false,
      breakPages: true,
      useBase64URL: true,
    });
  } catch (e) {
    console.error('docx-preview error:', e);
    if (container) {
      container.style.display = 'block';
      container.innerHTML = `
        <div class="viewer-fallback">
          <div class="big-icon">📝</div>
          <h4>Dokumen tidak dapat dipapar</h4>
          <p>Sila muat turun fail untuk membukanya.</p>
          <a href="${escHtml(url)}" target="_blank" download class="btn-open-tab">⬇️ Muat Turun Dokumen</a>
        </div>`;
    }
  }
}

/**
 * Render hamparan Excel (.xlsx/.xls) menggunakan SheetJS.
 * @param {string} url - URL fail Excel
 */
async function renderExcel(url) {
  const container = document.getElementById('excelContainer');
  const loadingEl = document.getElementById('viewerLoading');
  if (!container) return;

  try {
    const resp = await fetch(url);
    const arrayBuf = await resp.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(arrayBuf), { type: 'array' });

    if (loadingEl) loadingEl.remove();
    container.style.display = 'block';

    // Bina tab untuk setiap helaian
    const tabBar = document.createElement('div');
    tabBar.className = 'excel-tabs';
    const tableArea = document.createElement('div');
    tableArea.className = 'excel-table-area';
    container.appendChild(tabBar);
    container.appendChild(tableArea);

    wb.SheetNames.forEach((name, i) => {
      const tab = document.createElement('button');
      tab.className = 'excel-tab' + (i === 0 ? ' active' : '');
      tab.textContent = name;
      tab.onclick = () => {
        document.querySelectorAll('.excel-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        showSheet(wb, name, tableArea);
      };
      tabBar.appendChild(tab);
    });

    showSheet(wb, wb.SheetNames[0], tableArea);
  } catch (e) {
    console.error('SheetJS error:', e);
    if (container) {
      container.style.display = 'block';
      container.innerHTML = `
        <div class="viewer-fallback">
          <div class="big-icon">📗</div>
          <h4>Hamparan tidak dapat dipapar</h4>
          <p>Sila muat turun fail untuk membukanya.</p>
          <a href="${escHtml(url)}" target="_blank" download class="btn-open-tab">⬇️ Muat Turun Fail</a>
        </div>`;
    }
  }
}

/**
 * Papar satu helaian Excel sebagai jadual HTML.
 */
function showSheet(wb, sheetName, area) {
  const ws = wb.Sheets[sheetName];
  const html = XLSX.utils.sheet_to_html(ws, { editable: false });
  area.innerHTML = `<div class="excel-table-wrap">${html}</div>`;
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

  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'pdf')                        renderPDF(file.downloadURL);
  if (ext === 'docx')                       renderDocx(file.downloadURL);
  if (['xlsx','xls'].includes(ext))         renderExcel(file.downloadURL);
}
