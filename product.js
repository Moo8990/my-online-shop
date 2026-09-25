// ============================================
// product.js - صفحة تفاصيل المنتج مع التقييمات
// ============================================

// ============================================
// متغيرات الحالة
// ============================================
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let wishlist = JSON.parse(localStorage.getItem("wishlist")) || [];
let currentProduct = null;
let currentRating = 0;
let userRating = null;

// ============================================
// عناصر DOM
// ============================================
const notification = document.getElementById("notification");
const cartCount = document.getElementById("cartCount");
const productDetail = document.getElementById("productDetail");
const cartIcon = document.getElementById("cartIcon");

// ============================================
// قراءة id المنتج من الرابط
// ============================================
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");

console.log("🔍 المنتج المطلوب:", productId);

// ============================================
// تحميل المنتج من Firestore
// ============================================
async function loadProduct() {
  console.log("⏳ بدء تحميل المنتج...");

  if (!productId) {
    showProductNotFound("لم يتم تحديد المنتج");
    return;
  }

  try {
    const doc = await db.collection("products").doc(productId).get();

    if (!doc.exists) {
      console.log("❌ المنتج غير موجود في Firestore");
      showProductNotFound("المنتج غير موجود");
      return;
    }

    const product = { id: doc.id, ...doc.data() };
    currentProduct = product;

    console.log("✅ تم تحميل المنتج:", product.name);

    renderProductDetail(product);
    updateCartCount();
  } catch (error) {
    console.error("❌ خطأ في تحميل المنتج:", error);
    showProductNotFound(error.message);
  }
}

// ============================================
// عرض "المنتج غير موجود"
// ============================================
function showProductNotFound(message = "المنتج غير موجود") {
  if (!productDetail) return;

  productDetail.innerHTML = `
        <div style="text-align:center; grid-column: 1/-1; padding: 3rem;">
            <i class="fas fa-box-open" style="font-size:4rem; color:#ddd; margin-bottom:1rem;"></i>
            <h2 style="color:#1a1a2e; margin-bottom: 0.5rem;">${message}</h2>
            <p style="color:#999; margin-bottom: 2rem;">ربما تم حذف المنتج أو الرابط غير صحيح</p>
            <a href="index.html" style="display:inline-block; padding:0.9rem 2rem; background:linear-gradient(135deg, #667eea, #764ba2); color:white; text-decoration:none; border-radius:25px; font-weight: bold;">
                <i class="fas fa-arrow-right"></i> العودة للمتجر
            </a>
        </div>
    `;
}

// ============================================
// عرض تفاصيل المنتج
// ============================================
function renderProductDetail(product) {
  console.log("🎨 جاري عرض المنتج...");

  if (!productDetail) {
    console.error("❌ عنصر productDetail غير موجود في HTML");
    return;
  }

  const rating = product.rating || 0;
  const reviews = product.reviews || 0;
  const inWishlist = wishlist.find((w) => w.id === product.id);

  productDetail.innerHTML = `
        <div>
            <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="product-detail-info">
            ${product.badge ? `<div class="badge" style="position:static; display:inline-block; margin-bottom:1rem;">${product.badge}</div>` : ""}
            <h1>${product.name}</h1>
            <div class="rating">
                ${"★".repeat(Math.floor(rating))}${"☆".repeat(5 - Math.floor(rating))}
                <span>(${reviews} تقييم)</span>
            </div>
            <div class="price">
                $${product.price.toFixed(2)}
                ${product.oldPrice ? `<span class="old-price" style="font-size:1.2rem;">$${product.oldPrice.toFixed(2)}</span>` : ""}
            </div>
            <p class="description">${product.description || "لا يوجد وصف متاح"}</p>
            <div class="detail-actions">
                <button class="btn-primary" onclick="addToCart()">
                    <i class="fas fa-cart-plus"></i> أضف إلى السلة
                </button>
                <button class="btn-secondary ${inWishlist ? "active" : ""}" id="wishlistBtn" onclick="toggleWishlist()">
                    <i class="fas fa-heart"></i> ${inWishlist ? "في المفضلة" : "المفضلة"}
                </button>
            </div>
        </div>
    `;

  console.log("✅ تم عرض المنتج بنجاح");

  // تحميل التقييمات
  loadRatings();
}

