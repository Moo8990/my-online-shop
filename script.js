// ============================================
// script.js - منطق المتجر الرئيسي
// ============================================

// ============================================
// قاعدة بيانات المنتجات - تُحمّل من Firestore
// ============================================
let products = [];

// ============================================
// متغيرات الحالة
// ============================================
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
let currentCategory = "all";
let searchQuery = "";

// ============================================
// عناصر DOM
// ============================================
const productsContainer = document.getElementById("productsContainer");
const cartIcon = document.getElementById("cartIcon");
const wishlistIcon = document.getElementById("wishlistIcon");
const cartModal = document.getElementById("cartModal");
const wishlistModal = document.getElementById("wishlistModal");
const cartItems = document.getElementById("cartItems");
const wishlistItems = document.getElementById("wishlistItems");
const cartCount = document.getElementById("cartCount");
const wishlistCount = document.getElementById("wishlistCount");
const cartTotal = document.getElementById("cartTotal");
const closeCart = document.getElementById("closeCart");
const closeWishlist = document.getElementById("closeWishlist");
const notification = document.getElementById("notification");
const searchInput = document.getElementById("searchInput");
const noResults = document.getElementById("noResults");
// ============================================
// تحميل المنتجات من Firestore
// ============================================
async function loadProductsFromFirestore() {
  try {
    console.log("⏳ جاري تحميل المنتجات من Firestore...");

    // إظهار Skeleton أثناء التحميل
    if (typeof showSkeletonLoading === "function") {
      showSkeletonLoading();
    }

    const snapshot = await db.collection("products").get();

    products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`✅ تم تحميل ${products.length} منتج`);

    // إعادة رسم المنتجات
    renderProducts();
  } catch (error) {
    console.error("❌ خطأ في تحميل المنتجات:", error);

    if (productsContainer) {
      productsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #e94560;"></i>
                    <h3 style="margin-top: 1rem; color: #1a1a2e;">فشل تحميل المنتجات</h3>
                    <p style="color: #999; margin-top: 0.5rem;">${error.message}</p>
                    <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.8rem 2rem; background: #667eea; color: white; border: none; border-radius: 25px; cursor: pointer;">
                        <i class="fas fa-redo"></i> إعادة المحاولة
                    </button>
                </div>
            `;
    }
  }
}

// ============================================
// عرض المنتجات
// ============================================
function renderProducts() {
  if (!productsContainer) return;

  let filtered = products;

  if (currentCategory !== "all") {
    filtered = filtered.filter((p) => p.category === currentCategory);
  }

  if (searchQuery.trim()) {
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description &&
          p.description.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }

  if (filtered.length === 0) {
    productsContainer.innerHTML = "";
    if (noResults) noResults.style.display = "block";
    return;
  }

  if (noResults) noResults.style.display = "none";

  productsContainer.innerHTML = filtered
    .map((product) => {
      const inWishlist = wishlist.find((w) => w.id === product.id);
      const rating = product.rating || 5;
      const reviews = product.reviews || 0;

      return `
            <div class="product-card">
                <div class="product-image-wrapper" onclick="goToProduct('${product.id}')">
                    <img src="${product.image}" alt="${product.name}">
                    ${product.badge ? `<div class="badge">${product.badge}</div>` : ""}
                    <button class="wishlist-btn ${inWishlist ? "active" : ""}" 
                            onclick="event.stopPropagation(); toggleWishlist('${product.id}')">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="product-info">
                    <h3 onclick="goToProduct('${product.id}')">${product.name}</h3>
                    <div class="rating">
                        ${"★".repeat(Math.floor(rating))}${"☆".repeat(5 - Math.floor(rating))}
                        <span>(${reviews})</span>
                    </div>
                    <div class="price">
                        $${product.price.toFixed(2)}
                        ${product.oldPrice ? `<span class="old-price">$${product.oldPrice.toFixed(2)}</span>` : ""}
                    </div>
                    <button class="add-to-cart-btn" onclick="addToCart('${product.id}')">
                        <i class="fas fa-cart-plus"></i> أضف إلى السلة
                    </button>
                </div>
            </div>
        `;
    })
    .join("");
}

// ============================================
// الانتقال لصفحة تفاصيل المنتج
// ============================================
function goToProduct(id) {
  window.location.href = `product.html?id=${id}`;
}

// ============================================
// إضافة إلى السلة
// ============================================
function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) {
    console.warn("⚠️ المنتج غير موجود:", productId);
    return;
  }

  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  updateCartUI();
  showNotification("✓ تمت الإضافة إلى السلة");
}

// ============================================
// حفظ السلة (محلي + Firebase)
// ============================================
function saveCart() {
  // حفظ محلياً
  localStorage.setItem("cart", JSON.stringify(cart));

  // حفظ في Firebase إذا كان المستخدم مسجل دخول
  if (
    typeof saveCartToFirestore === "function" &&
    typeof auth !== "undefined" &&
    auth.currentUser
  ) {
    saveCartToFirestore(cart);
  }
}

// ============================================
// حفظ المفضلة
// ============================================
function saveWishlist() {
  localStorage.setItem("wishlist", JSON.stringify(wishlist));
}

// ============================================
// تحديث واجهة السلة
// ============================================
function updateCartUI() {
  if (!cartCount || !cartItems || !cartTotal) return;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;

  if (cart.length === 0) {
    cartItems.innerHTML =
      '<p style="text-align:center;color:#999;padding:2rem;">🛒 السلة فارغة</p>';
    cartTotal.textContent = "0.00";
    return;
  }

  cartItems.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <strong>${item.name}</strong><br>
                <small>$${item.price.toFixed(2)}</small>
                <div class="quantity-controls">
                    <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <button class="remove-btn" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `,
    )
    .join("");

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotal.textContent = total.toFixed(2);
}

