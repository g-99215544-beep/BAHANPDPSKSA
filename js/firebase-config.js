/* ═══════════════════════════════════════════════════════════
   firebase-config.js — Permulaan Firebase
   ═══════════════════════════════════════════════════════════ */

const firebaseConfig = {
  apiKey:            "AIzaSyB0TVducmnPFrFOugy2y79r6H9MqwoQPnM",
  authDomain:        "bahan-pdp.firebaseapp.com",
  databaseURL:       "https://bahan-pdp-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "bahan-pdp",
  storageBucket:     "bahan-pdp.firebasestorage.app",
  messagingSenderId: "654985399837",
  appId:             "1:654985399837:web:b25559c57deb2203e9c0f4",
  measurementId:     "G-W3MNFEG7DD"
};

// Mulakan Firebase
firebase.initializeApp(firebaseConfig);

// Rujukan global — digunakan oleh db.js, storage.js, auth.js
const fbDB      = firebase.database();
const fbStorage = firebase.storage();
const fbAuth    = firebase.auth();
