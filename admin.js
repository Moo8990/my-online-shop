// ============================================
// admin.js - لوحة تحكم المشرف (كامل)
// ============================================

let allOrders = [];
let allProducts = [];
let allUsers = [];
let allCoupons = [];

// عناصر DOM
const accessDenied = document.getElementById("accessDenied");
const adminPanel = document.getElementById("adminPanel");
const adminName = document.getElementById("adminName");
const pageTitle = document.getElementById("pageTitle");
const notification = document.getElementById("notification");
const productModal = document.getElementById("productModal");
const productForm = document.getElementById("productForm");
const closeProductModal = document.getElementById("closeProductModal");
const productModalTitle = document.getElementById("productModalTitle");

// ============================================
// التحقق من صلاحيات المشرف
// ============================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  try {
    const userDoc = await db.collection("users").doc(user.uid).get();

    if (!userDoc.exists) {
      accessDenied.style.display = "block";
      return;
    }

    const userData = userDoc.data();

    if (userData.role !== "admin") {
      accessDenied.style.display = "block";
      adminPanel.style.display = "none";
      return;
    }

    adminName.textContent = userData.name || user.email;
    adminPanel.style.display = "grid";

    await loadDashboard();

    // تحميل شارة التحققات
    setTimeout(updateVerificationsBadge, 1000);
  } catch (error) {
    console.error("❌ خطأ:", error);
    accessDenied.style.display = "block";
  }
});

// ============================================
// التبديل بين التبويبات
// ============================================
document.querySelectorAll(".menu-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab;

    document
      .querySelectorAll(".menu-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    document
      .querySelectorAll(".tab-content")
      .forEach((t) => t.classList.remove("active"));
    document.getElementById("tab-" + tab).classList.add("active");

    const titles = {
      dashboard: "الرئيسية",
      orders: "الطلبات",
      products: "المنتجات",
      coupons: "كوبونات الخصم",
      verifications: "طلبات التحقق",
      users: "المستخدمون",
    };
    pageTitle.textContent = titles[tab] || tab;

    if (tab === "orders") loadOrders();
    if (tab === "products") loadProducts();
    if (tab === "coupons") loadCoupons();
    if (tab === "verifications") loadVerifications();
    if (tab === "users") loadUsers();
  });
});

// ============================================
// تحميل لوحة المعلومات
// ============================================
async function loadDashboard() {
  try {
    // المنتجات
    const productsSnapshot = await db.collection("products").get();
    allProducts = productsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // الطلبات
    const ordersSnapshot = await db.collection("orders").get();
    allOrders = ordersSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB - dateA;
      });

    // المستخدمون
    const usersSnapshot = await db.collection("users").get();
    allUsers = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // الإحصائيات
    const revenue = allOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((sum, o) => sum + (o.total || 0), 0);

    document.getElementById("statProducts").textContent = allProducts.length;
    document.getElementById("statRevenue").textContent =
      "$" + revenue.toFixed(2);
    document.getElementById("statOrders").textContent = allOrders.length;
    document.getElementById("statUsers").textContent = allUsers.length;

    renderRecentOrders(allOrders.slice(0, 5));
  } catch (error) {
    console.error("خطأ في تحميل البيانات:", error);
  }
}