// ============================================
// تغيير الكمية
// ============================================
function changeQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  saveCart();
  updateCartUI();
}

// ============================================
// إزالة من السلة
// ============================================
function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  updateCartUI();
  showNotification("تم الحذف من السلة", true);
}

// ============================================
// تبديل المفضلة
// ============================================
function toggleWishlist(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;

  const index = wishlist.findIndex((w) => w.id === productId);

  if (index > -1) {
    wishlist.splice(index, 1);
    showNotification("تم الحذف من المفضلة", true);
  } else {
    wishlist.push(product);
    showNotification("❤️ تمت الإضافة للمفضلة");
  }
  saveWishlist();
  updateWishlistUI();
  renderProducts();
}

// ============================================
// تحديث واجهة المفضلة
// ============================================
function updateWishlistUI() {
  if (!wishlistCount || !wishlistItems) return;

  wishlistCount.textContent = wishlist.length;

  if (wishlist.length === 0) {
    wishlistItems.innerHTML =
      '<p style="text-align:center;color:#999;padding:2rem;">لا توجد منتجات في المفضلة</p>';
    return;
  }

  wishlistItems.innerHTML = wishlist
    .map(
      (item) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div class="cart-item-info">
                <strong>${item.name}</strong><br>
                <small>$${item.price.toFixed(2)}</small>
            </div>
            <button class="add-to-cart-btn" style="width:auto;padding:0.5rem 1rem;" 
                    onclick="addToCart('${item.id}')">
                أضف
            </button>
        </div>
    `,
    )
    .join("");
}

// ============================================
// إشعار
// ============================================
function showNotification(message, isError = false) {
  if (!notification) {
    console.log(message);
    return;
  }
  notification.textContent = message;
  notification.className = "notification show" + (isError ? " error" : "");
  setTimeout(() => {
    notification.classList.remove("show");
  }, 2500);
}

// ============================================
// الأحداث
// ============================================

// فتح/إغلاق السلة
if (cartIcon) {
  cartIcon.addEventListener("click", () => cartModal.classList.add("active"));
}
if (closeCart) {
  closeCart.addEventListener("click", () =>
    cartModal.classList.remove("active"),
  );
}
if (cartModal) {
  cartModal.addEventListener("click", (e) => {
    if (e.target === cartModal) cartModal.classList.remove("active");
  });
}

// فتح/إغلاق المفضلة
if (wishlistIcon) {
  wishlistIcon.addEventListener("click", () =>
    wishlistModal.classList.add("active"),
  );
}
if (closeWishlist) {
  closeWishlist.addEventListener("click", () =>
    wishlistModal.classList.remove("active"),
  );
}
if (wishlistModal) {
  wishlistModal.addEventListener("click", (e) => {
    if (e.target === wishlistModal) wishlistModal.classList.remove("active");
  });
}

// البحث
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderProducts();
  });
}

// الفئات
document.querySelectorAll(".category-card").forEach((card) => {
  card.addEventListener("click", () => {
    document
      .querySelectorAll(".category-card")
      .forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    currentCategory = card.dataset.category;
    renderProducts();
  });
});

// ============================================
// التهيئة
// ============================================
updateCartUI();
updateWishlistUI();

// تحميل المنتجات من Firestore
loadProductsFromFirestore();

console.log("✅ script.js تم تحميله بنجاح");
