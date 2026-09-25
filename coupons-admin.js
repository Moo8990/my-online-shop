// ============================================
// coupons-admin.js - إدارة الكوبونات (للمشرف)
// ============================================

let allCoupons = [];

// ============================================
// دالة مساعدة: تحويل القيمة إلى Boolean
// ============================================
function toBoolean(value) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  return false;
}

// ============================================
// تحميل الكوبونات
// ============================================
async function loadCoupons() {
  try {
    const snapshot = await db.collection("coupons").get();

    allCoupons = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          active: toBoolean(data.active), // تحويل فوري
        };
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

    const container = document.getElementById("couponsList");

    if (!container) return;

    if (allCoupons.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <p>لا توجد كوبونات. اضغط "إضافة كوبون" للبدء</p>
                </div>
            `;
      return;
    }

    container.innerHTML = allCoupons
      .map((coupon) => renderCouponCard(coupon))
      .join("");
  } catch (error) {
    console.error("❌ خطأ في تحميل الكوبونات:", error);
  }
}

// ============================================
// عرض بطاقة الكوبون
// ============================================
function renderCouponCard(coupon) {
  const now = new Date();
  let isExpired = false;

  // التحقق من تاريخ الانتهاء
  if (coupon.validUntil) {
    const validUntil = coupon.validUntil.toDate
      ? coupon.validUntil.toDate()
      : new Date(coupon.validUntil);
    isExpired = now > validUntil;
  }

  // التأكد من أن active Boolean
  const isActive = toBoolean(coupon.active);

  // القيمة
  const valueDisplay =
    coupon.type === "percentage" ? `${coupon.value}%` : `$${coupon.value}`;

  // تاريخ الانتهاء
  let expiryText = "غير محدد";
  if (coupon.validUntil) {
    const date = coupon.validUntil.toDate
      ? coupon.validUntil.toDate()
      : new Date(coupon.validUntil);
    expiryText = date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // الاستخدام
  const usedCount = parseInt(coupon.usedCount) || 0;
  const usage = coupon.usageLimit
    ? `${usedCount} / ${coupon.usageLimit}`
    : `${usedCount} / ∞`;

  // نسبة الاستخدام
  let progressPercent = 0;
  if (coupon.usageLimit) {
    progressPercent = Math.min(100, (usedCount / coupon.usageLimit) * 100);
  }

  // الشروط
  const conditions = [];
  if (coupon.minPurchase) {
    conditions.push(`حد أدنى: $${coupon.minPurchase}`);
  }
  if (coupon.maxDiscount && coupon.type === "percentage") {
    conditions.push(`أقصى خصم: $${coupon.maxDiscount}`);
  }

  // الشارة
  let statusBadge = "";
  if (isExpired) {
    statusBadge =
      '<span style="background:#f8d7da; color:#721c24; padding:0.3rem 0.8rem; border-radius:15px; font-size:0.8rem; font-weight:600;">⏰ منتهي</span>';
  } else if (!isActive) {
    statusBadge =
      '<span style="background:#e2e3e5; color:#383d41; padding:0.3rem 0.8rem; border-radius:15px; font-size:0.8rem; font-weight:600;">⏸️ معطل</span>';
  } else {
    statusBadge =
      '<span style="background:#d4edda; color:#155724; padding:0.3rem 0.8rem; border-radius:15px; font-size:0.8rem; font-weight:600;">✅ نشط</span>';
  }

  // فئة البطاقة
  let cardClass = "coupon-card";
  if (isExpired) {
    cardClass += " expired";
  } else if (!isActive) {
    cardClass += " inactive";
  }

  return `
        <div class="${cardClass}">
            <div class="coupon-header">
                <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                    <span class="coupon-code-big">${coupon.code}</span>
                    <span class="coupon-value-badge">${valueDisplay}</span>
                    ${statusBadge}
                </div>
            </div>
            
            <div class="coupon-details">
                <div class="coupon-detail">
                    <i class="fas fa-calendar-times"></i>
                    <span>ينتهي: ${expiryText}</span>
                </div>
                <div class="coupon-detail">
                    <i class="fas fa-chart-bar"></i>
                    <span>الاستخدام: ${usage}</span>
                </div>
                ${conditions
                  .map(
                    (c) => `
                    <div class="coupon-detail">
                        <i class="fas fa-info-circle"></i>
                        <span>${c}</span>
                    </div>
                `,
                  )
                  .join("")}
            </div>
            
            ${
              coupon.usageLimit
                ? `
                <div class="coupon-progress">
                    <div class="coupon-progress-bar" style="width: ${progressPercent}%;"></div>
                </div>
                <small style="color:#999; font-size:0.75rem;">${progressPercent.toFixed(0)}% مستخدم</small>
            `
                : ""
            }
            
            <div class="coupon-actions" style="margin-top:1rem;">
                <button class="coupon-action-btn toggle" onclick="toggleCouponStatus('${coupon.id}')">
                    ${!isActive ? "✅ تفعيل" : "⏸️ تعطيل"}
                </button>
                <button class="coupon-action-btn delete" onclick="deleteCoupon('${coupon.id}')">
                    <i class="fas fa-trash"></i> حذف
                </button>
            </div>
        </div>
    `;
}

// ============================================
// فتح نموذج الكوبون
// ============================================
function openCouponForm() {
  const modal = document.getElementById("couponModal");
  const form = document.getElementById("couponForm");
  const title = document.getElementById("couponModalTitle");

  if (!modal || !form) {
    alert("خطأ: نافذة الكوبون غير موجودة");
    return;
  }

  title.innerHTML = '<i class="fas fa-plus"></i> إضافة كوبون';
  form.reset();

  const couponIdField = document.getElementById("couponId");
  if (couponIdField) couponIdField.value = "";

  // تعطيل حقل أقصى خصم افتراضياً
  const maxDiscountInput = document.getElementById("couponMaxDiscount");
  if (maxDiscountInput) {
    maxDiscountInput.disabled = true;
    maxDiscountInput.value = "";
  }

  // تعيين التاريخ الافتراضي (بعد أسبوع)
  const validUntilField = document.getElementById("couponValidUntil");
  if (validUntilField) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    validUntilField.value = nextWeek.toISOString().split("T")[0];
  }

  // تعيين الحالة افتراضياً
  const activeField = document.getElementById("couponActive");
  if (activeField) {
    activeField.value = "true";
  }

  modal.classList.add("active");
}

// ============================================
// تغيير نوع الخصم
// ============================================
function onCouponTypeChange() {
  const typeField = document.getElementById("couponType");
  const maxDiscountInput = document.getElementById("couponMaxDiscount");

  if (!typeField || !maxDiscountInput) return;

  const type = typeField.value;

  if (type === "percentage") {
    maxDiscountInput.disabled = false;
    maxDiscountInput.placeholder = "مثال: 50";
  } else {
    maxDiscountInput.disabled = true;
    maxDiscountInput.value = "";
    maxDiscountInput.placeholder = "غير مطلوب";
  }
}

// ============================================
// تهيئة نموذج الكوبون
// ============================================
function initCouponForm() {
  const form = document.getElementById("couponForm");
  if (!form) {
    console.warn("⚠️ couponForm غير موجود");
    return;
  }

  // إزالة أي event listeners قديمة
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  newForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const couponId = document.getElementById("couponId")?.value || "";
    const saveBtn = document.getElementById("saveCouponBtn");

    if (!saveBtn) return;

    const code = document
      .getElementById("couponCodeInput")
      .value.trim()
      .toUpperCase();

    // التحقق من صيغة الكود
    if (!/^[A-Z0-9]+$/.test(code)) {
      alert(
        "❌ كود الكوبون يجب أن يحتوي على أحرف إنجليزية وأرقام فقط (بدون مسافات)",
      );
      return;
    }

    if (code.length < 3) {
      alert("❌ كود الكوبون يجب أن يكون 3 أحرف على الأقل");
      return;
    }

    // التحقق من القيمة
    const value = parseFloat(document.getElementById("couponValue").value);
    if (!value || value <= 0) {
      alert("❌ قيمة الخصم يجب أن تكون أكبر من 0");
      return;
    }

    // التحقق من النسبة
    const type = document.getElementById("couponType").value;
    if (type === "percentage" && value > 100) {
      alert("❌ النسبة المئوية لا يمكن أن تتجاوز 100%");
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      // التحقق من عدم تكرار الكود (للإضافة فقط)
      if (!couponId) {
        const existing = await db
          .collection("coupons")
          .where("code", "==", code)
          .limit(1)
          .get();

        if (!existing.empty) {
          alert("❌ هذا الكود مستخدم بالفعل. اختر كوداً آخر");
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الكوبون';
          return;
        }
      }

      // جمع البيانات
      const activeValue = document.getElementById("couponActive").value;
      const activeBoolean = activeValue === "true"; // Boolean حقيقي

      const couponData = {
        code: code,
        type: type,
        value: value,
        minPurchase:
          parseFloat(document.getElementById("couponMinPurchase").value) || 0,
        maxDiscount:
          parseFloat(document.getElementById("couponMaxDiscount").value) ||
          null,
        usageLimit:
          parseInt(document.getElementById("couponUsageLimit").value) || null,
        active: activeBoolean, // Boolean حقيقي
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // التواريخ
      const validFrom = document.getElementById("couponValidFrom").value;
      const validUntil = document.getElementById("couponValidUntil").value;

      if (validFrom) {
        couponData.validFrom = firebase.firestore.Timestamp.fromDate(
          new Date(validFrom),
        );
      }
      if (validUntil) {
        const untilDate = new Date(validUntil);
        untilDate.setHours(23, 59, 59, 999);
        couponData.validUntil =
          firebase.firestore.Timestamp.fromDate(untilDate);
      }

      // حفظ
      if (couponId) {
        await db.collection("coupons").doc(couponId).update(couponData);
        if (typeof showNotification === "function") {
          showNotification("✓ تم تعديل الكوبون");
        } else {
          alert("✓ تم تعديل الكوبون");
        }
      } else {
        couponData.usedCount = 0;
        couponData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        couponData.createdBy = auth.currentUser?.uid || "unknown";

        await db.collection("coupons").add(couponData);
        if (typeof showNotification === "function") {
          showNotification("✓ تم إضافة الكوبون");
        } else {
          alert("✓ تم إضافة الكوبون");
        }
      }

      document.getElementById("couponModal").classList.remove("active");
      newForm.reset();
      await loadCoupons();
    } catch (error) {
      console.error("❌ خطأ:", error);
      alert("حدث خطأ: " + error.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ الكوبون';
    }
  });

  console.log("✅ نموذج الكوبون جاهز");
}

// ============================================
// تبديل حالة الكوبون
// ============================================
async function toggleCouponStatus(couponId) {
  try {
    const coupon = allCoupons.find((c) => c.id === couponId);
    if (!coupon) return;

    const currentStatus = toBoolean(coupon.active);
    const newStatus = !currentStatus;

    await db.collection("coupons").doc(couponId).update({
      active: newStatus, // Boolean
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    coupon.active = newStatus;

    if (typeof showNotification === "function") {
      showNotification(
        newStatus ? "✓ تم تفعيل الكوبون" : "⏸️ تم تعطيل الكوبون",
      );
    }

    // إعادة التحميل
    await loadCoupons();
  } catch (error) {
    console.error("❌ خطأ:", error);
    alert("حدث خطأ: " + error.message);
  }
}

// ============================================
// حذف الكوبون
// ============================================
async function deleteCoupon(couponId) {
  if (!confirm("هل أنت متأكد من حذف هذا الكوبون؟")) return;

  try {
    await db.collection("coupons").doc(couponId).delete();

    if (typeof showNotification === "function") {
      showNotification("✓ تم حذف الكوبون");
    }

    await loadCoupons();
  } catch (error) {
    console.error("❌ خطأ:", error);
    alert("حدث خطأ: " + error.message);
  }
}

// ============================================
// التهيئة عند تحميل الصفحة
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  // تهيئة النموذج
  setTimeout(() => {
    initCouponForm();
  }, 100);

  // إغلاق النافذة
  const closeBtn = document.getElementById("closeCouponModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      document.getElementById("couponModal").classList.remove("active");
    });
  }

  // إغلاق عند الضغط خارجها
  const modal = document.getElementById("couponModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });
  }
});

// جعل الدوال متاحة عالمياً
window.loadCoupons = loadCoupons;
window.openCouponForm = openCouponForm;
window.onCouponTypeChange = onCouponTypeChange;
window.toggleCouponStatus = toggleCouponStatus;
window.deleteCoupon = deleteCoupon;
window.toBoolean = toBoolean;

console.log("✅ coupons-admin.js تم تحميله");
