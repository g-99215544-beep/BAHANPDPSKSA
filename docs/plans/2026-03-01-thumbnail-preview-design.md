# Design: Sistem Thumbnail JPG untuk Preview Fail

**Tarikh:** 2026-03-01
**Status:** Diluluskan
**Jenis fail utama:** PDF, DOCX

---

## Masalah

Preview fail dalam app lambat kerana:
- PDF: PDF.js muat turun fail penuh (~5MB) dan render semua halaman
- DOCX: docx-preview muat turun + parse fail penuh sebelum papar

## Penyelesaian

Jana thumbnail JPG semasa upload. Preview tunjuk JPG (instant). Download bagi fail original.

---

## Aliran Upload

```
Guru pilih fail
  → validate (jenis + saiz)
  → upload original ke Firebase Storage (Fasa 1: 0–80%)
  → jana thumbnail JPG (Fasa 2: 80–100%)
      PDF  → PDF.js render halaman 1 → canvas → JPG blob → upload
      DOCX → docx-preview render ke hidden div → html2canvas → JPG blob → upload
      IMG  → thumbnailURL = downloadURL (tiada proses tambahan)
      lain → tiada thumbnail
  → simpan metadata ke Firebase Realtime Database
```

### Path Storage

| Jenis | Original | Thumbnail |
|-------|----------|-----------|
| PDF   | `bahan/.../uid.pdf` | `bahan/.../uid_thumb.jpg` |
| DOCX  | `bahan/.../uid.docx` | `bahan/.../uid_thumb.jpg` |
| Gambar | `bahan/.../uid.jpg` | (sama dengan original) |

---

## Aliran Preview

```
Klik fail
  → ada thumbnailURL?
      YA  → <img src="thumbnailURL"> (instant)
            + butang "📄 Lihat PDF Penuh" untuk PDF
            + butang "⬇️ Muat Turun" bagi original
      TIDAK → viewer lama (SheetJS / <video> / fallback kad)
```

---

## Struktur Data (Firebase Realtime Database)

Rekod fail dalam `files/{id}`:

```json
{
  "id": "f1234567_abcdef",
  "name": "Latihan Matematik T5.pdf",
  "sj": "math",
  "cat": "latihan",
  "year": 5,
  "topic": "Pecahan",
  "size": 2097152,
  "date": "01 Mac 2026",
  "downloadURL": "https://firebasestorage.googleapis.com/...",
  "storagePath": "bahan/math/latihan/5/pecahan/f1234567_abcdef.pdf",
  "thumbnailURL": "https://firebasestorage.googleapis.com/..._thumb.jpg",
  "thumbPath": "bahan/math/latihan/5/pecahan/f1234567_abcdef_thumb.jpg"
}
```

Fail lama tanpa `thumbnailURL` → fallback ke viewer lama (backward compatible).

---

## Perubahan Padam Fail

Bila admin padam fail, sistem padam **dua** objek dari Storage:
1. `storagePath` (fail original)
2. `thumbPath` (thumbnail — skip jika tiada)

---

## Progress Bar Upload (2 Fasa)

| Peratusan | Fasa |
|-----------|------|
| 0–80% | Upload fail original |
| 80–100% | Jana & upload thumbnail |

---

## Library Baru

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

Digunakan untuk DOCX sahaja: screenshot hidden div selepas docx-preview render.

---

## Fail yang Diubah

| Fail | Perubahan |
|------|-----------|
| `index.html` | Tambah html2canvas CDN |
| `js/storage.js` | `uploadFileToStorage()` → jana + upload thumbnail; `buildViewerHTML()` → semak thumbnailURL; `deleteFileFromStorage()` → padam thumbPath; tambah `generatePdfThumbnail()`, `generateDocxThumbnail()` |
| `js/app.js` | Hantar thumbnailURL ke `dbSaveFile()` |
| `css/style.css` | Tambah `.thumb-viewer` styles, progress fasa 2 |

---

## Batasan & Risiko

- **html2canvas** kadang tidak render fonts/imej embedded dalam DOCX dengan sempurna — thumbnail mungkin nampak berbeza dari fail sebenar. Ini diterima kerana tujuan thumbnail adalah gambaran kasar sahaja.
- Fail DOCX yang sangat kompleks (banyak imej, jadual kompleks) mungkin mengambil masa 5–10 saat untuk jana thumbnail. Ini berlaku sekali sahaja semasa upload.
- Fail lama yang sudah diupload tidak akan ada thumbnail — fallback ke viewer lama.