// ============================================
// عرض أحدث الطلبات
// ============================================
function renderRecentOrders(orders) {
  const container = document.getElementById("recentOrders");

  if (orders.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>لا توجد طلبات بعد</p>
            </div>
        `;
    return;
  }

  container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                </tr>
            </thead>
            <tbody>
                ${orders
                  .map(
                    (order) => `
                    <tr>
                        <td style="font-family:monospace; font-size:0.8rem;">${order.orderId}</td>
                        <td>${order.userName || "غير معروف"}</td>
                        <td style="color:#e94560; font-weight:bold;">$${order.total.toFixed(2)}</td>
                        <td>
                            <span class="badge-status ${order.status}">
                                ${getStatusText(order.status)}
                            </span>
                        </td>
                        <td style="color:#999; font-size:0.85rem;">${formatDate(order.createdAt)}</td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>
    `;
}

// ============================================
// تحميل الطلبات
// ============================================
async function loadOrders() {
  const container = document.getElementById("ordersList");

  if (allOrders.length === 0) {
    container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>لا توجد طلبات بعد</p>
            </div>
        `;
    return;
  }

  container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>رقم الطلب</th>
                    <th>العميل</th>
                    <th>المنتجات</th>
                    <th>الإجمالي</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th>إجراءات</th>
                </tr>
            </thead>
            <tbody>
                ${allOrders
                  .map(
                    (order) => `
                    <tr>
                        <td style="font-family:monospace; font-size:0.8rem;">${order.orderId}</td>
                        <td>
                            <div>${order.userName || "غير معروف"}</div>
                            <small style="color:#999;">${order.userEmail || ""}</small>
                        </td>
                        <td>${order.items.length} منتج</td>
                        <td style="color:#e94560; font-weight:bold;">$${order.total.toFixed(2)}</td>
                        <td>
                            <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
                                <option value="pending" ${order.status === "pending" ? "selected" : ""}>معلقة</option>
                                <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>مؤكدة</option>
                                <option value="shipped" ${order.status === "shipped" ? "selected" : ""}>مشحونة</option>
                                <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>تم التسليم</option>
                                <option value="cancelled" ${order.status === "cancelled" ? "selected" : ""}>ملغاة</option>
                            </select>
                        </td>
                        <td style="color:#999; font-size:0.85rem;">${formatDate(order.createdAt)}</td>
                        <td>
                            <button class="action-btn view" onclick="viewOrderDetails('${order.id}')" title="عرض">
                                <i class="fas fa-eye"></i>
                            </button>
                        </td>
                    </tr>
                `,
                  )
                  .join("")}
            </tbody>
        </table>
    `;
}

// ============================================
// تحميل المنتجات
// ============================================
async function loadProducts() {
  try {
    const snapshot = await db.collection("products").get();
    allProducts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const container = document.getElementById("productsList");

    if (allProducts.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <p>لا توجد منتجات. اضغط "إضافة منتج" للبدء</p>
                </div>
            `;
      return;
    }

    container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>الصورة</th>
                        <th>الاسم</th>
                        <th>الفئة</th>
                        <th>السعر</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${allProducts
                      .map(
                        (product) => `
                        <tr>
                            <td><img src="${product.image}" alt="${product.name}"></td>
                            <td><strong>${product.name}</strong></td>
                            <td>${getCategoryText(product.category)}</td>
                            <td style="color:#e94560; font-weight:bold;">$${product.price.toFixed(2)}</td>
                            <td>
                                <button class="action-btn edit" onclick="editProduct('${product.id}')" title="تعديل">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="deleteProduct('${product.id}')" title="حذف">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        `;
  } catch (error) {
    console.error("خطأ:", error);
  }
}

