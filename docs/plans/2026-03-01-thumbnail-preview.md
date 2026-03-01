# Thumbnail JPG Preview System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Generate a JPG thumbnail at upload time for PDF and DOCX files, then show that thumbnail instantly when previewing instead of running the slow renderer.

**Architecture:** At upload, generate thumbnail from local File object (no re-download needed) using PDF.js for PDFs and docx-preview + html2canvas for DOCX. Upload thumbnail alongside original. Store `thumbnailURL` + `thumbPath` in database. Viewer checks for `thumbnailURL` first — if present, show `<img>` instantly. PDF gets an optional "Lihat Penuh" button to trigger full PDF.js rendering.

**Tech Stack:** Vanilla JS, Firebase Storage v8 compat, Firebase RTDB v8 compat, PDF.js 3.11.174 (already loaded), docx-preview 0.3.2 (already loaded), html2canvas 1.4.1 (new)

---

## Task 1: Add html2canvas CDN to index.html

**Files:**
- Modify: `index.html`

**Step 1: Add script tag after SheetJS CDN**

Find the SheetJS script tag and add html2canvas below it:

```html
<!-- ══════════════════ html2canvas (DOCX thumbnail) ══════════════════ -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

**Step 2: Verify in browser console**

Open app in browser, open DevTools Console, run:
```javascript
typeof html2canvas
```
Expected: `"function"`

**Step 3: Commit**
```bash
git add index.html
git commit -m "feat: tambah html2canvas CDN untuk thumbnail DOCX"
```

---

## Task 2: Add thumbnail generation functions to storage.js

**Files:**
- Modify: `js/storage.js` (after `deleteFileFromStorage`, around line 155)

**Step 1: Add `generatePdfThumbnail(file)` function**

Insert after `deleteFileFromStorage()`:

```javascript
/**
 * Jana thumbnail JPG halaman 1 daripada fail PDF tempatan.
 * @param {File} file - File object PDF
 * @returns {Promise<Blob|null>} - JPG blob atau null jika gagal
 */
async function generatePdfThumbnail(file) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await file.arrayBuffer();
    const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 1 });
    const scale    = Math.min(1.5, 900 / viewport.width);
    const vp       = page.getViewport({ scale });

    const canvas    = document.createElement('canvas');
    canvas.width    = vp.width;
    canvas.height   = vp.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

    return await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.85));
  } catch (e) {
    console.warn('generatePdfThumbnail gagal:', e);
    return null;
  }
}
```

**Step 2: Add `generateDocxThumbnail(file)` function**

Insert right after `generatePdfThumbnail`:

```javascript
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
```

**Step 3: Add `uploadThumbnail(blob, basePath)` function**

Insert after `generateDocxThumbnail`:

```javascript
/**
 * Muat naik blob thumbnail JPG ke Firebase Storage.
 * @param {Blob}   blob     - JPG blob
 * @param {string} basePath - Path fail original (tanpa extension)
 * @returns {Promise<{ thumbPath: string, thumbnailURL: string }>}
 */
async function uploadThumbnail(blob, basePath) {
  const thumbPath = basePath + '_thumb.jpg';
  const ref = fbStorage.ref(thumbPath);
  const task = await ref.put(blob, { contentType: 'image/jpeg' });
  const thumbnailURL = await task.ref.getDownloadURL();
  return { thumbPath, thumbnailURL };
}
```

**Step 4: Verify syntax — no browser errors**

Open app in browser, check Console for any syntax errors.

**Step 5: Commit**
```bash
git add js/storage.js
git commit -m "feat: tambah generatePdfThumbnail, generateDocxThumbnail, uploadThumbnail"
```

---

## Task 3: Update `doUpload()` in app.js to generate + store thumbnails

**Files:**
- Modify: `js/app.js` — `doUpload()` function (around line 421–487)

**Step 1: Locate the upload loop**

Find this block inside `doUpload()`:
```javascript
const { storagePath, downloadURL } = await uploadFileToStorage(
  file, ctx.sj, ctx.cat, ctx.year, ctx.tName,
  pct => { progBar.style.width = pct + '%'; }
);

await dbSaveFile({
  id:          uid(),
  name:        file.name,
  ...
  storagePath: storagePath,
  downloadURL: downloadURL,
});
```

**Step 2: Replace the loop body with two-phase upload**

Replace the block above with:

```javascript
// Fasa 1: Upload fail original (0 → 80%)
const { storagePath, downloadURL } = await uploadFileToStorage(
  file, ctx.sj, ctx.cat, ctx.year, ctx.tName,
  pct => { progBar.style.width = (pct * 0.8) + '%'; }
);

// Fasa 2: Jana & upload thumbnail (80 → 100%)
let thumbnailURL = null;
let thumbPath    = null;
const ext = file.name.split('.').pop().toLowerCase();