// ============================================
// تحميل التقييمات
// ============================================
async function loadRatings() {
  if (!currentProduct) return;

  try {
    // التحقق إذا كان المستخدم قد قيّم هذا المنتج
    if (auth.currentUser) {
      const userRatingDoc = await db
        .collection("products")
        .doc(currentProduct.id)
        .collection("ratings")
        .doc(auth.currentUser.uid)
        .get();

      if (userRatingDoc.exists) {
        userRating = userRatingDoc.data();
        currentRating = userRating.rating;
      }
    }

    // تحميل كل التقييمات
    const ratingsSnapshot = await db
      .collection("products")
      .doc(currentProduct.id)
      .collection("ratings")
      .orderBy("createdAt", "desc")
      .get();

    const ratings = ratingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("📊 عدد التقييمات:", ratings.length);

    renderRatingsSection(ratings);

    // تحديث متوسط التقييم
    if (ratings.length > 0) {
      const avg =
        ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      updateProductRatingDisplay(avg, ratings.length);
    }
  } catch (error) {
    console.error("❌ خطأ في تحميل التقييمات:", error);
  }
}

// ============================================
// تحديث عرض التقييم في بطاقة المنتج
// ============================================
function updateProductRatingDisplay(avg, count) {
  const ratingEl = document.querySelector(".product-detail-info .rating");
  if (!ratingEl) return;

  const rounded = Math.round(avg);

  ratingEl.innerHTML = `
        ${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}
        <span>(${count} تقييم) - متوسط ${avg.toFixed(1)}</span>
    `;
}

// ============================================
// عرض قسم التقييمات
// ============================================
function renderRatingsSection(ratings) {
  if (!productDetail) return;

  // إزالة القسم القديم إذا وُجد
  const oldSection = document.getElementById("ratingsSection");
  if (oldSection) oldSection.remove();

  const user = auth.currentUser;
  const isLoggedIn = !!user;

  const ratingsHTML = `
        <div class="ratings-section" id="ratingsSection">
            <h2 class="ratings-title">
                <i class="fas fa-star" style="color:#ffc107;"></i> 
                التقييمات (${ratings.length})
            </h2>
            
            ${
              isLoggedIn
                ? `
                <div class="add-rating-form">
                    <h3 class="rating-form-title">
                        ${userRating ? "✏️ تعديل تقييمك" : "⭐ أضف تقييمك"}
                    </h3>
                    
                    <div class="rating-stars-input">
                        ${[1, 2, 3, 4, 5]
                          .map(
                            (num) => `
                            <i class="fas fa-star rating-star-input ${userRating && userRating.rating >= num ? "active" : ""}" 
                               data-value="${num}"
                               onclick="setRating(${num})"></i>
                        `,
                          )
                          .join("")}
                    </div>
                    
                    <textarea id="ratingComment" 
                              class="rating-comment-input"
                              placeholder="اكتب رأيك عن المنتج (اختياري)...">${userRating ? userRating.comment || "" : ""}</textarea>
                    
                    <button onclick="submitRating()" class="submit-rating-btn" id="submitRatingBtn">
                        <i class="fas fa-paper-plane"></i> ${userRating ? "تحديث التقييم" : "إرسال التقييم"}
                    </button>
                </div>
            `
                : `
                <div class="login-to-rate">
                    <p>
                        <i class="fas fa-info-circle"></i> 
                        <a href="login.html">سجل دخولك</a> لتتمكن من إضافة تقييم
                    </p>
                </div>
            `
            }
            
            <div class="ratings-list">
                ${
                  ratings.length === 0
                    ? `<div class="no-ratings">
                        <i class="fas fa-comment-slash"></i>
                        <p>لا توجد تقييمات بعد. كن أول من يقيّم!</p>
                       </div>`
                    : ratings
                        .map(
                          (r) => `
                        <div class="rating-item">
                            <div class="rating-header">
                                <div class="rating-user">
                                    <div class="user-avatar">
                                        ${(r.userName || "م").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <strong>${r.userName || "مستخدم"}</strong>
                                        <small>${formatRatingDate(r.createdAt)}</small>
                                    </div>
                                </div>
                                <div class="rating-stars-display">
                                    ${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}
                                </div>
                            </div>
                            ${r.comment ? `<p class="rating-comment">${r.comment}</p>` : ""}
                        </div>
                    `,
                        )
                        .join("")
                }
            </div>
        </div>
    `;

  // إضافة القسم بعد محتوى المنتج
  const infoDiv = productDetail.querySelector(".product-detail-info");
  if (infoDiv) {
    infoDiv.insertAdjacentHTML("afterend", ratingsHTML);
  } else {
    productDetail.insertAdjacentHTML("beforeend", ratingsHTML);
  }
}

// ============================================
// تعيين التقييم عند الضغط على النجمة
// ============================================
function setRating(value) {
  currentRating = value;

  document.querySelectorAll(".rating-star-input").forEach((star) => {
    const starValue = parseInt(star.dataset.value);
    if (starValue <= value) {
      star.classList.add("active");
    } else {
      star.classList.remove("active");
    }
  });
}

// ============================================
// إرسال التقييم
// ============================================
async function submitRating() {
  const user = auth.currentUser;
  if (!user) {
    showNotification("يجب تسجيل الدخول أولاً", true);
    return;
  }

  if (currentRating === 0) {
    showNotification("يرجى اختيار عدد النجوم", true);
    return;
  }

  const comment = document.getElementById("ratingComment")?.value.trim() || "";
  const btn = document.getElementById("submitRatingBtn");

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإرسال...';

  try {
    const ratingData = {
      userId: user.uid,
      userName: user.displayName || user.email.split("@")[0],
      rating: currentRating,
      comment: comment,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db
      .collection("products")
      .doc(currentProduct.id)
      .collection("ratings")
      .doc(user.uid)
      .set(ratingData);

    console.log("✅ تم حفظ التقييم");

    userRating = ratingData;

    showNotification("✓ تم حفظ تقييمك بنجاح");

    // تحديث متوسط التقييم في Firestore
    await updateProductAverageRating();

    // إعادة تحميل التقييمات
    await loadRatings();
  } catch (error) {
    console.error("❌ خطأ:", error);
    showNotification("حدث خطأ، حاول مرة أخرى", true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="fas fa-paper-plane"></i> ' +
        (userRating ? "تحديث التقييم" : "إرسال التقييم");
    }
  }
}

// ============================================
// تحديث متوسط التقييم في المنتج
// ============================================
async function updateProductAverageRating() {
  try {
    const snapshot = await db
      .collection("products")
      .doc(currentProduct.id)
      .collection("ratings")
      .get();

    if (snapshot.empty) return;

    let total = 0;
    snapshot.forEach((doc) => {
      total += doc.data().rating;
    });

    const avg = total / snapshot.size;

    await db
      .collection("products")
      .doc(currentProduct.id)
      .update({
        rating: parseFloat(avg.toFixed(1)),
        reviews: snapshot.size,
      });

    console.log("✅ تم تحديث متوسط التقييم:", avg.toFixed(1));
  } catch (error) {
    console.error("خطأ في تحديث المتوسط:", error);
  }
}

// ============================================
// تنسيق تاريخ التقييم
// ============================================
function formatRatingDate(timestamp) {
  if (!timestamp) return "الآن";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays < 30) return `منذ ${diffDays} يوم`;

  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ============================================
// إضافة إلى السلة
// ============================================
function addToCart() {
  if (!currentProduct) return;

  const existingItem = cart.find((item) => item.id === currentProduct.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...currentProduct, quantity: 1 });
  }

  saveCart();
  updateCartCount();
  showNotification("✓ تمت الإضافة إلى السلة");
}