// ============================================
// تحميل المستخدمين
// ============================================
async function loadUsers() {
  try {
    const snapshot = await db.collection("users").get();
    allUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    allUsers.sort((a, b) => {
      const dateA = a.createdAt?.toDate() || new Date(0);
      const dateB = b.createdAt?.toDate() || new Date(0);
      return dateB - dateA;
    });

    const container = document.getElementById("usersList");

    if (allUsers.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>لا يوجد مستخدمون بعد</p>
                </div>
            `;
      return;
    }

    container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>الاسم</th>
                        <th>البريد</th>
                        <th>الهاتف</th>
                        <th>الدور</th>
                        <th>التاريخ</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${allUsers.map((user) => renderUserRow(user)).join("")}
                </tbody>
            </table>
        `;
  } catch (error) {
    console.error("خطأ:", error);
  }
}

// ============================================
// عرض صف المستخدم
// ============================================
function renderUserRow(user) {
  let phoneCell = '<span style="color: #999;">-</span>';

  if (user.phone) {
    let badge = "";

    if (user.phoneVerified === true) {
      badge =
        '<span class="phone-verified-badge" style="font-size: 0.75rem;"><i class="fas fa-check-circle"></i> مؤكد</span>';
    } else if (user.verificationRequested === true) {
      badge =
        '<span class="phone-unverified-badge" style="font-size: 0.75rem; background: #cce5ff; color: #004085;"><i class="fas fa-clock"></i> قيد المراجعة</span>';
    } else {
      badge =
        '<span class="phone-unverified-badge" style="font-size: 0.75rem;"><i class="fas fa-times"></i> غير مؤكد</span>';
    }

    phoneCell = `
            <div style="display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-end;">
                <span style="direction: ltr; font-weight: 600;">${user.phone}</span>
                ${badge}
            </div>
        `;
  }

  let actionsCell = `
        <button class="action-btn view" onclick="viewUserDetails('${user.id}')" title="عرض">
            <i class="fas fa-eye"></i>
        </button>
    `;

  if (user.phone && !user.phoneVerified) {
    actionsCell = `
            <button class="action-btn view" onclick="viewUserDetails('${user.id}')" title="عرض">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="verifyUserPhone('${user.id}')" 
                    style="background: #28a745; color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem; font-weight: 600; margin-right: 0.3rem;"
                    title="تأكيد">
                <i class="fas fa-check"></i> تأكيد
            </button>
        `;
  }

  const roleBadge =
    user.role === "admin"
      ? '<span class="badge-status delivered">مشرف</span>'
      : '<span class="badge-status confirmed">عميل</span>';

  return `
        <tr>
            <td><strong>${user.name || "غير محدد"}</strong></td>
            <td style="direction:ltr; text-align:right; font-size: 0.85rem;">${user.email}</td>
            <td style="text-align: right;">${phoneCell}</td>
            <td>${roleBadge}</td>
            <td style="color:#999; font-size:0.85rem;">${formatDate(user.createdAt)}</td>
            <td>${actionsCell}</td>
        </tr>
    `;
}

// ============================================
// تحميل طلبات التحقق
// ============================================
async function loadVerifications() {
  try {
    const snapshot = await db
      .collection("users")
      .where("verificationRequested", "==", true)
      .where("phoneVerified", "==", false)
      .get();

    const pendingUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // تحديث الشارة
    const badge = document.getElementById("verificationsBadge");
    if (badge) {
      badge.textContent = pendingUsers.length;
      badge.style.display = pendingUsers.length > 0 ? "inline-block" : "none";
    }

    const container = document.getElementById("verificationsList");
    if (!container) return;

    if (pendingUsers.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle" style="color: #28a745;"></i>
                    <p>لا توجد طلبات تحقق حالياً</p>
                </div>
            `;
      return;
    }

    container.innerHTML = pendingUsers
      .map(
        (user) => `
            <div style="background: white; border-radius: 12px; padding: 1.2rem; margin-bottom: 1rem; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-right: 5px solid #ffc107;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.3rem; font-weight: bold;">
                            ${(user.name || "م").charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-weight: bold; color: #1a1a2e; font-size: 1.1rem;">${user.name || "مستخدم"}</div>
                            <div style="color: #999; font-size: 0.85rem; direction: ltr;">${user.email}</div>
                        </div>
                    </div>
                    <span style="background: #fff3cd; color: #856404; padding: 0.4rem 1rem; border-radius: 15px; font-size: 0.85rem; font-weight: 600;">
                        ⏳ في انتظار الإرسال
                    </span>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: #666; font-size: 0.9rem;">
                        <i class="fas fa-phone" style="color: #667eea; width: 20px;"></i>
                        <span style="direction: ltr; font-weight: bold; font-size: 1rem;">${user.phone}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: #666; font-size: 0.9rem;">
                        <i class="fas fa-key" style="color: #667eea; width: 20px;"></i>
                        <span>الكود: <strong style="font-family: monospace; font-size: 1.1rem; color: #667eea; letter-spacing: 2px;">${user.verificationCode}</strong></span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <button onclick="sendWhatsAppCode('${user.id}', '${user.phone}', '${user.verificationCode}', '${(user.name || "عميل").replace(/'/g, "\\'")}')"
                            style="flex: 1; min-width: 200px; background: #25D366; color: white; border: none; padding: 0.9rem 1.5rem; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-family: inherit;">
                        <i class="fab fa-whatsapp"></i> إرسال الكود على WhatsApp
                    </button>
                    <button onclick="copyCodeOnly('${user.verificationCode}')"
                            style="background: #667eea; color: white; border: none; padding: 0.9rem 1.5rem; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.95rem; font-family: inherit;">
                        <i class="fas fa-copy"></i> نسخ
                    </button>
                    <button onclick="verifyManually('${user.id}')"
                            style="background: #28a745; color: white; border: none; padding: 0.9rem 1.5rem; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.95rem; font-family: inherit;">
                        <i class="fas fa-check"></i> تأكيد يدوي
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("❌ خطأ:", error);
  }
}

// ============================================
// تحديث شارة التحققات
// ============================================
async function updateVerificationsBadge() {
  try {
    const snapshot = await db
      .collection("users")
      .where("verificationRequested", "==", true)
      .where("phoneVerified", "==", false)
      .get();

    const badge = document.getElementById("verificationsBadge");
    if (badge) {
      badge.textContent = snapshot.size;
      badge.style.display = snapshot.size > 0 ? "inline-block" : "none";
    }
  } catch (error) {
    console.error("خطأ في تحديث الشارة:", error);
  }
}

// ============================================
// إرسال الكود عبر WhatsApp
// ============================================
function sendWhatsAppCode(userId, phone, code, name) {
  let formattedPhone = phone.replace(/\s|-/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "2" + formattedPhone;
  }
  if (!formattedPhone.startsWith("20")) {
    formattedPhone = "20" + formattedPhone;
  }

  const message = encodeURIComponent(
    `مرحباً ${name}،\n\n` +
      `كود التحقق الخاص بحسابك في متجري:\n\n` +
      `🔑 ${code}\n\n` +
      `يرجى إدخاله في الصفحة لتفعيل حسابك.\n\n` +
      `شكراً لتسوقك معنا! 🛍️`,
  );

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
  window.open(whatsappUrl, "_blank");

  console.log("📱 تم فتح WhatsApp - الكود:", code);
}

// ============================================
// نسخ الكود
// ============================================
function copyCodeOnly(code) {
  navigator.clipboard
    .writeText(code)
    .then(() => {
      showNotification("✓ تم نسخ الكود: " + code);
    })
    .catch(() => {
      alert("الكود: " + code);
    });
}

// ============================================
// تأكيد يدوي
// ============================================
async function verifyManually(userId) {
  if (!confirm("هل أنت متأكد من تأكيد هذا المستخدم يدوياً؟")) return;

  try {
    await db.collection("users").doc(userId).update({
      phoneVerified: true,
      phoneVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
      verificationRequested: false,
      verifiedBy: auth.currentUser.uid,
      verifiedManually: true,
    });

    showNotification("✓ تم تأكيد المستخدم");
    loadVerifications();
  } catch (error) {
    console.error("❌ خطأ:", error);
    showNotification("حدث خطأ", true);
  }
}

// ============================================
// تأكيد رقم المستخدم (من جدول المستخدمين)
// ============================================
async function verifyUserPhone(userId) {
  if (!confirm("هل أنت متأكد من تأكيد رقم هذا المستخدم؟")) return;

  try {
    await db.collection("users").doc(userId).update({
      phoneVerified: true,
      phoneVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
      verificationRequested: false,
      verifiedBy: auth.currentUser.uid,
    });

    showNotification("✓ تم تأكيد رقم المستخدم");
    loadUsers();
  } catch (error) {
    console.error("❌ خطأ:", error);
    showNotification("حدث خطأ", true);
  }
}

// ============================================
// عرض تفاصيل المستخدم
// ============================================
function viewUserDetails(userId) {
  const user = allUsers.find((u) => u.id === userId);
  if (!user) return;

  const createdDate = user.createdAt?.toDate
    ? user.createdAt.toDate().toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "غير محدد";

  const phoneStatus = user.phoneVerified
    ? "✅ مؤكد"
    : user.verificationRequested
      ? "⏳ قيد المراجعة"
      : "❌ غير مؤكد";

  alert(`
📋 بيانات المستخدم

━━━━━━━━━━━━━━━━━━━━━━
👤 الاسم: ${user.name || "غير محدد"}
📧 البريد: ${user.email}
📱 الهاتف: ${user.phone || "غير محدد"}
📊 حالة الهاتف: ${phoneStatus}
👑 الدور: ${user.role === "admin" ? "مشرف" : "عميل"}
📅 تاريخ التسجيل: ${createdDate}
${user.verificationCode ? `🔑 كود التحقق: ${user.verificationCode}` : ""}
━━━━━━━━━━━━━━━━━━━━━━
    `);
}

// ============================================
// تحديث حالة الطلب
// ============================================
async function updateOrderStatus(orderId, newStatus) {
  try {
    const order = allOrders.find((o) => o.id === orderId);
    if (!order) return;

    const oldStatus = order.status;

    await db.collection("orders").doc(orderId).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    order.status = newStatus;
    showNotification("✓ تم تحديث حالة الطلب");

    // إرسال بريد
    if (oldStatus !== newStatus && typeof sendOrderStatusEmail === "function") {
      try {
        await sendOrderStatusEmail(order, newStatus);
        showNotification("📧 تم إرسال البريد للعميل");
      } catch (emailError) {
        console.warn("⚠️ فشل البريد:", emailError);
      }
    }
  } catch (error) {
    console.error("خطأ:", error);
    showNotification("حدث خطأ", true);
  }
}

// ============================================
// فتح نموذج المنتج
// ============================================
function openProductForm() {
  productModalTitle.innerHTML = '<i class="fas fa-plus"></i> إضافة منتج';
  productForm.reset();
  document.getElementById("productId").value = "";
  productModal.classList.add("active");
}

// ============================================
// تعديل منتج
// ============================================
function editProduct(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  productModalTitle.innerHTML = '<i class="fas fa-edit"></i> تعديل منتج';
  document.getElementById("productId").value = product.id;
  document.getElementById("productName").value = product.name;
  document.getElementById("productPrice").value = product.price;
  document.getElementById("productOldPrice").value = product.oldPrice || "";
  document.getElementById("productCategory").value = product.category;
  document.getElementById("productBadge").value = product.badge || "";
  document.getElementById("productImage").value = product.image;
  document.getElementById("productDescription").value = product.description;

  productModal.classList.add("active");
}

// ============================================
// حفظ المنتج
// ============================================
if (productForm) {
  productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const productId = document.getElementById("productId").value;
    const saveBtn = document.getElementById("saveProductBtn");

    const productData = {
      name: document.getElementById("productName").value.trim(),
      price: parseFloat(document.getElementById("productPrice").value),
      oldPrice:
        parseFloat(document.getElementById("productOldPrice").value) || null,
      category: document.getElementById("productCategory").value,
      badge: document.getElementById("productBadge").value.trim(),
      image: document.getElementById("productImage").value.trim(),
      description: document.getElementById("productDescription").value.trim(),
      rating: 4.5,
      reviews: 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
      if (productId) {
        await db.collection("products").doc(productId).update(productData);
        showNotification("✓ تم تعديل المنتج");
      } else {
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("products").add(productData);
        showNotification("✓ تم إضافة المنتج");
      }

      productModal.classList.remove("active");
      productForm.reset();
      await loadDashboard();
      loadProducts();
    } catch (error) {
      console.error("خطأ:", error);
      showNotification("حدث خطأ", true);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ المنتج';
    }
  });
}

