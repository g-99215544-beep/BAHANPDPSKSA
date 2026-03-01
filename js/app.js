/* ═══════════════════════════════════════════════════════════
   app.js — Logik Utama Aplikasi
   ═══════════════════════════════════════════════════════════ */

// ── KEADAAN GLOBAL (STATE) ────────────────────────────────────
let S = {
  loggedIn:   false,   // Guru sudah log masuk?
  subj:       null,    // ID subjek yang dipilih
  cat:        null,    // 'latihan' atau 'peperiksaan'
  year:       null,    // Tahun dipilih (1–6)
  searchQ:    '',      // Kata kunci carian
  uploadCtx:  null,    // Konteks muat naik semasa
  selFiles:   [],      // Fail-fail yang dipilih untuk muat naik

  // Data dari Firebase (dikemaskini secara masa nyata)
  files:      [],      // Semua fail
  peepData:   {},      // Topik peperiksaan { bm: { 1: ['Ujian 1', ...] } }
  dskpCustom: {},      // Nama tajuk tersuai { math: { 5: { 1: 'Pecahan, Perpuluhan...' } } }
  stats:      { downloads: 0 },
};

// ── PERMULAAN ─────────────────────────────────────────────────
function init() {
  // Dengar data Firebase secara masa nyata
  dbListenFiles(files => {
    S.files = files;
    reRender();
    renderSidebar();
    renderStats();
  });

  dbListenPeep(peep => {
    S.peepData = peep || {};
    reRender();
  });

  dbListenStats(stats => {
    S.stats = stats || { downloads: 0 };
    renderStats();
  });

  dbListenDskpCustom(custom => {
    S.dskpCustom = custom || {};
    reRender();
  });

  renderSidebar();
  renderStats();
  renderAuth();
  viewHome();
}

// ── PEMBANTU (HELPERS) ────────────────────────────────────────

/** Dapatkan topik peperiksaan dari cache */
function getPeep(sj, y) {
  return (S.peepData[sj] && S.peepData[sj][y]) ? S.peepData[sj][y] : [];
}

/** Dapatkan nama tajuk latihan — custom jika ada, DSKP jika tidak */
function getTopicName(sj, year, idx) {
  return (S.dskpCustom[sj]?.[year]?.[idx]) || DSKP[sj][year][idx];
}

// ── SIDEBAR ───────────────────────────────────────────────────
function renderSidebar() {
  document.getElementById('sidebarEl').innerHTML = SUBJECTS.map(s => {
    const n = S.files.filter(f => f.sj === s.id).length;
    return `<button class="subj-btn ${S.subj === s.id ? 'active' : ''}" onclick="navSubj('${s.id}')">
      <span class="subj-emoji">${s.emoji}</span>${s.name}
      <span class="subj-count">${n}</span>
    </button>`;
  }).join('');
}

// ── STATISTIK ─────────────────────────────────────────────────
function renderStats() {
  document.getElementById('statsBar').innerHTML = `
    <div class="stat-mini"><strong>${S.files.length}</strong>Fail</div>
    <div class="stat-mini"><strong>5</strong>Subjek</div>
    <div class="stat-mini"><strong>${S.stats.downloads || 0}</strong>Muat Turun</div>`;
}

// ── PENGESAHAN (UI) ───────────────────────────────────────────
function renderAuth() {
  document.getElementById('authArea').innerHTML = S.loggedIn
    ? `<div class="user-info"><div class="avatar">G</div><span>Guru</span></div>
       <button class="btn-logout" onclick="doLogout()">Log Keluar</button>`
    : `<button class="btn-login" onclick="openModal('loginModal')">🔐 Log Masuk Guru</button>`;
}

// ── NAVIGASI ──────────────────────────────────────────────────
function navSubj(id) {
  S.subj = id; S.cat = null; S.year = null; S.searchQ = '';
  document.getElementById('searchInput').value = '';
  refresh(); viewCat();
}
function navCat(cat)  { S.cat = cat; S.year = null; refresh(); viewYear(); }
function navYear(y)   { S.year = y;  refresh(); viewTopics(); }

