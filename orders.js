// ============================================
// orders.js - حفظ الطلبات في Firestore
// ============================================

// عناصر DOM
const checkoutModal = document.getElementById("checkoutModal");
const checkoutForm = document.getElementById("checkoutForm");
const closeCheckout = document.getElementById("closeCheckout");
const orderSummary = document.getElementById("orderSummary");
const confirmOrderBtn = document.getElementById("confirmOrderBtn");

// ============================================
// توليد رقم طلب فريد
// ============================================
function generateOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

// ============================================
// حساب الخصم
// ============================================
function calculateDiscountValue(coupon, total) {
  if (!coupon) return 0;

  let discount = 0;

  if (coupon.type === "percentage") {
    discount = (total * coupon.value) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else if (coupon.type === "fixed") {
    discount = coupon.value;
    if (discount > total) discount = total;
  }

  return parseFloat(discount.toFixed(2));
}

// ============================================
// فتح نافذة إتمام الطلب
// ============================================
function openCheckout() {
  console.log("🛒 فتح نافذة الطلب");

  if (!auth.currentUser) {
    alert("يجب تسجيل الدخول أولاً");
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1000);
    return;
  }

  if (!cart || cart.length === 0) {
    alert("السلة فارغة!");
    return;
  }

  const cartModalEl = document.getElementById("cartModal");
  if (cartModalEl) cartModalEl.classList.remove("active");

  const user = auth.currentUser;
  const shipNameEl = document.getElementById("shipName");
  if (shipNameEl) shipNameEl.value = user.displayName || "";

  loadSavedAddress(user.uid);
  renderOrderSummary();

  if (checkoutModal) {
    checkoutModal.classList.add("active");
  }
}

// ============================================
// تحميل العنوان المحفوظ
// ============================================
async function loadSavedAddress(uid) {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists && userDoc.data().address) {
      const addr = userDoc.data().address;

      const nameEl = document.getElementById("shipName");
      const phoneEl = document.getElementById("shipPhone");
      const cityEl = document.getElementById("shipCity");
      const addressEl = document.getElementById("shipAddress");

      if (nameEl && addr.fullName) nameEl.value = addr.fullName;
      if (phoneEl && addr.phone) phoneEl.value = addr.phone;
      if (cityEl && addr.city) cityEl.value = addr.city;
      if (addressEl && addr.details) addressEl.value = addr.details;
    }
  } catch (error) {
    console.warn("تحذير:", error);
  }
}

// ============================================
// عرض ملخص الطلب
// ============================================
function renderOrderSummary() {
  if (!orderSummary) return;

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const coupon = window.appliedCoupon || null;
  const discount = coupon ? calculateDiscountValue(coupon, subtotal) : 0;
  const finalTotal = Math.max(0, subtotal - discount);

  orderSummary.innerHTML = `
        ${cart
          .map(
            (item) => `
            <div class="order-summary-item">
                <span>${item.name} × ${item.quantity}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `,
          )
          .join("")}
        
        ${
          discount > 0
            ? `
            <div class="order-summary-item">
                <span>المجموع الفرعي</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="order-summary-discount">
                <span>
                    <i class="fas fa-ticket-alt"></i> 
                    خصم (${coupon.code})
                    <button type="button" class="coupon-remove-btn" onclick="removeCoupon()" title="إزالة">
                        <i class="fas fa-times"></i>
                    </button>
                </span>
                <span>-$${discount.toFixed(2)}</span>
            </div>
        `
            : ""
        }
        
        <div class="order-summary-total">
            <span>الإجمالي:</span>
            <span>$${finalTotal.toFixed(2)}</span>
        </div>
    `;
}

