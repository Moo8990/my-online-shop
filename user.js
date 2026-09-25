// ============================================
// إدارة حالة المستخدم في كل الصفحات
// ============================================

// عناصر DOM (قد لا تكون موجودة في كل الصفحات)
const userMenu = document.getElementById("userMenu");
const loginLink = document.getElementById("loginLink");
const userName = document.getElementById("userName");
const userInfoBtn = document.getElementById("userInfoBtn");
const userDropdown = document.getElementById("userDropdown");
const logoutBtn = document.getElementById("logoutBtn");
const adminLink = document.getElementById("adminLink");

// ============================================
// مراقبة حالة تسجيل الدخول
// ============================================
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // المستخدم مسجل دخول
    console.log("✅ المستخدم مسجل:", user.email);

    // إظهار قائمة المستخدم
    if (userMenu) userMenu.classList.remove("hidden");
    if (loginLink) loginLink.classList.add("hidden");

    // إظهار اسم المستخدم
    if (userName) {
      userName.textContent = user.displayName || user.email.split("@")[0];
    }

    // التحقق من دور المستخدم (مشرف أم عميل)
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        console.log("📋 بيانات المستخدم:", userData);

        // إظهار رابط لوحة التحكم إذا كان مشرفاً
        if (userData.role === "admin" && adminLink) {
          adminLink.classList.remove("hidden");
        }

        // حفظ بيانات المستخدم عالمياً
        window.currentUserData = userData;
      }
    } catch (error) {
      console.error("خطأ في جلب بيانات المستخدم:", error);
    }

    // تحميل سلة المستخدم من Firestore
    loadUserCart(user.uid);
  } else {
    // المستخدم غير مسجل دخول
    console.log("ℹ️ لا يوجد مستخدم مسجل");

    if (userMenu) userMenu.classList.add("hidden");
    if (loginLink) loginLink.classList.remove("hidden");
  }
});

// ============================================
// فتح/إغلاق القائمة المنسدلة
// ============================================
if (userInfoBtn && userDropdown) {
  userInfoBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("active");
  });

  // إغلاق القائمة عند الضغط خارجها
  document.addEventListener("click", () => {
    userDropdown.classList.remove("active");
  });

  userDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// ============================================
// تسجيل الخروج
// ============================================
if (logoutBtn) {
  logoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    if (confirm("هل تريد تسجيل الخروج؟")) {
      try {
        await auth.signOut();
        showToast("تم تسجيل الخروج بنجاح", "success");

        setTimeout(() => {
          window.location.href = "index.html";
        }, 1000);
      } catch (error) {
        console.error("خطأ تسجيل الخروج:", error);
        showToast("حدث خطأ أثناء الخروج", "error");
      }
    }
  });
}

// ============================================
// تحميل السلة من Firestore
// ============================================
async function loadUserCart(uid) {
  try {
    const cartDoc = await db.collection("carts").doc(uid).get();
    if (cartDoc.exists) {
      const data = cartDoc.data();
      if (data.items && Array.isArray(data.items)) {
        // دمج سلة Firebase مع السلة المحلية
        localStorage.setItem("cart", JSON.stringify(data.items));

        // إعادة تحميل واجهة السلة
        if (typeof updateCartUI === "function") {
          cart = data.items;
          updateCartUI();
        }
        console.log(
          "✅ تم تحميل السلة من Firebase:",
          data.items.length,
          "منتج",
        );
      }
    }
  } catch (error) {
    console.error("خطأ في تحميل السلة:", error);
  }
}

// ============================================
// حفظ السلة في Firestore (تُستدعى من script.js)
// ============================================
async function saveCartToFirestore(cartItems) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await db.collection("carts").doc(user.uid).set({
      items: cartItems,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ تم حفظ السلة في Firebase");
  } catch (error) {
    console.error("خطأ في حفظ السلة:", error);
  }
}

// ============================================
// إشعار Toast محسّن
// ============================================
function showToast(message, type = "success") {
  // إذا كان هناك إشعار موجود، احذفه
  const existing = document.querySelector(".welcome-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "welcome-toast";
  toast.textContent = message;

  if (type === "error") {
    toast.style.background = "linear-gradient(135deg, #e94560, #c73552)";
  }

  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

// جعل الدالة متاحة عالمياً
window.showToast = showToast;
window.saveCartToFirestore = saveCartToFirestore;