// ============================================
// حذف منتج
// ============================================
async function deleteProduct(productId) {
  if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

  try {
    await db.collection("products").doc(productId).delete();
    showNotification("✓ تم حذف المنتج");
    await loadDashboard();
    loadProducts();
  } catch (error) {
    console.error("خطأ:", error);
    showNotification("حدث خطأ", true);
  }
}

// ============================================
// عرض تفاصيل الطلب
// ============================================
function viewOrderDetails(orderId) {
  const order = allOrders.find((o) => o.id === orderId);
  if (!order) return;

  let itemsList = order.items
    .map(
      (i) =>
        `- ${i.name} × ${i.quantity} = $${(i.price * i.quantity).toFixed(2)}`,
    )
    .join("\n");

  let discountInfo = "";
  if (order.discount && order.discount > 0) {
    discountInfo = `\nالخصم: -$${order.discount.toFixed(2)} (${order.couponCode || ""})`;
  }

  alert(`
تفاصيل الطلب: ${order.orderId}

العميل: ${order.userName}
البريد: ${order.userEmail}
الهاتف: ${order.shippingAddress.phone}
العنوان: ${order.shippingAddress.address}, ${order.shippingAddress.city}

المنتجات:
${itemsList}

المجموع الفرعي: $${(order.subtotal || order.total).toFixed(2)}${discountInfo}
الإجمالي: $${order.total.toFixed(2)}
الحالة: ${getStatusText(order.status)}
    `);
}