function navBack() {
  if (S.year !== null)     { S.year = null; refresh(); viewYear(); }
  else if (S.cat !== null) { S.cat = null;  refresh(); viewCat(); }
  else if (S.subj !== null){ S.subj = null; refresh(); viewHome(); }
}

function refresh()  { renderSidebar(); renderBc(); }
function reRender() {
  renderSidebar(); renderStats();
  if (S.searchQ)           showSearch(S.searchQ);
  else if (S.year !== null) viewTopics();
  else if (S.cat  !== null) viewYear();
  else if (S.subj !== null) viewCat();
  else                      viewHome();
}

// ── BREADCRUMB ────────────────────────────────────────────────
function renderBc() {
  const bar = document.getElementById('bcBar');
  const parts = [];
  if (S.subj) {
    const s = SUBJECTS.find(x => x.id === S.subj);
    parts.push({ l: s.emoji + ' ' + s.name, fn: () => navSubj(S.subj) });
  }
  if (S.cat)       parts.push({ l: S.cat === 'latihan' ? '📝 Latihan' : '📋 Peperiksaan', fn: () => navCat(S.cat) });
  if (S.year !== null) parts.push({ l: 'Tahun ' + S.year, fn: null });

  if (!parts.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';

  let h = `<button class="bc-back" onclick="navBack()">← Kembali</button>
    <span class="bc-item" onclick="S.subj=null;S.cat=null;S.year=null;renderSidebar();renderBc();viewHome()">🏠 Laman Utama</span>`;
  parts.forEach((p, i) => {
    h += `<span class="bc-sep">›</span>`;
    h += (p.fn && i < parts.length - 1)
      ? `<span class="bc-item" onclick="(${p.fn})()">${p.l}</span>`
      : `<span class="bc-item active">${p.l}</span>`;
  });
  bar.innerHTML = h;
}

// ── PAPARAN: LAMAN UTAMA ──────────────────────────────────────
function viewHome() {
  S.subj = null; S.cat = null; S.year = null;
  renderBc(); renderSidebar();
  document.getElementById('mainEl').innerHTML = `
    <div class="view-title">Pilih Subjek</div>
    <div class="view-sub">Klik subjek untuk mula mencari bahan pembelajaran</div>
    <div class="home-grid">
      ${SUBJECTS.map((s, i) => {
        const n = S.files.filter(f => f.sj === s.id).length;
        return `<div class="home-subj-card anim d${i+1}" onclick="navSubj('${s.id}')">
          <div style="font-size:2.5rem;margin-bottom:0.6rem">${s.emoji}</div>
          <div style="font-family:'Baloo 2',cursive;font-size:1rem;font-weight:800;color:var(--primary)">${s.name}</div>
          <div style="font-size:0.75rem;font-weight:800;color:var(--muted);margin-top:6px;background:var(--bg);padding:3px 10px;border-radius:12px;display:inline-block">${n} fail</div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── PAPARAN: KATEGORI ─────────────────────────────────────────
function viewCat() {
  const s = SUBJECTS.find(x => x.id === S.subj);
  const nl = S.files.filter(f => f.sj === S.subj && f.cat === 'latihan').length;
  const np = S.files.filter(f => f.sj === S.subj && f.cat === 'peperiksaan').length;
  document.getElementById('mainEl').innerHTML = `
    <div class="view-title anim">${s.emoji} ${s.name}</div>
    <div class="view-sub anim">Pilih kategori bahan</div>
    <div class="cat-grid anim">
      <div class="cat-card" onclick="navCat('latihan')">
        <span class="cat-icon">📝</span>
        <div class="cat-name">Latihan</div>
        <div class="cat-desc">Latihan bertajuk mengikut silibus DSKP semasa</div>
        <div class="cat-badge">${nl} fail</div>
      </div>
      <div class="cat-card" onclick="navCat('peperiksaan')">
        <span class="cat-icon">📋</span>
        <div class="cat-name">Peperiksaan</div>
        <div class="cat-desc">Ujian bulanan, pertengahan tahun, akhir tahun</div>
        <div class="cat-badge">${np} fail</div>
      </div>
    </div>`;
}

// ── PAPARAN: TAHUN ────────────────────────────────────────────
function viewYear() {
  const s    = SUBJECTS.find(x => x.id === S.subj);
  const catL = S.cat === 'latihan' ? 'Latihan' : 'Peperiksaan';
  document.getElementById('mainEl').innerHTML = `
    <div class="view-title anim">${s.emoji} ${s.name} › ${catL}</div>
    <div class="view-sub anim">Pilih tahun</div>
    <div class="year-grid">
      ${[1,2,3,4,5,6].map((y, i) => {
        const n = S.files.filter(f => f.sj === S.subj && f.cat === S.cat && f.year === y).length;
        return `<div class="year-card anim d${i+1}" onclick="navYear(${y})">
          <div class="year-num">${y}</div>
          <div class="year-label">Tahun ${y}</div>
          <div class="year-count">${n} fail</div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── PAPARAN: TOPIK & FAIL ─────────────────────────────────────
function viewTopics() {
  const s      = SUBJECTS.find(x => x.id === S.subj);
  const catL   = S.cat === 'latihan' ? 'Latihan' : 'Peperiksaan';
  const isLat  = S.cat === 'latihan';
  const topics = isLat ? DSKP[S.subj][S.year] : getPeep(S.subj, S.year);

  const uploadBtn = S.loggedIn
    ? `<button class="btn-upload-main" onclick="openUploadModal()">⬆️ Muat Naik Latihan</button>`
    : '';
  const addPeepBtn = S.loggedIn && !isLat
    ? `<button class="btn-add-peeper" onclick="openAddPeep()">➕ Tambah Peperiksaan</button>`
    : '';

  let topicsHtml = '';
  if (topics.length === 0) {
    topicsHtml = `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <h3>Tiada topik</h3>
      <p>${S.loggedIn ? 'Tambah peperiksaan/ujian baharu menggunakan butang di atas.' : 'Belum ada topik untuk tahun ini.'}</p>
    </div>`;
  } else {
    topicsHtml = `<div class="topic-list">${topics.map((rawName, idx) => {
      const tName  = isLat ? getTopicName(S.subj, S.year, idx) : rawName;
      const tFiles = S.files.filter(f =>
        f.sj === S.subj && f.cat === S.cat && f.year === S.year && f.ti === idx
      );
      const delPeepBtn = S.loggedIn && !isLat
        ? `<button class="btn-sm btn-del" onclick="delPeepTopic(${idx})" title="Padam topik" style="margin-left:4px">🗑️</button>` : '';
      const editBtn = S.loggedIn && isLat
        ? `<button class="btn-sm btn-edit-topic" onclick="event.stopPropagation();startEditTopic(${idx})" title="Edit nama tajuk">✏️</button>` : '';
      const uploadTopicBtn = S.loggedIn
        ? `<div class="upload-to-topic">
             <button class="btn-upload-topic" onclick="openUploadToTopic(${idx},'${tName.replace(/'/g,"\\'")}')">
               ⬆️ Tambah Fail ke Tajuk Ini
             </button>
           </div>` : '';

      return `<div class="topic-card" data-idx="${idx}">
        <div class="topic-header" onclick="toggleTopic(this)">
          <div class="topic-num">${idx + 1}</div>
          <div class="topic-name">${escHtml(tName)}</div>
          <div class="topic-file-count">${tFiles.length} fail</div>
          ${editBtn}${delPeepBtn}
          <div class="topic-chevron">▼</div>
        </div>
        <div class="topic-files">
          ${tFiles.length
            ? tFiles.map(f => renderFileItem(f)).join('')
            : `<div class="no-files">Tiada fail lagi untuk tajuk ini.</div>`
          }
          ${uploadTopicBtn}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  document.getElementById('mainEl').innerHTML = `
    <div class="section-header">
      <div class="section-title">📚 ${s.emoji} ${s.name} › ${catL} › Tahun ${S.year}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${isLat ? uploadBtn : addPeepBtn + (S.loggedIn ? uploadBtn : '')}</div>
    </div>
    ${topicsHtml}`;
}

/** Bina HTML satu item fail */
function renderFileItem(f) {
  const { icon, cls } = getFileTypeInfo(f.name);
  const delBtn = S.loggedIn
    ? `<button class="btn-sm btn-del" onclick="delFile('${f.id}')" title="Padam">🗑️</button>`
    : '';
  return `<div class="file-item">
    <div class="file-type-icon ${cls}">${icon}</div>
    <div class="file-info">
      <div class="file-name" onclick="handleView('${f.id}')" title="Klik untuk lihat">${escHtml(f.name)}</div>
      <div class="file-meta">${escHtml(f.size)} · ${escHtml(f.date)}</div>
    </div>
    <div class="file-actions">
      <button class="btn-view" onclick="handleView('${f.id}')">👁️ Lihat</button>
      <a class="btn-dl" href="${escHtml(f.downloadURL)}" target="_blank" onclick="handleDownload('${f.id}')">⬇️</a>
      ${delBtn}
    </div>
  </div>`;
}

/** Buka viewer fail */
function handleView(id) {
  const file = S.files.find(f => f.id === id);
  if (!file) { toast('Fail tidak ditemui.', 'error'); return; }
  openFileViewer(file);
}

/** Rekod muat turun */
function handleDownload(id) {
  dbIncDL().catch(console.warn);
}

/** Togel (buka/tutup) senarai fail dalam topik */
function toggleTopic(header) {
  const filesEl  = header.nextElementSibling;
  const chevron  = header.querySelector('.topic-chevron');
  const isOpen   = filesEl.classList.contains('open');
  filesEl.classList.toggle('open', !isOpen);
  chevron.classList.toggle('open', !isOpen);
}

// ── CARIAN ────────────────────────────────────────────────────
function handleSearch(q) {
  S.searchQ = q.trim();
  if (!S.searchQ) { reRender(); return; }
  showSearch(S.searchQ);
}

function showSearch(q) {
  const ql  = q.toLowerCase();
  const res = S.files.filter(f =>
    f.name.toLowerCase().includes(ql)    ||
    f.tName?.toLowerCase().includes(ql)  ||
    f.sjName?.toLowerCase().includes(ql)
  );
  const catLabel = c => c === 'latihan' ? 'Latihan' : 'Peperiksaan';

  document.getElementById('mainEl').innerHTML = `
    <div style="margin-bottom:1rem">
      <span class="view-title">Hasil Carian: "${escHtml(q)}"</span>
      <span class="view-sub" style="display:inline"> (${res.length} fail ditemui)</span>
    </div>
    ${res.length ? res.map(f => {
      const { icon, cls } = getFileTypeInfo(f.name);
      return `<div class="sr-item">
        <div class="file-type-icon ${cls}">${icon}</div>
        <div style="flex:1;min-width:0">
          <div class="file-name" onclick="handleView('${f.id}')" style="cursor:pointer">${escHtml(f.name)}</div>
          <div class="sr-path">
            <span>${escHtml(f.sjName)}</span> › <span>${catLabel(f.cat)}</span> › Tahun ${f.year} › ${escHtml(f.tName || '')}
          </div>
          <div class="file-meta">${escHtml(f.size)} · ${escHtml(f.date)}</div>
        </div>
        <div class="file-actions">
          <button class="btn-view" onclick="handleView('${f.id}')">👁️ Lihat</button>
          <a class="btn-dl" href="${escHtml(f.downloadURL)}" target="_blank" onclick="handleDownload('${f.id}')">⬇️</a>
        </div>
      </div>`;
    }).join('') : `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>Tiada hasil</h3>
      <p>Cuba kata kunci yang berbeza.</p>
    </div>`}`;
}

// ── MUAT NAIK ─────────────────────────────────────────────────
function openUploadModal() {
  const s = SUBJECTS.find(x => x.id === S.subj);
  const topics = DSKP[S.subj][S.year];
  S.uploadCtx = { sj: S.subj, cat: 'latihan', year: S.year, ti: null, tName: null };
  document.getElementById('uploadSubtitle').textContent = `${s.name} › Latihan › Tahun ${S.year}`;
  document.getElementById('uploadFields').innerHTML = `
    <div class="form-group">
      <label>Pilih Tajuk</label>
      <select id="topicSel" onchange="S.uploadCtx.ti=parseInt(this.value);S.uploadCtx.tName=this.options[this.selectedIndex].text.substring(4)">
        <option value="">-- Pilih tajuk --</option>
        ${topics.map((t, i) => `<option value="${i}">${i+1}. ${escHtml(getTopicName(S.subj, S.year, i))}</option>`).join('')}
      </select>
    </div>`;
  resetUploadModal();
  openModal('uploadModal');
}

function openUploadToTopic(ti, tName) {
  const s = SUBJECTS.find(x => x.id === S.subj);
  const catL = S.cat === 'latihan' ? 'Latihan' : 'Peperiksaan';
  S.uploadCtx = { sj: S.subj, cat: S.cat, year: S.year, ti, tName };
  document.getElementById('uploadSubtitle').textContent = `${s.name} › ${catL} › Tahun ${S.year} › ${tName}`;
  document.getElementById('uploadFields').innerHTML = `
    <div style="background:var(--bg);border-radius:8px;padding:9px 13px;font-size:0.85rem;font-weight:700;color:var(--primary);margin-bottom:0.5rem">
      📌 ${escHtml(tName)}
    </div>`;
  resetUploadModal();
  openModal('uploadModal');
}

function resetUploadModal() {
  S.selFiles = [];
  renderSelFiles();
  document.getElementById('uploadOk').classList.remove('show');
  document.getElementById('uploadProgress').classList.remove('show');
  const btn = document.getElementById('uploadBtn');
  if (btn) { btn.disabled = false; btn.textContent = 'Muat Naik Semua Fail'; }
}

function onFileSelect(files) {
  Array.from(files).forEach(f => {
    const err = validateFile(f);
    if (err) { toast('⚠️ ' + err, 'error'); return; }
    if (!S.selFiles.find(x => x.name === f.name && x.size === f.size)) {
      S.selFiles.push(f);
    }
  });
  renderSelFiles();
}

function onDrop(e) {
  e.preventDefault();
  document.getElementById('fileDrop').classList.remove('dragover');
  onFileSelect(e.dataTransfer.files);
}

function renderSelFiles() {
  document.getElementById('selFilesList').innerHTML = S.selFiles.map((f, i) =>
    `<div class="sel-file">
      ${getFileTypeInfo(f.name).icon} ${escHtml(f.name)}
      <span style="color:var(--muted)">(${fmtSize(f.size)})</span>
      <button class="sel-file-remove" onclick="S.selFiles.splice(${i},1);renderSelFiles()">✕</button>
    </div>`
  ).join('');
}

async function doUpload() {
  const ctx = S.uploadCtx;
  if (!ctx) return;

  // Selesaikan pemilihan tajuk untuk latihan via dropdown
  if (ctx.cat === 'latihan' && ctx.ti === null) {
    const sel = document.getElementById('topicSel');
    if (!sel || sel.value === '') { toast('⚠️ Sila pilih tajuk terlebih dahulu!', 'error'); return; }
    ctx.ti    = parseInt(sel.value);
    ctx.tName = DSKP[ctx.sj][ctx.year][ctx.ti];
  }

  if (S.selFiles.length === 0) { toast('⚠️ Sila pilih sekurang-kurangnya satu fail!', 'error'); return; }

  const s   = SUBJECTS.find(x => x.id === ctx.sj);
  const btn = document.getElementById('uploadBtn');
  const prog = document.getElementById('uploadProgress');
  const progBar  = prog.querySelector('.progress-bar');
  const progLabel = prog.querySelector('.progress-label');

  btn.disabled = true;
  btn.textContent = 'Memuat naik...';
  prog.classList.add('show');

  const filesToUpload = [...S.selFiles];
  let success = 0;

  try {
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      progLabel.textContent = `Fail ${i+1} / ${filesToUpload.length}: ${escHtml(file.name)}`;
      progBar.style.width = '0%';

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
          const thumbResult = await uploadThumbnail(thumbBlob, baseStoragePath);
          if (thumbResult) {
            thumbPath    = thumbResult.thumbPath;
            thumbnailURL = thumbResult.thumbnailURL;
          }
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
      success++;
    }

    S.selFiles = [];
    renderSelFiles();
    document.getElementById('uploadOk').classList.add('show');
    toast(`✅ ${success} fail berjaya dimuat naik!`, 'success');
    setTimeout(() => { closeModal('uploadModal'); reRender(); }, 1200);

  } catch (err) {
    console.error('Upload error:', err);
    toast('❌ Ralat semasa muat naik: ' + (err.message || 'Cuba lagi.'), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Muat Naik Semua Fail';
    prog.classList.remove('show');
  }
}

// ── PEPERIKSAAN TOPIK ─────────────────────────────────────────
function openAddPeep() {
  const s = SUBJECTS.find(x => x.id === S.subj);
  document.getElementById('addPeepSub').textContent = `${s.name} › Peperiksaan › Tahun ${S.year}`;
  document.getElementById('peepNameInput').value = '';
  openModal('addPeepModal');
}

async function doAddPeep() {
  const n = document.getElementById('peepNameInput').value.trim();
  if (!n) { toast('⚠️ Sila masukkan nama peperiksaan!', 'error'); return; }
  const tops = [...getPeep(S.subj, S.year), n];
  await dbSavePeep(S.subj, S.year, tops);
  closeModal('addPeepModal');
  toast('✅ Peperiksaan berjaya ditambah!', 'success');
}

// ── PADAM ─────────────────────────────────────────────────────
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
  toast('Fail dipadam', '');
  // S.files dikemas kini secara automatik melalui listener
}

async function delPeepTopic(idx) {
  if (!confirm('Padam topik ini dan SEMUA failnya?')) return;
  const tops = getPeep(S.subj, S.year);

  // Padam fail dari Storage & DB
  const topFiles = S.files.filter(
    f => f.sj === S.subj && f.cat === 'peperiksaan' && f.year === S.year && f.ti === idx
  );
  for (const f of topFiles) {
    await deleteFileFromStorage(f.storagePath);
    if (f.thumbPath) await deleteFileFromStorage(f.thumbPath);
    await dbDeleteFile(f.id);
  }

  // Kemas kini indeks fail yang tinggal
  const reindex = S.files.filter(
    f => f.sj === S.subj && f.cat === 'peperiksaan' && f.year === S.year && f.ti > idx
  );
  for (const f of reindex) {
    await dbSaveFile({ ...f, ti: f.ti - 1 });
  }

  // Padam topik dari senarai
  tops.splice(idx, 1);
  await dbSavePeep(S.subj, S.year, tops);
  toast('Topik dipadam', '');
}

// ── EDIT NAMA TAJUK LATIHAN ───────────────────────────────────

/** Tunjukkan input inline untuk edit nama tajuk */
function startEditTopic(idx) {
  const card   = document.querySelector(`.topic-card[data-idx="${idx}"]`);
  if (!card) return;
  const nameEl = card.querySelector('.topic-name');
  const current = getTopicName(S.subj, S.year, idx);
  nameEl.innerHTML = `
    <input class="topic-edit-input" type="text" value="${escHtml(current)}"
           onkeydown="if(event.key==='Enter'){event.preventDefault();saveTopicName(${idx},this.value)}
                      else if(event.key==='Escape') reRender()">
    <button class="btn-edit-confirm" onclick="saveTopicName(${idx},this.previousElementSibling.value)" title="Simpan">✓</button>
    <button class="btn-edit-cancel"  onclick="reRender()" title="Batal">✕</button>`;
  nameEl.querySelector('input').focus();
  nameEl.querySelector('input').select();
}

/** Simpan nama tajuk baharu ke Firebase */
async function saveTopicName(idx, newName) {
  newName = newName.trim();
  if (!newName) { toast('⚠️ Nama tajuk tidak boleh kosong!', 'error'); return; }
  try {
    await dbSaveDskpCustom(S.subj, S.year, idx, newName);
    toast('✅ Nama tajuk dikemaskini!', 'success');
  } catch (e) {
    console.error('Gagal simpan nama tajuk:', e);
    toast('❌ Gagal simpan. Cuba lagi.', 'error');
  }
}

// ── MODAL HELPERS ─────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById('loginErr')?.classList.remove('show');
}

// Tutup modal apabila klik luar
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => {
    if (e.target === el) closeModal(el.id);
  });
});

// ── TOAST ─────────────────────────────────────────────────────
function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = 'toast show ' + (type || '');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── MULA ──────────────────────────────────────────────────────
init();