progLabel.textContent = `Fail ${i+1} / ${filesToUpload.length}: Jana pratonton...`;
progBar.style.width = '85%';

try {
  let thumbBlob = null;
  if (ext === 'pdf')  thumbBlob = await generatePdfThumbnail(file);
  if (ext === 'docx') thumbBlob = await generateDocxThumbnail(file);

  if (thumbBlob) {
    const baseStoragePath = storagePath.replace(/\.[^/.]+$/, '');
    ({ thumbPath, thumbnailURL } = await uploadThumbnail(thumbBlob, baseStoragePath));
  }
} catch (thumbErr) {
  console.warn('Thumbnail gagal, teruskan tanpa thumbnail:', thumbErr);
}

progBar.style.width = '100%';

await dbSaveFile({
  id:          uid(),
  name:        file.name,
  size:        fmtSize(file.size),
  date:        fmtDate(),
  sj:          ctx.sj,
  sjName:      s.name,
  cat:         ctx.cat,
  year:        ctx.year,
  ti:          ctx.ti,
  tName:       ctx.tName,
  storagePath: storagePath,
  downloadURL: downloadURL,
  thumbnailURL: thumbnailURL,
  thumbPath:    thumbPath,
});
```

**Step 3: Manual test — upload a PDF**

1. Open app, log in as admin
2. Upload a PDF file
3. Open Firebase Storage console — verify `_thumb.jpg` file exists alongside original
4. Open Firebase RTDB console — verify `thumbnailURL` field is populated

**Step 4: Manual test — upload a DOCX**

1. Upload a .docx file
2. Verify `_thumb.jpg` in Storage and `thumbnailURL` in DB
3. Check Console — no errors during thumbnail generation

**Step 5: Commit**
```bash
git add js/app.js
git commit -m "feat: jana dan simpan thumbnail JPG semasa upload PDF/DOCX"
```

---

## Task 4: Update `buildViewerHTML()` to show thumbnail instantly

**Files:**
- Modify: `js/storage.js` — `buildViewerHTML()` and `openFileViewer()`

**Step 1: Update `buildViewerHTML` signature and add thumbnail path**

Change `buildViewerHTML(file)` — add thumbnail check at the top of the function, before the ext checks:

```javascript
function buildViewerHTML(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const url = file.downloadURL;

  // ── Thumbnail tersedia → papar serta-merta ──────────────────
  if (file.thumbnailURL && ['pdf', 'docx'].includes(ext)) {
    const isFullViewable = ext === 'pdf';
    return `
      <div class="thumb-viewer">
        <img src="${escHtml(file.thumbnailURL)}" alt="Preview ${escHtml(file.name)}" class="thumb-img">
        ${isFullViewable ? `
          <div class="thumb-actions">
            <button class="btn-full-view" onclick="loadFullPDF('${escHtml(url)}')">
              📄 Lihat PDF Penuh
            </button>
          </div>` : ''}
      </div>`;
  }
  // ... rest of existing code unchanged ...
```

**Important:** Keep all existing cases (image, video, PDF without thumbnail, DOCX without thumbnail, etc.) unchanged below this new block.

**Step 2: Add `loadFullPDF(url)` function at bottom of storage.js**

```javascript
/**
 * Gantikan thumbnail viewer dengan PDF.js penuh.
 * Dipanggil dari butang "Lihat PDF Penuh".
 * @param {string} url
 */
function loadFullPDF(url) {
  const content = document.getElementById('viewerContent');
  content.innerHTML = `
    <div id="pdfContainer" style="overflow-y:auto;width:100%;height:100%;background:#525659;padding:16px;display:flex;flex-direction:column;gap:12px;align-items:center;">
      <div class="viewer-loading" id="viewerLoading">
        <div class="viewer-spinner"></div>
        <p>Memuatkan PDF...</p>
      </div>
    </div>`;
  renderPDF(url);
}
```

**Step 3: Manual test — PDF with thumbnail**

1. Open app, click on a PDF that was just uploaded (has thumbnail)
2. Modal should open instantly showing the JPG image
3. Click "Lihat PDF Penuh" — should replace image with full PDF.js renderer
4. Verify download button still gives original PDF

**Step 4: Manual test — DOCX with thumbnail**

1. Click on a DOCX with thumbnail
2. Modal opens instantly with JPG preview
3. No "Lihat Penuh" button (not needed for DOCX)
4. Download button gives original .docx

**Step 5: Manual test — old files without thumbnail**

1. Click on an older uploaded PDF (no `thumbnailURL` in DB)
2. Should fall through to existing PDF.js renderer — no regressions

**Step 6: Commit**
```bash
git add js/storage.js
git commit -m "feat: papar thumbnail JPG serta-merta dalam viewer, tambah butang Lihat PDF Penuh"
```

---

## Task 5: Update delete functions to also remove thumbnail

**Files:**
- Modify: `js/app.js` — `delFile()` and `delPeepTopic()`

**Step 1: Update `delFile(id)`**

Find:
```javascript
async function delFile(id) {
  if (!confirm('Padam fail ini daripada sistem?')) return;
  const file = S.files.find(f => f.id === id);
  if (file && file.storagePath) {
    await deleteFileFromStorage(file.storagePath);
  }
  await dbDeleteFile(id);
```

Replace with:
```javascript
async function delFile(id) {
  if (!confirm('Padam fail ini daripada sistem?')) return;
  const file = S.files.find(f => f.id === id);
  if (file && file.storagePath) {
    await deleteFileFromStorage(file.storagePath);
  }
  if (file && file.thumbPath) {
    await deleteFileFromStorage(file.thumbPath);
  }
  await dbDeleteFile(id);
```

**Step 2: Update `delPeepTopic()` loop**

Find the loop inside `delPeepTopic`:
```javascript
for (const f of topFiles) {
  await deleteFileFromStorage(f.storagePath);
  await dbDeleteFile(f.id);
}
```

Replace with:
```javascript
for (const f of topFiles) {
  await deleteFileFromStorage(f.storagePath);
  if (f.thumbPath) await deleteFileFromStorage(f.thumbPath);
  await dbDeleteFile(f.id);
}
```

**Step 3: Manual test — delete a file with thumbnail**

1. Upload a new PDF (gets thumbnail)
2. Delete it as admin
3. Open Firebase Storage console — verify BOTH original AND `_thumb.jpg` are deleted

**Step 4: Commit**
```bash
git add js/app.js
git commit -m "fix: padam thumbnail dari Storage apabila fail dipadam"
```

---

## Task 6: Add CSS for thumbnail viewer

**Files:**
- Modify: `css/style.css` — add after `.btn-open-tab:hover`

**Step 1: Add styles**

```css
/* ── THUMBNAIL VIEWER ──────────────────────────────────────── */
.thumb-viewer {
  display: flex; flex-direction: column;
  align-items: center; width: 100%; height: 100%;
  overflow-y: auto; background: #2a2f3a; padding: 1rem; gap: 1rem;
}
.thumb-img {
  max-width: 100%; max-height: calc(100% - 60px);
  object-fit: contain; border-radius: 6px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.thumb-actions {
  display: flex; gap: 0.75rem; flex-shrink: 0;
}
.btn-full-view {
  background: rgba(255,255,255,0.12); color: #e5e7eb;
  border: 1px solid rgba(255,255,255,0.2); border-radius: 25px;
  padding: 8px 20px; font-family: 'Nunito', sans-serif;
  font-weight: 700; font-size: 0.85rem; cursor: pointer;
  transition: background 0.2s;
}
.btn-full-view:hover { background: rgba(255,255,255,0.22); }
```

**Step 2: Visual check in browser**

1. Open a PDF with thumbnail — image should be centered, subtle background, nice shadow
2. "Lihat PDF Penuh" button should be subtle (not too prominent vs Download button)

**Step 3: Commit**
```bash
git add css/style.css
git commit -m "feat: CSS untuk thumbnail viewer dan butang Lihat PDF Penuh"
```

---

## Task 7: Push and verify

**Step 1: Push branch**
```bash
git push
```

**Step 2: End-to-end test checklist**

- [ ] Upload PDF → `_thumb.jpg` appears in Firebase Storage
- [ ] Upload DOCX → `_thumb.jpg` appears in Firebase Storage
- [ ] Upload Excel → no thumbnail (viewer loads SheetJS as before)
- [ ] Click PDF with thumbnail → modal opens instantly with image
- [ ] Click "Lihat PDF Penuh" → PDF.js renders full document
- [ ] Click DOCX with thumbnail → modal opens instantly with image
- [ ] Download button in viewer gives original file (not thumbnail)
- [ ] Click old PDF (no thumbnail) → falls back to PDF.js renderer
- [ ] Delete file with thumbnail → both files removed from Storage
- [ ] Upload fails halfway → no orphan thumbnail (thumbnail only uploaded after original succeeds)

---

## Notes

- Fail lama tanpa `thumbnailURL` tidak terjejas — viewer fallback ke kod lama secara automatik
- Thumbnail generation boleh gagal tanpa menyebabkan keseluruhan upload gagal (try/catch around thumbnail step)
- DOCX dengan fail yang sangat kompleks (banyak imej embedded) thumbnail mungkin berbeza sedikit dari paparan asal — ini dijangka dan diterima
