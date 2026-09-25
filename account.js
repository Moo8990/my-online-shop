// ============================================
// account.js - صفحة حسابي
// ============================================

const accountPage = document.getElementById("accountPage");
const loginRequired = document.getElementById("loginRequired");
const notification = document.getElementById("notification");

// ============================================
// التبديل بين الأقسام
// ============================================
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.dataset.section;

    // تحديث الأزرار
    document
      .querySelectorAll(".nav-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // تحديث الأقسام
    document
      .querySelectorAll(".content-section")
      .forEach((s) => s.classList.remove("active"));
    document.getElementById("section-" + section).classList.add("active");

    // تحميل البيانات حسب القسم
    if (section === "stats") loadStats();
  });
});

// ============================================
// مراقبة حالة المستخدم
// ============================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    accountPage.style.display = "none";
    loginRequired.style.display = "block";
    return;
  }

  accountPage.style.display = "grid";
  loginRequired.style.display = "none";

  await loadUserData(user);
});

// ============================================
// تحميل بيانات المستخدم
// ============================================
async function loadUserData(user) {
  try {
    const userDoc = await db.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      console.log("❌ لا يوجد مستند");
      return;
    }

    const data = userDoc.data();
    console.log("📋 بيانات المستخدم:", data);

    // الشريط الجانبي
    const initial = (data.name || "م").charAt(0).toUpperCase();
    document.getElementById("userAvatar").textContent = initial;
    document.getElementById("userNameSidebar").textContent =
      data.name || "مستخدم";
    document.getElementById("userEmailSidebar").textContent =
      data.email || user.email;

    // قسم المعلومات
    document.getElementById("infoName").textContent = data.name || "-";
    document.getElementById("infoEmail").textContent = data.email || user.email;
    document.getElementById("infoDate").textContent = formatDate(
      data.createdAt,
    );

    const roleEl = document.getElementById("infoRole");
    if (data.role === "admin") {
      roleEl.innerHTML = '<span class="badge-role admin">مشرف</span>';
    } else {
      roleEl.innerHTML = '<span class="badge-role customer">عميل</span>';
    }

    // نموذج التعديل
    document.getElementById("editName").value = data.name || "";
    document.getElementById("editEmail").value = data.email || user.email;

    // نموذج العنوان
    if (data.address) {
      document.getElementById("addressName").value =
        data.address.fullName || "";
      document.getElementById("addressPhone").value = data.address.phone || "";
      document.getElementById("addressCity").value = data.address.city || "";
      document.getElementById("addressDetails").value =
        data.address.details || "";
    }
  } catch (error) {
    console.error("❌ خطأ:", error);
  }
}

// ============================================
// حفظ تعديل البيانات
// ============================================
document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  const newName = document.getElementById("editName").value.trim();
  const btn = document.getElementById("saveEditBtn");

  if (newName.length < 2) {
    showAlert("editError", "الاسم يجب أن يكون حرفين على الأقل");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

  try {
    // تحديث في Auth
    await user.updateProfile({ displayName: newName });

    // تحديث في Firestore
    await db.collection("users").doc(user.uid).update({
      name: newName,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // تحديث الواجهة
    document.getElementById("infoName").textContent = newName;
    document.getElementById("userNameSidebar").textContent = newName;
    document.getElementById("userAvatar").textContent = newName
      .charAt(0)
      .toUpperCase();

    showAlert("editSuccess", "✓ تم حفظ التعديلات بنجاح");
    showNotification("✓ تم تحديث البيانات");
  } catch (error) {
    console.error("❌ خطأ:", error);
    showAlert("editError", "حدث خطأ: " + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> حفظ التعديلات';
  }
});

// ============================================
// حفظ العنوان
// ============================================
document.getElementById("addressForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  const address = {
    fullName: document.getElementById("addressName").value.trim(),
    phone: document.getElementById("addressPhone").value.trim(),
    city: document.getElementById("addressCity").value.trim(),
    details: document.getElementById("addressDetails").value.trim(),
  };

  const btn = document.getElementById("saveAddressBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

  try {
    await db.collection("users").doc(user.uid).update({
      address: address,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    showAlert("addressSuccess", "✓ تم حفظ العنوان بنجاح");
    showNotification("✓ تم حفظ العنوان");
  } catch (error) {
    console.error("❌ خطأ:", error);
    showAlert("addressError", "حدث خطأ: " + error.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-save"></i> حفظ العنوان';
  }
});

// ============================================
// تغيير كلمة المرور
// ============================================
document
  .getElementById("passwordForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return;

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const btn = document.getElementById("savePasswordBtn");

    if (newPassword !== confirmPassword) {
      showAlert("passwordError", "كلمتا المرور غير متطابقتين");
      return;
    }

    if (newPassword.length < 6) {
      showAlert("passwordError", "كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التغيير...';

    try {
      // التحقق من كلمة المرور الحالية
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await user.reauthenticateWithCredential(credential);

      // تحديث كلمة المرور
      await user.updatePassword(newPassword);

      showAlert("passwordSuccess", "✓ تم تغيير كلمة المرور بنجاح");
      showNotification("✓ تم تغيير كلمة المرور");
      document.getElementById("passwordForm").reset();
    } catch (error) {
      console.error("❌ خطأ:", error);

      let msg = "حدث خطأ";
      if (error.code === "auth/wrong-password")
        msg = "كلمة المرور الحالية غير صحيحة";
      if (error.code === "auth/weak-password")
        msg = "كلمة المرور الجديدة ضعيفة";
      if (error.code === "auth/requires-recent-login")
        msg = "يجب تسجيل الدخول مرة أخرى";

      showAlert("passwordError", msg);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-key"></i> تغيير كلمة المرور';
    }
  });

// ============================================
// تحميل الإحصائيات
// ============================================
async function loadStats() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const snapshot = await db
      .collection("orders")
      .where("userId", "==", user.uid)
      .get();

    const orders = snapshot.docs.map((doc) => doc.data());

    const total = orders.length;
    const completed = orders.filter((o) => o.status === "delivered").length;
    const pending = orders.filter((o) => o.status === "pending").length;
    const spent = orders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    document.getElementById("statTotalOrders").textContent = total;
    document.getElementById("statCompletedOrders").textContent = completed;
    document.getElementById("statPendingOrders").textContent = pending;
    document.getElementById("statTotalSpent").textContent =
      "$" + spent.toFixed(2);
  } catch (error) {
    console.error("❌ خطأ:", error);
  }
}

// ============================================
// تسجيل الخروج
// ============================================
document.getElementById("sidebarLogout").addEventListener("click", async () => {
  if (confirm("هل تريد تسجيل الخروج؟")) {
    await auth.signOut();
    window.location.href = "index.html";
  }
});

// ============================================
// دوال مساعدة
// ============================================
function formatDate(timestamp) {
  if (!timestamp) return "-";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function showAlert(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 4000);
}

function showNotification(message) {
  if (!notification) return;
  notification.textContent = message;
  notification.className = "notification show";
  setTimeout(() => notification.classList.remove("show"), 2500);
}

console.log("✅ account.js تم تحميله");
