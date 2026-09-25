// ============================================
// firebase-messaging-sw.js
// Service Worker للإشعارات (يعمل في الخلفية)
// ============================================

importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js",
);

// إعدادات Firebase (ضع قيمك)
firebase.initializeApp({
  apiKey: "AIzaSyAJ2txBtMgIJapIzg8uXpS1CA9NN7W7qoQ",
  authDomain: "my-online-shop-2027.firebaseapp.com",
  projectId: "my-online-shop-2027",
  storageBucket: "my-online-shop-2027.firebasestorage.app",
  messagingSenderId: "149405918875",
  appId: "1:149405918875:web:f69cef571983b4f304483e",
});

const messaging = firebase.messaging();

// استقبال الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log("📩 إشعار في الخلفية:", payload);

  const notificationTitle = payload.notification?.title || "متجري";
  const notificationOptions = {
    body: payload.notification?.body || "لديك إشعار جديد",
    icon: payload.notification?.icon || "/favicon.ico",
    badge: "/favicon.ico",
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: "open", title: "فتح" },
      { action: "close", title: "إغلاق" },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// عند الضغط على الإشعار
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // إذا كان هناك نافذة مفتوحة، ركّز عليها
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // وإلا افتح نافذة جديدة
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