// ============================================
// دوال مساعدة
// ============================================
function getStatusText(status) {
  const texts = {
    pending: "معلقة",
    confirmed: "مؤكدة",
    shipped: "مشحونة",
    delivered: "تم التسليم",
    cancelled: "ملغاة",
  };
  return texts[status] || status;
}

function getCategoryText(category) {
  const texts = {
    electronics: "إلكترونيات",
    clothing: "ملابس",
    accessories: "إكسسوارات",
    home: "منزل",
  };
  return texts[category] || category;
}

function formatDate(timestamp) {
  if (!timestamp) return "غير محدد";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function showNotification(message, isError = false) {
  if (!notification) return;
  notification.textContent = message;
  notification.className = "notification show" + (isError ? " error" : "");
  setTimeout(() => notification.classList.remove("show"), 2500);
}

// ============================================
// إغلاق نوافذ
// ============================================
if (closeProductModal) {
  closeProductModal.addEventListener("click", () => {
    productModal.classList.remove("active");
  });
}

if (productModal) {
  productModal.addEventListener("click", (e) => {
    if (e.target === productModal) {
      productModal.classList.remove("active");
    }
  });
}

// ============================================
// جعل الدوال متاحة عالمياً
// ============================================
window.loadVerifications = loadVerifications;
window.sendWhatsAppCode = sendWhatsAppCode;
window.copyCodeOnly = copyCodeOnly;
window.verifyManually = verifyManually;
window.verifyUserPhone = verifyUserPhone;
window.viewUserDetails = viewUserDetails;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.viewOrderDetails = viewOrderDetails;
window.openProductForm = openProductForm;

console.log("✅ admin.js تم تحميله");
