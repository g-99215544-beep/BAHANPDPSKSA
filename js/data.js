/* ═══════════════════════════════════════════════════════════
   data.js — Konstanta Subjek & Data DSKP
   ═══════════════════════════════════════════════════════════ */

const SUBJECTS = [
  { id:'bm',      name:'Bahasa Melayu',   emoji:'🇲🇾' },
  { id:'bi',      name:'Bahasa Inggeris', emoji:'🇬🇧' },
  { id:'math',    name:'Matematik',       emoji:'🔢' },
  { id:'sains',   name:'Sains',           emoji:'🔬' },
  { id:'sejarah', name:'Sejarah',         emoji:'📜' },
];

const DSKP = {
  bm:{
    1:['Kemahiran Mendengar dan Bertutur','Kemahiran Membaca','Kemahiran Menulis','Tatabahasa – Kata Nama','Tatabahasa – Kata Kerja','Kosa Kata Asas'],
    2:['Kemahiran Mendengar dan Bertutur','Kemahiran Membaca','Kemahiran Menulis','Tatabahasa – Kata Adjektif','Tatabahasa – Kata Hubung','Ayat Tunggal'],
    3:['Kemahiran Mendengar dan Bertutur','Kemahiran Membaca','Kemahiran Menulis','Peribahasa Mudah','Tatabahasa – Kata Sendi Nama','Ayat Majmuk'],
    4:['Kemahiran Mendengar dan Bertutur','Kemahiran Membaca Kritis','Kemahiran Menulis','Tatabahasa – Kata Ganti Nama','Simpulan Bahasa','Penulisan Karangan'],
    5:['Kemahiran Mendengar dan Bertutur','Kemahiran Membaca','Penulisan Karangan Laporan','Tatabahasa – Kata Bilangan','Peribahasa','Ulasan Teks'],
    6:['Kemahiran Mendengar dan Bertutur','Kemahiran Membaca Kritis','Penulisan Karangan UPSR','Tatabahasa Lengkap','Peribahasa dan Simpulan Bahasa','Ulasan dan Rumusan']
  },
  bi:{
    1:['Listening & Speaking','Reading Readiness','Writing – Sentence Building','Vocabulary – Colours & Numbers','Grammar – Nouns','Phonics Asas'],
    2:['Listening & Speaking','Reading – Short Passages','Writing – Simple Sentences','Grammar – Verbs (Present Tense)','Vocabulary – Family & Home','Phonics & Spelling'],
    3:['Listening & Speaking','Reading Comprehension','Writing – Guided Composition','Grammar – Adjectives','Grammar – Conjunctions','Vocabulary Building'],
    4:['Listening & Speaking','Reading Comprehension','Writing – Narrative','Grammar – Past Tense','Grammar – Prepositions','Idioms & Expressions'],
    5:['Listening & Speaking','Reading Comprehension','Writing – Descriptive Essay','Grammar – Future Tense','Grammar – Passive Voice','Vocabulary – Synonyms & Antonyms'],
    6:['Listening & Speaking','Reading Comprehension UPSR','Writing – UPSR Format','Grammar Revision','Summary Writing','Literature Component']
  },
  math:{
    1:['Nombor Bulat 1–10','Nombor Bulat 1–100','Operasi Tambah','Operasi Tolak','Masa dan Waktu','Ukuran Panjang'],
    2:['Nombor Bulat hingga 1,000','Operasi Tambah (Mengumpul Semula)','Operasi Tolak (Mengumpul Semula)','Operasi Darab','Pengenalan Operasi Bahagi','Wang'],
    3:['Nombor Bulat hingga 10,000','Operasi Tambah','Operasi Tolak','Operasi Darab','Operasi Bahagi','Pecahan','Wang','Masa dan Waktu'],
    4:['Nombor Bulat hingga 100,000','Pecahan','Perpuluhan','Wang','Ukuran Panjang, Berat dan Isipadu','Bentuk Geometri','Statistik Asas'],
    5:['Nombor Bulat hingga 1,000,000','Pecahan Wajar dan Tak Wajar','Perpuluhan','Peratusan','Nisbah','Geometri','Statistik'],
    6:['Nombor Bulat','Pecahan','Perpuluhan dan Peratusan','Nisbah dan Kadaran','Sukatan dan Geometri','Statistik dan Kebarangkalian']
  },
  sains:{
    1:['Kemahiran Saintifik Asas','Haiwan di Sekeliling Kita','Tumbuhan di Sekeliling Kita','Sumber Alam','Deria Manusia','Cuaca'],
    2:['Kemahiran Saintifik','Kitaran Hidup Haiwan','Bahagian Tumbuhan','Keadaan Jirim','Sumber Tenaga','Kesihatan dan Kebersihan'],
    3:['Kemahiran Saintifik','Pelbagai Haiwan','Pelbagai Tumbuhan','Daya Tarikan dan Daya Tolakan','Cahaya','Magnet'],
    4:['Kemahiran Saintifik','Sistem Organ Manusia','Pembiakan Tumbuhan','Jirim dan Jirimnya','Tenaga Elektrik','Alam Sekitar'],
    5:['Kemahiran Saintifik','Pembiakan Haiwan dan Tumbuhan','Campuran','Panas','Tenaga Cahaya dan Bunyi','Bumi dan Sumber Alam'],
    6:['Kemahiran Saintifik','Kesihatan Manusia','Jirim','Sinar Cahaya','Elektrik dan Magnet','Teknologi dan Alam Sekitar']
  },
  sejarah:{
    1:['Pengenalan Sejarah','Keluargaku','Sekolahku','Jiranku','Komuniti Setempat','Perayaan dan Adat Resam'],
    2:['Sejarah Keluarga','Warisan Keluarga','Lambang Negara','Hari Kebangsaan','Tokoh Tempatan','Tradisi dan Budaya'],
    3:['Kerajaan Awal Melayu','Kesultanan Melayu Melaka','Tokoh Kesultanan Melayu','Kedatangan Islam di Tanah Melayu','Sistem Pemerintahan Awal','Warisan Sejarah'],
    4:['Keagungan Kesultanan Melayu Melaka','Kemerosotan Melaka','Penjajahan Barat di Tanah Melayu','Tokoh Pejuang','Penentangan Terhadap Penjajah','Perubahan Ekonomi'],
    5:['Perjuangan Kemerdekaan','Tokoh Pengisytiharan Kemerdekaan','Pembentukan Malaysia','Cabaran Negara Bangsa','Pembangunan Negara','Perpaduan Nasional'],
    6:['Pengukuhan Kemerdekaan','Pemimpin Negara','Dasar-dasar Pembangunan Negara','Malaysia di Persada Dunia','Wawasan dan Hala Tuju Negara','Patriotisme dan Semangat Kebangsaan']
  }
};
