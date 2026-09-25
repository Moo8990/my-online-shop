// ============================================
// ui.js - تحسينات الواجهة الشاملة
// ============================================

// ============================================
// 1. Dark Mode
// ============================================
const themeToggle = document.getElementById("themeToggle");

function loadTheme() {
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    updateThemeIcon(true);
  } else {
    document.body.classList.remove("dark-mode");
    updateThemeIcon(false);
  }
}

function updateThemeIcon(isDark) {
  if (!themeToggle) return;

  const icon = themeToggle.querySelector("i");
  if (icon) {
    icon.className = isDark ? "fas fa-sun" : "fas fa-moon";
  }
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    updateThemeIcon(isDark);

    showModernToast(
      isDark ? "🌙 الوضع الليلي" : "☀️ الوضع النهاري",
      isDark ? "تم تفعيل الوضع الليلي" : "تم تفعيل الوضع النهاري",
      "success",
    );
  });
}

// ============================================
// 2. Scroll to Top
// ============================================
function createScrollTopButton() {
  // إذا كان موجوداً، احذفه
  document.getElementById("scrollTopBtn")?.remove();

  const btn = document.createElement("button");
  btn.className = "scroll-top-btn";
  btn.id = "scrollTopBtn";
  btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
  btn.title = "العودة للأعلى";
  document.body.appendChild(btn);

  // إظهار/إخفاء عند التمرير
  window.addEventListener("scroll", () => {
    if (window.scrollY > 400) {
      btn.classList.add("show");
    } else {
      btn.classList.remove("show");
    }
  });

  // عند الضغط
  btn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// ============================================
// 3. Toast محسّن
// ============================================
function showModernToast(title, message, type = "success") {
  const existing = document.querySelector(".toast-modern");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = "toast-modern " + type;

  const icon = type === "success" ? "fa-check" : "fa-exclamation-triangle";

  toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================
// 4. Skeleton Loading
// ============================================
function showSkeletonLoading() {
  const container = document.getElementById("productsContainer");
  if (!container) return;

  let skeletons = "";
  for (let i = 0; i < 8; i++) {
    skeletons += `
            <div class="skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-text"></div>
                <div class="skeleton skeleton-text short"></div>
                <div class="skeleton skeleton-text tiny"></div>
                <div class="skeleton skeleton-button"></div>
            </div>
        `;
  }

  container.innerHTML = skeletons;
  console.log("⚡ Skeleton Loading ظهر");
}

// ============================================
// 5. أنيميشن ظهور العناصر
// ============================================
function animateElementsOnScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    {
      threshold: 0.1,
    },
  );

  document
    .querySelectorAll(".product-card, .order-card, .stat-card")
    .forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
      observer.observe(el);
    });
}

// ============================================
// 6. Loading Spinner Global
// ============================================
function showLoadingSpinner() {
  let spinner = document.getElementById("globalSpinner");

  if (!spinner) {
    spinner = document.createElement("div");
    spinner.id = "globalSpinner";
    spinner.className = "global-spinner";
    spinner.innerHTML = `
            <div class="spinner-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>جاري التحميل...</p>
            </div>
        `;
    document.body.appendChild(spinner);
  }

  spinner.classList.add("show");
}

function hideLoadingSpinner() {
  const spinner = document.getElementById("globalSpinner");
  if (spinner) {
    spinner.classList.remove("show");
  }
}

// ============================================
// 7. تحسين تجربة الجوال
// ============================================
function enhanceMobileExperience() {
  // منع زووم مزدوج على iOS
  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    false,
  );

  // تحسين اللمس على الأزرار
  document.querySelectorAll("button, a").forEach((el) => {
    el.addEventListener(
      "touchstart",
      function () {
        this.style.transform = "scale(0.97)";
      },
      { passive: true },
    );

    el.addEventListener(
      "touchend",
      function () {
        this.style.transform = "";
      },
      { passive: true },
    );
  });
}

// ============================================
// 8. تحديث عدد الإشعارات في العنوان
// ============================================
function updatePageTitle(count = 0) {
  const baseTitle = document.title.replace(/^\(\d+\)\s*/, "");

  if (count > 0) {
    document.title = `(${count}) ${baseTitle}`;
  } else {
    document.title = baseTitle;
  }
}

// ============================================
// التهيئة
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  createScrollTopButton();
  enhanceMobileExperience();
});

// مراقبة التمرير لتحريك العناصر
window.addEventListener("load", () => {
  setTimeout(() => {
    animateElementsOnScroll();
  }, 500);
});

// جعل الدوال متاحة عالمياً
window.showModernToast = showModernToast;
window.showSkeletonLoading = showSkeletonLoading;
window.showLoadingSpinner = showLoadingSpinner;
window.hideLoadingSpinner = hideLoadingSpinner;
window.updatePageTitle = updatePageTitle;
window.animateElementsOnScroll = animateElementsOnScroll;

console.log("✅ ui.js تم تحميله");
