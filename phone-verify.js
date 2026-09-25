// ============================================
// phone-verify.js - تأكيد رقم الهاتف عبر WhatsApp
// ============================================

// ⚠️ ضع رقم WhatsApp هنا (بدون + وبدون مسافات)
// مثال: إذا كان رقمك 01140209948 اكتب 201140209948
const WHATSAPP_BUSINESS_NUMBER = "201207911166";

// ============================================
// التحقق من حالة تأكيد رقم المستخدم
// ============================================
async function checkPhoneVerification(user) {
  if (!user) return null;

  try {
    const userDoc = await db.collection("users").doc(user.uid).get();

    if (!userDoc.exists) return null;

    const data = userDoc.data();

    // إذا كان مؤكداً
    if (data.phoneVerified === true) {
      return { verified: true, phone: data.phone };
    }

    // إذا لم يكن هناك رقم
    if (!data.phone) return null;

    // غير مؤكد
    return {
      verified: false,
      phone: data.phone,
      code: data.verificationCode || generateNewCode(),
    };
  } catch (error) {
    console.error("❌ خطأ في التحقق:", error);
    return null;
  }
}

// ============================================
// توليد كود جديد
// ============================================
function generateNewCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// عرض تنبيه تأكيد الرقم
// ============================================
async function showVerificationBanner() {
  console.log("🔔 جاري فحص حالة التأكيد...");

  const user = auth.currentUser;
  if (!user) {
    console.log("❌ لا يوجد مستخدم");
    return;
  }

  // حذف أي تنبيه قديم
  document.getElementById("phoneVerifyBanner")?.remove();

  const verification = await checkPhoneVerification(user);

  console.log("📋 نتيجة الفحص:", verification);

  // إذا مؤكد أو لا يوجد رقم، لا نعرض شيئاً
  if (!verification || verification.verified) {
    if (verification && verification.verified) {
      addVerifiedBadge();
    }
    return;
  }

  // إذا طلب التأكيد مسبقاً، لا نعرض
  const userDoc = await db.collection("users").doc(user.uid).get();
  const userData = userDoc.data();
  if (userData.phoneVerificationRequested === true) {
    console.log("⏳ التأكيد قيد المراجعة");
    return;
  }

  // التحقق من إغلاق التنبيه مؤخراً
  const dismissedAt = localStorage.getItem("phoneBannerDismissed");
  if (dismissedAt) {
    const hoursSinceDismissed = (Date.now() - parseInt(dismissedAt)) / 3600000;
    if (hoursSinceDismissed < 1) {
      console.log("⏸️ التنبيه مغلق مؤقتاً");
      return;
    }
  }

  // إنشاء التنبيه
  const banner = document.createElement("div");
  banner.className = "phone-verify-banner";
  banner.id = "phoneVerifyBanner";

  banner.innerHTML = `
        <div class="banner-content">
            <div class="banner-icon">
                <i class="fas fa-mobile-alt"></i>
            </div>
            <div class="banner-text">
                <h4>⚠️ رقم هاتفك غير مؤكد</h4>
                <p>أكد رقمك عبر WhatsApp لتستقبل تحديثات طلبك</p>
            </div>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button class="btn-whatsapp" onclick="openVerifyModal('${verification.phone}', '${verification.code}')">
                <i class="fab fa-whatsapp"></i> تأكيد الآن
            </button>
            <button onclick="dismissBanner()" style="background: transparent; border: 2px solid #856404; color: #856404; padding: 0.9rem 1rem; border-radius: 25px; cursor: pointer; font-weight: bold;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

  // إضافة التنبيه في أعلى الصفحة
  const main =
    document.querySelector("main") ||
    document.querySelector(".products-section") ||
    document.querySelector(".navbar")?.parentNode ||
    document.body;

  if (main) {
    // إذا كان navbar، نضعه بعده
    const navbar = document.querySelector(".navbar");
    if (navbar && navbar.nextSibling) {
      navbar.parentNode.insertBefore(banner, navbar.nextSibling);
    } else {
      main.insertBefore(banner, main.firstChild);
    }
    console.log("✅ تم عرض التنبيه");
  }
}

// ============================================
// إغلاق التنبيه
// ============================================
function dismissBanner() {
  const banner = document.getElementById("phoneVerifyBanner");
  if (banner) {
    banner.style.opacity = "0";
    banner.style.transform = "translateY(-20px)";
    setTimeout(() => banner.remove(), 300);
  }
  localStorage.setItem("phoneBannerDismissed", Date.now().toString());
}

// ============================================
// فتح نافذة التأكيد
// ============================================
function openVerifyModal(phone, code) {
  console.log("📱 فتح نافذة التأكيد:", phone, code);

  let modal = document.getElementById("verifyModal");

  if (!modal) {
    modal = document.createElement("div");
    modal.className = "cart-modal";
    modal.id = "verifyModal";
    modal.innerHTML = `
            <div class="cart-content verify-modal-content">
                <div class="cart-header">
                    <h2><i class="fab fa-whatsapp" style="color:#25D366;"></i> تأكيد رقم الهاتف</h2>
                    <button class="close-x" onclick="closeVerifyModal()">&times;</button>
                </div>
                
                <div class="verify-steps">
                    <div class="verify-step">
                        <div class="step-num">1</div>
                        <div class="step-text">انسخ الكود أدناه</div>
                    </div>
                    <div class="verify-step">
                        <div class="step-num">2</div>
                        <div class="step-text">اضغط زر WhatsApp لفتح المحادثة</div>
                    </div>
                    <div class="verify-step">
                        <div class="step-num">3</div>
                        <div class="step-text">أرسل الرسالة الجاهزة</div>
                    </div>
                    <div class="verify-step">
                        <div class="step-num">4</div>
                        <div class="step-text">سنؤكد رقمك خلال دقائق ✅</div>
                    </div>
                </div>
                
                <div class="verify-code-box">
                    <div class="code-label">كود التأكيد</div>
                    <div class="code-value" id="verifyCodeValue">${code}</div>
                    <button onclick="copyCode('${code}')" style="margin-top: 1rem; background: rgba(255,255,255,0.2); color: white; border: none; padding: 0.5rem 1rem; border-radius: 20px; cursor: pointer; font-weight: bold;">
                        <i class="fas fa-copy"></i> نسخ الكود
                    </button>
                </div>
                
                <a href="#" id="whatsappLink" class="btn-whatsapp" style="width: 100%; justify-content: center; padding: 1rem; text-decoration: none;">
                    <i class="fab fa-whatsapp"></i> فتح WhatsApp وإرسال الكود
                </a>
                
                <p style="text-align: center; color: #999; font-size: 0.85rem; margin-top: 1rem;">
                    بعد إرسال الرسالة، سيؤكد المشرف رقمك خلال دقائق
                </p>
            </div>
        `;
    document.body.appendChild(modal);
  } else {
    document.getElementById("verifyCodeValue").textContent = code;
  }

  // إنشاء رابط WhatsApp
  const message = encodeURIComponent(
    "مرحباً،\nأريد تأكيد رقم هاتفي في متجري.\n\nكود التأكيد: " +
      code +
      "\nرقمي: " +
      phone +
      "\n\nشكراً",
  );

  const whatsappLink = document.getElementById("whatsappLink");
  whatsappLink.href =
    "https://wa.me/" + WHATSAPP_BUSINESS_NUMBER + "?text=" + message;

  // فتح النافذة
  modal.classList.add("active");

  // إغلاق عند الضغط في الخارج
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeVerifyModal();
  });

  // متابعة الضغط على WhatsApp
  whatsappLink.addEventListener("click", () => {
    setTimeout(() => {
      if (confirm("هل أرسلت الرسالة على WhatsApp؟")) {
        markAsPendingVerification();
      }
    }, 3000);
  });
}

// ============================================
// إغلاق نافذة التأكيد
// ============================================
function closeVerifyModal() {
  const modal = document.getElementById("verifyModal");
  if (modal) modal.classList.remove("active");
}

// ============================================
// نسخ الكود
// ============================================
function copyCode(code) {
  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        if (typeof showModernToast === "function") {
          showModernToast("✅ تم النسخ", "تم نسخ الكود: " + code, "success");
        } else {
          alert("✅ تم نسخ الكود: " + code);
        }
      })
      .catch(() => {
        alert("الكود: " + code);
      });
  } else {
    alert("الكود: " + code);
  }
}

// ============================================
// وضع علامة "قيد المراجعة"
// ============================================
async function markAsPendingVerification() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await db.collection("users").doc(user.uid).update({
      phoneVerificationRequested: true,
      phoneVerificationRequestedAt:
        firebase.firestore.FieldValue.serverTimestamp(),
    });

    closeVerifyModal();

    // إخفاء التنبيه
    const banner = document.getElementById("phoneVerifyBanner");
    if (banner) {
      banner.style.opacity = "0";
      setTimeout(() => banner.remove(), 300);
    }

    if (typeof showModernToast === "function") {
      showModernToast(
        "⏳ قيد المراجعة",
        "سيتم تأكيد رقمك خلال دقائق",
        "success",
      );
    } else {
      alert("⏳ سيتم تأكيد رقمك خلال دقائق");
    }

    console.log("✅ تم حفظ طلب التأكيد");
  } catch (error) {
    console.error("❌ خطأ:", error);
    alert("حدث خطأ، حاول مرة أخرى");
  }
}

// ============================================
// إضافة شارة "مؤكد" بجانب الاسم
// ============================================
function addVerifiedBadge() {
  const userNameEl = document.getElementById("userName");
  if (!userNameEl) return;

  if (userNameEl.querySelector(".phone-verified-badge")) return;

  const badge = document.createElement("span");
  badge.className = "phone-verified-badge";
  badge.style.marginRight = "0.3rem";
  badge.style.fontSize = "0.7rem";
  badge.innerHTML = '<i class="fas fa-check-circle"></i>';
  userNameEl.appendChild(badge);
}

// ============================================
// التهيئة - استدعاء تلقائي
// ============================================

// 1. عند تحميل الصفحة
window.addEventListener("load", () => {
  console.log("🔔 الصفحة حمّلت - بدء الفحص...");

  setTimeout(() => {
    if (auth.currentUser) {
      console.log("👤 المستخدم موجود:", auth.currentUser.email);
      showVerificationBanner();
    } else {
      console.log("❌ لا يوجد مستخدم");
    }
  }, 2000);
});

// 2. عند تسجيل الدخول
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("👤 تسجيل دخول:", user.email);
    setTimeout(() => {
      showVerificationBanner();
    }, 2000);
  }
});

// جعل الدوال متاحة عالمياً
window.openVerifyModal = openVerifyModal;
window.closeVerifyModal = closeVerifyModal;
window.copyCode = copyCode;
window.dismissBanner = dismissBanner;
window.showVerificationBanner = showVerificationBanner;

console.log("✅ phone-verify.js تم تحميله");