// ============================================
// حفظ السلة
// ============================================
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));

  if (typeof auth !== "undefined" && auth.currentUser) {
    db.collection("carts")
      .doc(auth.currentUser.uid)
      .set({
        items: cart,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      })
      .catch((err) => console.warn("تحذير: لم يتم حفظ السلة في Firebase", err));
  }
}

// ============================================
// تبديل المفضلة
// ============================================
function toggleWishlist() {
  if (!currentProduct) return;

  const index = wishlist.findIndex((w) => w.id === currentProduct.id);
  const btn = document.getElementById("wishlistBtn");

  if (index > -1) {
    wishlist.splice(index, 1);
    showNotification("تم الحذف من المفضلة", true);
    if (btn) {
      btn.classList.remove("active");
      btn.innerHTML = '<i class="fas fa-heart"></i> المفضلة';
    }
  } else {
    wishlist.push(currentProduct);
    showNotification("❤️ تمت الإضافة للمفضلة");
    if (btn) {
      btn.classList.add("active");
      btn.innerHTML = '<i class="fas fa-heart"></i> في المفضلة';
    }
  }

  localStorage.setItem("wishlist", JSON.stringify(wishlist));
}

// ============================================
// تحديث عداد السلة
// ============================================
function updateCartCount() {
  if (!cartCount) return;
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = total;
}

// ============================================
// إشعار
// ============================================
function showNotification(message, isError = false) {
  if (!notification) {
    alert(message);
    return;
  }
  notification.textContent = message;
  notification.className = "notification show" + (isError ? " error" : "");
  setTimeout(() => notification.classList.remove("show"), 2500);
}

// ============================================
// الأحداث
// ============================================
if (cartIcon) {
  cartIcon.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

// ============================================
// جعل الدوال متاحة عالمياً
// ============================================
window.setRating = setRating;
window.submitRating = submitRating;
window.addToCart = addToCart;
window.toggleWishlist = toggleWishlist;

// ============================================
// التهيئة
// ============================================
loadProduct();
updateCartCount();

console.log("✅ product.js تم تحميله بنجاح");
