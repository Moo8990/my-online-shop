// ============================================
// coupons.js - نظام كوبونات الخصم (للعميل)
// ============================================

let appliedCoupon = null;
let currentDiscount = 0;

// ============================================
// دالة مساعدة: تحويل القيمة إلى Boolean
// ============================================
function toBooleanCoupon(value) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  return false;
}

// ============================================
// تطبيق الكوبون
// ============================================
async function applyCoupon() {
  const input = document.getElementById("couponCode");
  const messageEl = document.getElementById("couponMessage");
  const btn = document.getElementById("applyCouponBtn");

  if (!input || !messageEl) return;

  const code = input.value.trim().toUpperCase();

  if (!code) {
    showCouponMessage("❌ يرجى إدخال كود الخصم", "error");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  messageEl.classList.remove("show");

  try {
    const snapshot = await db
      .collection("coupons")
      .where("code", "==", code)
      .limit(1)
      .get();

    if (snapshot.empty) {
      showCouponMessage("❌ كود الخصم غير صحيح", "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> تطبيق';
      return;
    }

    const couponDoc = snapshot.docs[0];
    const couponData = couponDoc.data();

    // تحويل active إلى Boolean
    const coupon = {
      id: couponDoc.id,
      ...couponData,
      active: toBooleanCoupon(couponData.active),
    };

    const validation = validateCoupon(coupon);

    if (!validation.valid) {
      showCouponMessage(validation.message, "error");
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> تطبيق';
      return;
    }

    appliedCoupon = coupon;
    window.appliedCoupon = coupon;

    const cartTotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    currentDiscount = calculateDiscount(coupon, cartTotal);
    window.currentDiscount = currentDiscount;

    showCouponMessage(
      `✅ تم تطبيق الكوبون! خصم $${currentDiscount.toFixed(2)}`,
      "success",
    );

    if (typeof renderOrderSummary === "function") {
      renderOrderSummary();
    }

    if (typeof showModernToast === "function") {
      showModernToast(
        "🎟️ تم تطبيق الكوبون",
        `خصم $${currentDiscount.toFixed(2)}`,
        "success",
      );
    }

    console.log("✅ كوبون مطبّق:", coupon.code, "- خصم:", currentDiscount);
  } catch (error) {
    console.error("❌ خطأ:", error);
    showCouponMessage("حدث خطأ، حاول مرة أخرى", "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> تطبيق';
  }
}

// ============================================
// التحقق من صحة الكوبون
// ============================================
function validateCoupon(coupon) {
  // التحقق من التفعيل
  const isActive = toBooleanCoupon(coupon.active);
  if (!isActive) {
    return { valid: false, message: "❌ هذا الكوبون غير نشط" };
  }

  // تاريخ الانتهاء
  if (coupon.validUntil) {
    const now = new Date();
    const validUntil = coupon.validUntil.toDate
      ? coupon.validUntil.toDate()
      : new Date(coupon.validUntil);

    if (now > validUntil) {
      return { valid: false, message: "❌ انتهت صلاحية هذا الكوبون" };
    }
  }

  // تاريخ البداية
  if (coupon.validFrom) {
    const now = new Date();
    const validFrom = coupon.validFrom.toDate
      ? coupon.validFrom.toDate()
      : new Date(coupon.validFrom);

    if (now < validFrom) {
      return { valid: false, message: "❌ هذا الكوبون لم يبدأ بعد" };
    }
  }

  // حد الاستخدام
  const usedCount = parseInt(coupon.usedCount) || 0;
  if (coupon.usageLimit && usedCount >= coupon.usageLimit) {
    return { valid: false, message: "❌ تم استنفاد هذا الكوبون" };
  }

  // الحد الأدنى للشراء
  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
    return {
      valid: false,
      message: `❌ الحد الأدنى للشراء $${coupon.minPurchase}`,
    };
  }

  return { valid: true };
}

// ============================================
// حساب قيمة الخصم
// ============================================
function calculateDiscount(coupon, total) {
  let discount = 0;

  if (coupon.type === "percentage") {
    discount = (total * coupon.value) / 100;

    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else if (coupon.type === "fixed") {
    discount = coupon.value;

    if (discount > total) {
      discount = total;
    }
  }

  return parseFloat(discount.toFixed(2));
}

// ============================================
// إزالة الكوبون
// ============================================
function removeCoupon() {
  appliedCoupon = null;
  currentDiscount = 0;
  window.appliedCoupon = null;
  window.currentDiscount = 0;

  const input = document.getElementById("couponCode");
  if (input) input.value = "";

  const messageEl = document.getElementById("couponMessage");
  if (messageEl) {
    messageEl.classList.remove("show");
  }

  if (typeof renderOrderSummary === "function") {
    renderOrderSummary();
  }

  if (typeof showModernToast === "function") {
    showModernToast("🗑️ تم إزالة الكوبون", "", "success");
  }
}

// ============================================
// عرض رسالة الكوبون
// ============================================
function showCouponMessage(message, type) {
  const messageEl = document.getElementById("couponMessage");
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = "coupon-message " + type + " show";
}

// ============================================
// زيادة عداد الاستخدام
// ============================================
async function incrementCouponUsage(couponId) {
  try {
    await db
      .collection("coupons")
      .doc(couponId)
      .update({
        usedCount: firebase.firestore.FieldValue.increment(1),
        lastUsedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    console.log("✅ تم تحديث عداد الكوبون");
  } catch (error) {
    console.error("❌ خطأ:", error);
  }
}

// ============================================
// إعادة تعيين
// ============================================
function resetCoupon() {
  appliedCoupon = null;
  currentDiscount = 0;
  window.appliedCoupon = null;
  window.currentDiscount = 0;

  const input = document.getElementById("couponCode");
  if (input) input.value = "";

  const messageEl = document.getElementById("couponMessage");
  if (messageEl) messageEl.classList.remove("show");
}

// جعل الدوال متاحة عالمياً
window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;
window.incrementCouponUsage = incrementCouponUsage;
window.resetCoupon = resetCoupon;
window.calculateDiscount = calculateDiscount;
window.validateCoupon = validateCoupon;
window.getAppliedCoupon = () => appliedCoupon;
window.getCurrentDiscount = () => currentDiscount;

console.log("✅ coupons.js تم تحميله");
