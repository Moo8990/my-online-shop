// ============================================
// email-config.js - إعدادات EmailJS
// ============================================

const EMAILJS_CONFIG = {
  publicKey: "OJZqgh2D0iPJNZIzS", // ← Public Key الحقيقي
  serviceId: "service_pd21noq", // ← ضع Service ID هنا
  templateId: "template_w7zomyd", // ← ضع Template ID هنا
};

// تهيئة EmailJS
if (typeof emailjs !== "undefined") {
  emailjs.init(EMAILJS_CONFIG.publicKey);
  console.log("✅ EmailJS initialized");
  console.log("Service ID:", EMAILJS_CONFIG.serviceId);
  console.log("Template ID:", EMAILJS_CONFIG.templateId);
}

window.EMAILJS_CONFIG = EMAILJS_CONFIG;
