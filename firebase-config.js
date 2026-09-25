// ============================================
// firebase-config.js
// ============================================

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAJ2txBtMgIJapIzg8uXpS1CA9NN7W7qoQ",
  authDomain: "my-online-shop-2027.firebaseapp.com",
  projectId: "my-online-shop-2027",
  storageBucket: "my-online-shop-2027.firebasestorage.app",
  messagingSenderId: "149405918875",
  appId: "1:149405918875:web:f69cef571983b4f304483e",
};

// تهيئة Firebase
firebase.initializeApp(firebaseConfig);

// الخدمات
const auth = firebase.auth();
const db = firebase.firestore();

// Firebase Messaging
let messaging = null;

if (typeof firebase !== "undefined" && firebase.messaging) {
  try {
    if (firebase.messaging.isSupported()) {
      messaging = firebase.messaging();
      console.log("✅ Firebase Messaging initialized");
    } else {
      console.warn("⚠️ Messaging not supported");
    }
  } catch (err) {
    console.warn("⚠️ Messaging error:", err);
  }
}

// VAPID Key (⚠️ استبدل بقيمتك)
const VAPID_KEY =
  "BNHALBF7wz6ZtSoPGiXSvzWBmm21Ih8GKNSqEwMu_xOtyPcKJ_zvtugg04lXZXKq4ofIT_gTC79KE7xrK4aHF8c";
console.log("✅ Firebase initialized successfully");
console.log("Project:", firebaseConfig.projectId);
