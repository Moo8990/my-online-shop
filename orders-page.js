// ============================================
// orders-page.js - عرض الطلبات في صفحة "طلباتي"
// ============================================

let allOrders = [];
let currentFilter = "all";

// عناصر DOM
const ordersContainer = document.getElementById("ordersContainer");
const filterTabs = document.getElementById("filterTabs");
const orderDetailsModal = document.getElementById("orderDetailsModal");
const orderDetailsContent = document.getElementById("orderDetailsContent");
const closeDetails = document.getElementById("closeDetails");
const notification = document.getElementById("notification");

// ============================================
// مراقبة حالة المستخدم
// ============================================
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("✅ المستخدم مسجل:", user.email);
    await loadUserOrders(user.uid);
  } else {
    console.log("❌ لا يوجد مستخدم مسجل");
    ordersContainer.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-lock"></i>
                <h2>يجب تسجيل الدخول</h2>
                <p>سجل دخولك لعرض طلباتك</p>
                <a href="login.html">
                    <i class="fas fa-sign-in-alt"></i> تسجيل الدخول
                </a>
            </div>
        `;
  }
});

// ============================================
// تحميل طلبات المستخدم
// ============================================
async function loadUserOrders(uid) {
  try {
    console.log("📦 جاري تحميل الطلبات...");

    const snapshot = await db
      .collection("orders")
      .where("userId", "==", uid)
      .get();

    allOrders = [];
    snapshot.forEach((doc) => {
      allOrders.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    // ترتيب حسب التاريخ (الأحدث أولاً)
    allOrders.sort((a, b) => {
      const dateA = a.createdAt?.toDate() || new Date(0);
      const dateB = b.createdAt?.toDate() || new Date(0);
      return dateB - dateA;
    });

    console.log("✅ تم تحميل", allOrders.length, "طلب");

    updateCounts();
    renderOrders();
  } catch (error) {
    console.error("❌ خطأ في تحميل الطلبات:", error);
    ordersContainer.innerHTML = `
            <div class="empty-orders">
                <i class="fas fa-exclamation-triangle" style="color:#e94560;"></i>
                <h2>حدث خطأ</h2>
                <p>${error.message}</p>
            </div>
        `;
  }
}

// ============================================
// تحديث العدادات
// ============================================
function updateCounts() {
  const counts = {
    all: allOrders.length,
    pending: allOrders.filter((o) => o.status === "pending").length,
    confirmed: allOrders.filter((o) => o.status === "confirmed").length,
    shipped: allOrders.filter((o) => o.status === "shipped").length,
    delivered: allOrders.filter((o) => o.status === "delivered").length,
  };

  document.getElementById("countAll").textContent = counts.all;
  document.getElementById("countPending").textContent = counts.pending;
  document.getElementById("countConfirmed").textContent = counts.confirmed;
  document.getElementById("countShipped").textContent = counts.shipped;
  document.getElementById("countDelivered").textContent = counts.delivered;
}

// ============================================
// ترجمة الحالة
// ============================================
function getStatusInfo(status) {
  const statuses = {
    pending: { text: "معلقة", icon: "fa-clock", class: "pending" },
    confirmed: { text: "مؤكدة", icon: "fa-check", class: "confirmed" },
    shipped: { text: "مشحونة", icon: "fa-truck", class: "shipped" },
    delivered: {
      text: "تم التسليم",
      icon: "fa-check-circle",
      class: "delivered",
    },
    cancelled: { text: "ملغاة", icon: "fa-times-circle", class: "cancelled" },
  };
  return statuses[status] || statuses.pending;
}

// ============================================
// تنسيق التاريخ
// ============================================
function formatDate(timestamp) {
  if (!timestamp) return "غير محدد";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("ar-EG", options);
}

// ============================================
// تنسيق التاريخ المختصر
// ============================================
function formatDateShort(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `${diffMins}د`;
  if (diffHours < 24) return `${diffHours}س`;
  if (diffDays < 7) return `${diffDays}ي`;

  return date.toLocaleDateString("ar-EG", {
    month: "short",
    day: "numeric",
  });
}

// ============================================
// مخطط تتبع الطلب
// ============================================
function renderTimeline(order) {
  const steps = [
    { key: "pending", label: "تم الطلب", icon: "fa-shopping-cart" },
    { key: "confirmed", label: "مؤكد", icon: "fa-check" },
    { key: "shipped", label: "قيد الشحن", icon: "fa-truck" },
    { key: "delivered", label: "تم التسليم", icon: "fa-home" },
  ];

  // إذا كان الطلب ملغى
  if (order.status === "cancelled") {
    return `
            <div class="timeline-step cancelled" style="flex:1;">
                <div class="step-icon">
                    <i class="fas fa-times"></i>
                </div>
                <div class="step-label">ملغى</div>
                <div class="step-date">${formatDateShort(order.updatedAt || order.createdAt)}</div>
            </div>
        `;
  }

  // ترتيب المراحل
  const statusOrder = ["pending", "confirmed", "shipped", "delivered"];
  const currentIndex = statusOrder.indexOf(order.status);

  return steps
    .map((step, index) => {
      let stateClass = "";

      if (index < currentIndex) {
        stateClass = "completed";
      } else if (index === currentIndex) {
        stateClass = "current";
      }

      // تحديد التاريخ
      let dateText = "";
      if (index === 0 && order.createdAt) {
        dateText = formatDateShort(order.createdAt);
      } else if (index === currentIndex && order.updatedAt) {
        dateText = formatDateShort(order.updatedAt);
      } else if (index < currentIndex) {
        dateText = "✓";
      }

      return `
            <div class="timeline-step ${stateClass}">
                <div class="step-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="step-label">${step.label}</div>
                ${dateText ? `<div class="step-date">${dateText}</div>` : ""}
            </div>
        `;
    })
    .join("");
}

// ============================================
// عرض الطلبات
// ============================================
function renderOrders() {
  let filtered = allOrders;

  if (currentFilter !== "all") {
    filtered = allOrders.filter((o) => o.status === currentFilter);
  }

  if (filtered.length === 0) {
    if (allOrders.length === 0) {
      ordersContainer.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-box-open"></i>
                    <h2>لا توجد طلبات بعد</h2>
                    <p>ابدأ التسوق الآن واكتشف منتجاتنا الرائعة</p>
                    <a href="index.html">
                        <i class="fas fa-shopping-bag"></i> تسوق الآن
                    </a>
                </div>
            `;
    } else {
      ordersContainer.innerHTML = `
                <div class="empty-orders">
                    <i class="fas fa-filter"></i>
                    <h2>لا توجد طلبات بهذه الحالة</h2>
                    <p>جرب اختيار تصنيف آخر</p>
                </div>
            `;
    }
    return;
  }

  ordersContainer.innerHTML = filtered
    .map((order) => {
      const statusInfo = getStatusInfo(order.status);
      const itemsPreview = order.items
        .slice(0, 3)
        .map(
          (item) => `
            <div class="item-preview">
                <img src="${item.image}" alt="${item.name}">
                <div>
                    <div class="item-name">${item.name.length > 20 ? item.name.substring(0, 20) + "..." : item.name}</div>
                    <div class="item-qty">الكمية: ${item.quantity}</div>
                </div>
            </div>
        `,
        )
        .join("");

      const moreItems =
        order.items.length > 3
          ? `<div class="item-preview" style="background:#e8f0fe;color:#667eea;font-weight:bold;">+${order.items.length - 3} منتج آخر</div>`
          : "";

      const canCancel = order.status === "pending";

      return `
            <div class="order-card status-${order.status}">
                <div class="order-header">
                    <div>
                        <div class="order-id">
                            <i class="fas fa-hashtag"></i> ${order.orderId}
                        </div>
                        <div class="order-date">
                            <i class="far fa-calendar"></i> ${formatDate(order.createdAt)}
                        </div>
                    </div>
                    <div class="status-badge ${statusInfo.class}">
                        <i class="fas ${statusInfo.icon}"></i> ${statusInfo.text}
                    </div>
                </div>
                
                <div class="order-items-preview">
                    ${itemsPreview}
                    ${moreItems}
                </div>
                
                <!-- مخطط تتبع الطلب -->
                <div class="timeline">
                    ${renderTimeline(order)}
                </div>
                
                <div class="order-footer">
                    <div class="order-total">
                        الإجمالي: <span>$${order.total.toFixed(2)}</span>
                    </div>
                    <div class="order-actions">
                        <button class="btn-view" onclick="showOrderDetails('${order.id}')">
                            <i class="fas fa-eye"></i> عرض التفاصيل
                        </button>
                        ${
                          canCancel
                            ? `
                            <button class="btn-cancel" onclick="cancelOrder('${order.id}')">
                                <i class="fas fa-times"></i> إلغاء
                            </button>
                        `
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

// ============================================
// عرض تفاصيل الطلب
// ============================================
function showOrderDetails(orderId) {
  const order = allOrders.find((o) => o.id === orderId);
  if (!order) return;

  const statusInfo = getStatusInfo(order.status);
  const total = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  orderDetailsContent.innerHTML = `
        <div class="details-section">
            <h3><i class="fas fa-info-circle"></i> معلومات الطلب</h3>
            <div class="detail-row">
                <span>رقم الطلب</span>
                <span style="font-family:monospace;">${order.orderId}</span>
            </div>
            <div class="detail-row">
                <span>التاريخ</span>
                <span>${formatDate(order.createdAt)}</span>
            </div>
            <div class="detail-row">
                <span>الحالة</span>
                <span class="status-badge ${statusInfo.class}" style="display:inline-flex;">
                    <i class="fas ${statusInfo.icon}"></i> ${statusInfo.text}
                </span>
            </div>
            <div class="detail-row">
                <span>طريقة الدفع</span>
                <span>الدفع عند الاستلام</span>
            </div>
        </div>
        
        <!-- مخطط تتبع الطلب -->
        <div style="padding: 1rem 0; border-bottom: 1px solid #f0f0f0;">
            <div class="timeline" style="margin: 0;">
                ${renderTimeline(order)}
            </div>
        </div>
        
        <div class="details-section" style="margin-top: 1.5rem;">
            <h3><i class="fas fa-map-marker-alt"></i> عنوان التوصيل</h3>
            <div class="detail-row">
                <span>الاسم</span>
                <span>${order.shippingAddress.fullName}</span>
            </div>
            <div class="detail-row">
                <span>الهاتف</span>
                <span>${order.shippingAddress.phone}</span>
            </div>
            <div class="detail-row">
                <span>المدينة</span>
                <span>${order.shippingAddress.city}</span>
            </div>
            <div class="detail-row">
                <span>العنوان</span>
                <span>${order.shippingAddress.address}</span>
            </div>
        </div>
        
        <div class="details-section">
            <h3><i class="fas fa-shopping-bag"></i> المنتجات (${order.items.length})</h3>
            ${order.items
              .map(
                (item) => `
                <div class="detail-item">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="detail-item-info">
                        <strong>${item.name}</strong>
                        <small>${item.quantity} × $${item.price.toFixed(2)}</small>
                    </div>
                    <div class="detail-item-price">
                        $${(item.price * item.quantity).toFixed(2)}
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
        
        <div class="detail-row" style="font-size:1.2rem; padding-top:1rem; border-top:2px solid #f0f0f0; margin-top:1rem;">
            <span style="font-weight:bold; color:#1a1a2e;">الإجمالي</span>
            <span style="color:#e94560; font-weight:bold;">$${total.toFixed(2)}</span>
        </div>
    `;

  orderDetailsModal.classList.add("active");
}

// ============================================
// إلغاء الطلب
// ============================================
async function cancelOrder(orderId) {
  if (!confirm("هل أنت متأكد من إلغاء هذا الطلب؟")) return;

  try {
    await db.collection("orders").doc(orderId).update({
      status: "cancelled",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // تحديث محلياً
    const order = allOrders.find((o) => o.id === orderId);
    if (order) order.status = "cancelled";

    updateCounts();
    renderOrders();
    showNotification("✓ تم إلغاء الطلب بنجاح");
  } catch (error) {
    console.error("خطأ في إلغاء الطلب:", error);
    showNotification("حدث خطأ أثناء إلغاء الطلب", true);
  }
}

// ============================================
// إشعار
// ============================================
function showNotification(message, isError = false) {
  if (!notification) return;
  notification.textContent = message;
  notification.className = "notification show" + (isError ? " error" : "");
  setTimeout(() => {
    notification.classList.remove("show");
  }, 2500);
}

// ============================================
// الأحداث
// ============================================

// تصفية الطلبات
filterTabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".filter-tab");
  if (!tab) return;

  document
    .querySelectorAll(".filter-tab")
    .forEach((t) => t.classList.remove("active"));
  tab.classList.add("active");

  currentFilter = tab.dataset.filter;
  renderOrders();
});

// إغلاق نافذة التفاصيل
closeDetails.addEventListener("click", () => {
  orderDetailsModal.classList.remove("active");
});

orderDetailsModal.addEventListener("click", (e) => {
  if (e.target === orderDetailsModal) {
    orderDetailsModal.classList.remove("active");
  }
});

// ============================================
// جعل الدوال متاحة عالمياً
// ============================================
window.showOrderDetails = showOrderDetails;
window.cancelOrder = cancelOrder;
window.renderTimeline = renderTimeline;

console.log("✅ orders-page.js تم تحميله");