// ============================================
// إتمام الطلب
// ============================================
if (checkoutForm) {
  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
      alert("يجب تسجيل الدخول");
      return;
    }

    // جمع بيانات الشحن
    const shippingAddress = {
      fullName: document.getElementById("shipName").value.trim(),
      phone: document.getElementById("shipPhone").value.trim(),
      address: document.getElementById("shipAddress").value.trim(),
      city: document.getElementById("shipCity").value.trim(),
    };

    // التحقق
    if (
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.address ||
      !shippingAddress.city
    ) {
      alert("يرجى ملء جميع الحقول");
      return;
    }

    confirmOrderBtn.disabled = true;
    confirmOrderBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> جاري حفظ الطلب...';

    try {
      // ⭐ 1. تعريف المتغيرات (هذا ما كان ناقصاً!)
      const subtotal = cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const coupon = window.appliedCoupon || null;
      const discount = coupon ? calculateDiscountValue(coupon, subtotal) : 0;
      const total = Math.max(0, subtotal - discount);

      console.log("💰 الحساب:", {
        subtotal,
        discount,
        total,
        coupon: coupon?.code || "none",
      });

      // ⭐ 2. توليد رقم الطلب
      const orderId = generateOrderId();

      // ⭐ 3. تحضير بيانات الطلب
      const orderData = {
        orderId: orderId,
        userId: user.uid,
        userName: user.displayName || "مستخدم",
        userEmail: user.email,
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: parseFloat(discount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        couponCode: coupon?.code || null,
        couponId: coupon?.id || null,
        status: "pending",
        paymentMethod: "cash_on_delivery",
        shippingAddress: shippingAddress,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      console.log("📦 حفظ الطلب:", orderData);

      // ⭐ 4. حفظ الطلب
      const orderRef = await db.collection("orders").add(orderData);
      console.log("✅ تم حفظ الطلب برقم:", orderRef.id);

      // ⭐ 5. زيادة عداد الكوبون
      if (coupon && typeof incrementCouponUsage === "function") {
        try {
          await incrementCouponUsage(coupon.id);
          console.log("✅ تم تحديث عداد الكوبون");
        } catch (err) {
          console.warn("⚠️ عداد الكوبون:", err);
        }
      }

      // ⭐ 6. حفظ العنوان
      try {
        await db
          .collection("users")
          .doc(user.uid)
          .update({
            address: {
              fullName: shippingAddress.fullName,
              phone: shippingAddress.phone,
              city: shippingAddress.city,
              details: shippingAddress.address,
            },
          });
      } catch (addrErr) {
        console.warn("⚠️ لم يتم حفظ العنوان:", addrErr);
      }

      // ⭐ 7. تفريغ السلة من Firestore
      try {
        await db.collection("carts").doc(user.uid).set({
          items: [],
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.warn("⚠️ لم يتم تفريغ السلة:", err);
      }

      // ⭐ 8. إرسال بريد التأكيد
      if (typeof sendOrderConfirmationEmail === "function") {
        try {
          await sendOrderConfirmationEmail(orderData, user);
          console.log("📧 تم إرسال بريد التأكيد");
        } catch (emailError) {
          console.warn("⚠️ فشل البريد:", emailError);
        }
      }

      // ⭐ 9. تفريغ السلة محلياً
      cart = [];
      localStorage.setItem("cart", JSON.stringify(cart));

      // ⭐ 10. إعادة تعيين الكوبون
      if (typeof resetCoupon === "function") {
        resetCoupon();
      }
      window.appliedCoupon = null;
      window.currentDiscount = 0;

      // ⭐ 11. تحديث واجهة السلة
      if (typeof updateCartUI === "function") {
        updateCartUI();
      }

      // ⭐ 12. عرض شاشة النجاح
      showSuccessScreen(orderId, total);
    } catch (error) {
      console.error("❌ خطأ في حفظ الطلب:", error);

      let errorMsg = "حدث خطأ أثناء حفظ الطلب";
      if (error.code === "permission-denied") {
        errorMsg = "مشكلة في صلاحيات Firebase";
      }

      alert(errorMsg + "\n" + error.message);
      confirmOrderBtn.disabled = false;
      confirmOrderBtn.innerHTML =
        '<i class="fas fa-check-circle"></i> تأكيد الطلب';
    }
  });
}

// ============================================
// شاشة النجاح
// ============================================
function showSuccessScreen(orderId, total) {
  const checkoutContent = document.querySelector(".checkout-content");
  if (!checkoutContent) return;

  checkoutContent.innerHTML = `
        <div class="success-screen">
            <div class="check-icon">
                <i class="fas fa-check"></i>
            </div>
            <h2>🎉 تم استلام طلبك!</h2>
            <p>شكراً لك، سيتم التواصل معك قريباً</p>
            
            <div class="order-number">رقم الطلب: ${orderId}</div>
            
            <p style="font-size:1.2rem;">
                الإجمالي: <strong style="color:#e94560;">$${total.toFixed(2)}</strong>
            </p>
            
            <p style="color: #28a745; margin-top: 1rem;">
                <i class="fas fa-envelope"></i> تم إرسال تفاصيل الطلب إلى بريدك
            </p>
            
            <div style="margin-top:1.5rem;">
                <button onclick="window.location.href='orders.html'" style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;border:none;padding:0.9rem 2rem;border-radius:25px;font-size:1rem;font-weight:bold;cursor:pointer;margin:0.3rem;">
                    <i class="fas fa-box"></i> عرض طلباتي
                </button>
                <button onclick="window.location.href='index.html'" style="background:linear-gradient(135deg,#28a745,#20c997);color:white;border:none;padding:0.9rem 2rem;border-radius:25px;font-size:1rem;font-weight:bold;cursor:pointer;margin:0.3rem;">
                    <i class="fas fa-home"></i> مواصلة التسوق
                </button>
            </div>
        </div>
    `;
}

// ============================================
// إغلاق نافذة الطلب
// ============================================
if (closeCheckout) {
  closeCheckout.addEventListener("click", () => {
    checkoutModal.classList.remove("active");
  });
}

if (checkoutModal) {
  checkoutModal.addEventListener("click", (e) => {
    if (e.target === checkoutModal) {
      checkoutModal.classList.remove("active");
    }
  });
}

// ============================================
// ربط زر "إتمام الشراء"
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const checkoutBtn = document.getElementById("checkoutBtn");
    if (checkoutBtn) {
      const newBtn = checkoutBtn.cloneNode(true);
      checkoutBtn.parentNode.replaceChild(newBtn, checkoutBtn);

      newBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("🛒 تم الضغط على إتمام الشراء");
        openCheckout();
      });

      console.log("✅ تم ربط زر إتمام الشراء");
    }
  }, 100);
});

// جعل الدوال متاحة عالمياً
window.openCheckout = openCheckout;
window.calculateDiscountValue = calculateDiscountValue;
