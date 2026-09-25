// ============================================
// verify.js - التحقق من الكود (بدون إرسال)
// ============================================

let currentUserData = null;
let checkInterval = null;
let codeBuffer = "";

// عناصر DOM
const waitingState = document.getElementById("waitingState");
const codeState = document.getElementById("codeState");
const successState = document.getElementById("successState");
const waitingPhone = document.getElementById("waitingPhone");
const codeInputs = document.querySelectorAll(".code-input");
const codeError = document.getElementById("codeError");
const verifyBtn = document.getElementById("verifyBtn");

// ============================================
// تحميل المستخدم
// ============================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const doc = await db.collection("users").doc(user.uid).get();

    if (!doc.exists) {
      window.location.href = "index.html";
      return;
    }

    currentUserData = doc.data();

    // إذا كان مؤكداً، حوّله
    if (currentUserData.phoneVerified === true) {
      window.location.href = "index.html";
      return;
    }

    if (!currentUserData.phone) {
      alert("لا يوجد رقم هاتف");
      window.location.href = "index.html";
      return;
    }

    // عرض الرقم
    waitingPhone.textContent = currentUserData.phone;

    // إذا لم يكن قد طلب التحقق، اطلب تلقائياً
    if (!currentUserData.verificationRequested) {
      await requestVerification(user.uid);
    }

    // إعداد حقول الإدخال
    setupCodeInputs();

    // بدء التحقق الدوري
    startChecking();

    // إظهار حالة إدخال الكود بعد ثانية
    setTimeout(() => {
      waitingState.style.display = "none";
      codeState.style.display = "block";
    }, 2000);
  } catch (error) {
    console.error("❌ خطأ:", error);
  }
});

// ============================================
// طلب التحقق (يُحفظ في Firestore)
// ============================================
async function requestVerification(uid) {
  try {
    await db.collection("users").doc(uid).update({
      verificationRequested: true,
      verificationRequestedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ تم إرسال طلب التحقق للمشرف");
  } catch (error) {
    console.error("❌ خطأ:", error);
  }
}

// ============================================
// إعداد حقول إدخال الكود
// ============================================
function setupCodeInputs() {
  codeInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      const value = e.target.value.toUpperCase();
      e.target.value = value;

      if (value) {
        e.target.classList.add("filled");
        // الانتقال للحقل التالي
        if (index < codeInputs.length - 1) {
          codeInputs[index + 1].focus();
        }
      } else {
        e.target.classList.remove("filled");
      }

      // تحديث buffer
      updateBuffer();
    });

    input.addEventListener("keydown", (e) => {
      // Backspace: الانتقال للحقل السابق
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        codeInputs[index - 1].focus();
      }
    });

    // Paste
    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData
        .getData("text")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

      for (
        let i = 0;
        i < Math.min(pastedData.length, codeInputs.length - index);
        i++
      ) {
        codeInputs[index + i].value = pastedData[i];
        codeInputs[index + i].classList.add("filled");
      }

      const nextIndex = Math.min(
        index + pastedData.length,
        codeInputs.length - 1,
      );
      codeInputs[nextIndex].focus();
      updateBuffer();
    });
  });

  // تركيز أول حقل
  codeInputs[0].focus();
}

// ============================================
// تحديث buffer
// ============================================
function updateBuffer() {
  codeBuffer = Array.from(codeInputs)
    .map((i) => i.value)
    .join("");
  codeError.style.display = "none";

  // إذا اكتمل الكود، حاول التحقق تلقائياً
  if (codeBuffer.length === 6) {
    setTimeout(verifyCode, 300);
  }
}

// ============================================
// التحقق من الكود
// ============================================
async function verifyCode() {
  const enteredCode = codeBuffer.toUpperCase();

  if (enteredCode.length !== 6) {
    showError("❌ يرجى إدخال 6 أحرف كاملة");
    return;
  }

  verifyBtn.disabled = true;
  verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

  try {
    const user = auth.currentUser;
    const doc = await db.collection("users").doc(user.uid).get();
    const data = doc.data();

    const correctCode = (data.verificationCode || "").toUpperCase();

    if (enteredCode === correctCode) {
      // ✅ نجح
      await db.collection("users").doc(user.uid).update({
        phoneVerified: true,
        phoneVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
        verificationRequested: false,
      });

      // إظهار النجاح
      codeState.style.display = "none";
      successState.style.display = "block";

      if (checkInterval) clearInterval(checkInterval);

      // تحويل بعد 2 ثوان
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    } else {
      // ❌ خطأ
      showError("❌ الكود غير صحيح. تحقق من الرسالة وحاول مرة أخرى");
      shakeInputs();

      verifyBtn.disabled = false;
      verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرقم';
    }
  } catch (error) {
    console.error("❌ خطأ:", error);
    showError("حدث خطأ، حاول مرة أخرى");
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الرقم';
  }
}

// ============================================
// عرض خطأ
// ============================================
function showError(message) {
  codeError.textContent = message;
  codeError.style.display = "block";
}

// ============================================
// اهتزاز الحقول
// ============================================
function shakeInputs() {
  const inputsContainer = document.getElementById("codeInputs");
  inputsContainer.style.animation = "shake 0.5s";
  setTimeout(() => {
    inputsContainer.style.animation = "";
  }, 500);
}

// إضافة animation
const style = document.createElement("style");
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// ============================================
// إعادة إرسال الطلب
// ============================================
async function resendRequest() {
  const user = auth.currentUser;
  if (!user) return;

  if (confirm("سيتم إرسال طلب جديد للمشرف لإرسال الكود. متابعة؟")) {
    await requestVerification(user.uid);

    // إعادة عرض حالة الانتظار
    codeState.style.display = "none";
    waitingState.style.display = "block";

    setTimeout(() => {
      waitingState.style.display = "none";
      codeState.style.display = "block";
    }, 3000);
  }
}

// ============================================
// التحقق الدوري (كل 5 ثوان)
// ============================================
function startChecking() {
  if (checkInterval) clearInterval(checkInterval);

  checkInterval = setInterval(async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const doc = await db.collection("users").doc(user.uid).get();
      const data = doc.data();

      // إذا تم التأكيد من المشرف
      if (data.phoneVerified === true) {
        clearInterval(checkInterval);
        codeState.style.display = "none";
        successState.style.display = "block";

        setTimeout(() => {
          window.location.href = "index.html";
        }, 2000);
      }
    } catch (error) {
      console.error("خطأ في التحقق:", error);
    }
  }, 5000);
}

// ============================================
// تسجيل الخروج
// ============================================
async function logout() {
  if (confirm("هل تريد تسجيل الخروج؟")) {
    if (checkInterval) clearInterval(checkInterval);
    await auth.signOut();
    window.location.href = "login.html";
  }
}

window.logout = logout;
window.verifyCode = verifyCode;
window.resendRequest = resendRequest;

console.log("✅ verify.js تم تحميله");
