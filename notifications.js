// ============================================
// notifications.js - إدارة الإشعارات
// ============================================

let currentToken = null;

// ============================================
// التحقق من دعم المتصفح
// ============================================
function isNotificationSupported() {
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

// ============================================
// طلب إذن الإشعارات
// ============================================
async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    alert("⚠️ متصفحك لا يدعم الإشعارات");
    return false;
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("✅ تم منح إذن الإشعارات");
      await registerToken();
      return true;
    } else {
      console.log("❌ تم رفض الإشعارات");
      return false;
    }
  } catch (error) {
    console.error("❌ خطأ:", error);
    return false;
  }
}

// ============================================
// تسجيل الرمز (Token)
// ============================================
async function registerToken() {
  if (!messaging) {
    console.warn("⚠️ Messaging غير متاح");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );
    console.log("✅ Service Worker مسجل");

    const token = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      currentToken = token;
      console.log("✅ Token:", token.substring(0, 20) + "...");
      await saveTokenToFirestore(token);
      localStorage.setItem("fcm_token", token);
      return token;
    }
    return null;
  } catch (error) {
    console.error("❌ خطأ في Token:", error);
    return null;
  }
}

// ============================================
// حفظ Token في Firestore
// ============================================
async function saveTokenToFirestore(token) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await db.collection("users").doc(user.uid).update({
      fcmToken: token,
      fcmTokenUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      notificationsEnabled: true,
    });
    console.log("✅ تم حفظ Token");
  } catch (error) {
    console.error("❌ خطأ:", error);
  }
}

// ============================================
// استقبال الإشعارات (التطبيق مفتوح)
// ============================================
if (messaging) {
  messaging.onMessage((payload) => {
    console.log("📩 إشعار:", payload);

    const title = payload.notification?.title || "متجري";
    const body = payload.notification?.body || "لديك إشعار";

    if (Notification.permission === "granted") {
      new Notification(title, {
        body: body,
        icon: "/favicon.ico",
      });
    }
  });
}

// ============================================
// عرض زر الإشعارات
// ============================================
function showNotificationButton() {
  if (Notification.permission === "granted") return;

  const dismissedAt = localStorage.getItem("notifDismissedAt");
  if (dismissedAt) {
    const hours = (Date.now() - parseInt(dismissedAt)) / 3600000;
    if (hours < 24) return;
  }

  if (document.getElementById("notificationPrompt")) return;

  const btn = document.createElement("div");
  btn.className = "notification-prompt";
  btn.id = "notificationPrompt";
  btn.innerHTML = `
        <div class="notif-content">
            <div class="notif-icon">
                <i class="fas fa-bell"></i>
            </div>
            <div class="notif-text">
                <strong>🔔 فعّل الإشعارات</strong>
                <p>ليصلك تحديث حالة طلبك فوراً</p>
            </div>
        </div>
        <div class="notif-actions">
            <button onclick="enableNotifications()" class="notif-enable">
                <i class="fas fa-check"></i> تفعيل
            </button>
            <button onclick="dismissNotificationPrompt()" class="notif-dismiss">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  document.body.appendChild(btn);
  setTimeout(() => btn.classList.add("show"), 500);
}

// ============================================
// تفعيل الإشعارات
// ============================================
async function enableNotifications() {
  const success = await requestNotificationPermission();

  if (success) {
    document.getElementById("notificationPrompt")?.remove();
    alert("✅ تم تفعيل الإشعارات");
  }
}

// ============================================
// إخفاء زر الإشعارات
// ============================================
function dismissNotificationPrompt() {
  const prompt = document.getElementById("notificationPrompt");
  if (prompt) {
    prompt.classList.remove("show");
    setTimeout(() => prompt.remove(), 300);
  }
  localStorage.setItem("notifDismissedAt", Date.now().toString());
}

// ============================================
// التهيئة
// ============================================
auth.onAuthStateChanged(async (user) => {
  if (!user) return;

  if (isNotificationSupported() && Notification.permission === "default") {
    setTimeout(showNotificationButton, 3000);
  }
});

// جعل الدوال متاحة عالمياً
window.enableNotifications = enableNotifications;
window.dismissNotificationPrompt = dismissNotificationPrompt;
window.requestNotificationPermission = requestNotificationPermission;

console.log("✅ notifications.js تم تحميله");
