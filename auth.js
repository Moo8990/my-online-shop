// ============================================
// auth.js - منطق المصادقة + التوجيه التلقائي
// ============================================

// عناصر DOM
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const errorMsg = document.getElementById("errorMsg");
const successMsg = document.getElementById("successMsg");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

// ============================================
// التبديل بين التبويبات
// ============================================
if (loginTab) {
  loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    registerTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    pageTitle.textContent = "مرحباً بك مجدداً";
    pageSubtitle.textContent = "سجل دخولك للمتابعة";
    hideMessages();
  });
}

if (registerTab) {
  registerTab.addEventListener("click", () => {
    registerTab.classList.add("active");
    loginTab.classList.remove("active");
    registerForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
    pageTitle.textContent = "إنشاء حساب جديد";
    pageSubtitle.textContent = "انضم إلينا في دقيقة واحدة";
    hideMessages();
  });
}

// ============================================
// إظهار / إخفاء الرسائل
// ============================================
function showError(message) {
  if (!errorMsg) return;
  errorMsg.textContent = message;
  errorMsg.style.display = "block";
  if (successMsg) successMsg.style.display = "none";
}

function showSuccess(message) {
  if (!successMsg) return;
  successMsg.textContent = message;
  successMsg.style.display = "block";
  if (errorMsg) errorMsg.style.display = "none";
}

function hideMessages() {
  if (errorMsg) errorMsg.style.display = "none";
  if (successMsg) successMsg.style.display = "none";
}

// ============================================
// ترجمة أخطاء Firebase للعربية
// ============================================
function translateError(code) {
  const errors = {
    "auth/email-already-in-use": "هذا البريد الإلكتروني مسجل بالفعل",
    "auth/invalid-email": "البريد الإلكتروني غير صالح",
    "auth/weak-password": "كلمة المرور ضعيفة (6 أحرف على الأقل)",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد",
    "auth/wrong-password": "كلمة المرور غير صحيحة",
    "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة",
    "auth/too-many-requests": "محاولات كثيرة، جرب لاحقاً",
    "auth/network-request-failed": "مشكلة في الاتصال بالإنترنت",
    "auth/user-disabled": "هذا الحساب معطل",
  };
  return errors[code] || "حدث خطأ، حاول مرة أخرى";
}

// ============================================
// التحقق من صحة رقم الهاتف المصري
// ============================================
function validateEgyptianPhone(phone) {
  phone = phone.replace(/\s|-/g, "");
  const pattern = /^01[0125][0-9]{8}$/;
  return pattern.test(phone);
}

// ============================================
// توليد كود تأكيد
// ============================================
function generateVerificationCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// تسجيل حساب جديد
// ============================================
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessages();

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const phoneInput = document.getElementById("registerPhone");
    const phone = phoneInput
      ? phoneInput.value.trim().replace(/\s|-/g, "")
      : "";
    const password = document.getElementById("registerPassword").value;
    const registerBtn = document.getElementById("registerBtn");

    // التحقق من البيانات
    if (name.length < 2) {
      showError("الاسم يجب أن يكون حرفين على الأقل");
      return;
    }

    if (!phone) {
      showError("رقم الهاتف مطلوب");
      return;
    }

    if (!validateEgyptianPhone(phone)) {
      showError(
        "رقم الهاتف غير صحيح. يجب أن يبدأ بـ 010، 011، 012، أو 015 ويكون 11 رقماً",
      );
      return;
    }

    if (password.length < 6) {
      showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    registerBtn.disabled = true;
    registerBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';

    try {
      // 1. التحقق من أن رقم الهاتف غير مستخدم
      const phoneCheck = await db
        .collection("users")
        .where("phone", "==", phone)
        .get();

      if (!phoneCheck.empty) {
        showError("رقم الهاتف هذا مسجل بالفعل");
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء الحساب';
        return;
      }

      // 2. إنشاء الحساب في Firebase Auth
      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password,
      );
      const user = userCredential.user;

      console.log("✅ تم إنشاء الحساب:", user.uid);

      // 3. تحديث الاسم
      try {
        await user.updateProfile({ displayName: name });
      } catch (profileError) {
        console.warn("تحذير: لم يتم تحديث الاسم", profileError);
      }

      // 4. توليد كود التحقق
      const verificationCode = generateVerificationCode();

      // 5. حفظ البيانات في Firestore
      try {
        await db.collection("users").doc(user.uid).set({
          uid: user.uid,
          name: name,
          email: email,
          phone: phone,
          phoneVerified: false,
          phoneVerificationRequested: false,
          verificationCode: verificationCode,
          role: "customer",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        console.log("✅ تم حفظ البيانات - كود:", verificationCode);
      } catch (fsError) {
        console.error("⚠️ فشل حفظ البيانات:", fsError);
      }

      // 6. توجيه لصفحة التأكيد
      showSuccess("✓ تم إنشاء الحساب! جاري تحويلك لتأكيد رقمك...");

      setTimeout(() => {
        window.location.href = "verify.html";
      }, 1500);
    } catch (error) {
      console.error("❌ خطأ التسجيل:", error);
      showError(translateError(error.code));
      registerBtn.disabled = false;
      registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء الحساب';
    }
  });
}

// ============================================
// تسجيل الدخول
// ============================================
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessages();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const loginBtn = document.getElementById("loginBtn");

    loginBtn.disabled = true;
    loginBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';

    try {
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password,
      );
      const user = userCredential.user;

      console.log("✅ تم تسجيل الدخول:", user.email);

      // التحقق من المستند في Firestore
      let userData = null;
      try {
        const userDoc = await db.collection("users").doc(user.uid).get();

        if (!userDoc.exists) {
          // إنشاء مستند تلقائياً
          console.log("⚠️ لا يوجد مستند - إنشاء واحد...");
          await db
            .collection("users")
            .doc(user.uid)
            .set({
              uid: user.uid,
              name: user.displayName || email.split("@")[0],
              email: user.email,
              phone: "",
              phoneVerified: false,
              role: "customer",
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
          userData = { phoneVerified: false, phone: "" };
        } else {
          userData = userDoc.data();
          console.log("✅ المستند موجود");
        }
      } catch (fsError) {
        console.warn("⚠️ مشكلة Firestore:", fsError);
      }

      // 🔒 التحقق من تأكيد الرقم
      if (userData && userData.phone && userData.phoneVerified === false) {
        console.log("⚠️ الرقم غير مؤكد - تحويل لصفحة التأكيد");
        showSuccess("✓ تم تسجيل الدخول! جاري التحقق من رقمك...");
        setTimeout(() => {
          window.location.href = "verify.html";
        }, 1000);
        return;
      }

      // إذا كان مؤكداً أو لا يوجد رقم
      showSuccess("✓ تم تسجيل الدخول! جاري التحويل...");
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } catch (error) {
      console.error("❌ خطأ الدخول:", error);
      showError(translateError(error.code));
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
  });
}

// ============================================
// إذا كان المستخدم مسجل دخول بالفعل
// ============================================
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("ℹ️ المستخدم مسجل دخول بالفعل:", user.email);
  } else {
    console.log("ℹ️ لا يوجد مستخدم مسجل");
  }
});

console.log("✅ auth.js تم تحميله");
