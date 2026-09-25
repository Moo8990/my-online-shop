// ============================================
// email.js - إرسال إشعارات البريد (قالب موحّد)
// ============================================

// ============================================
// إعدادات المحتوى حسب الحالة
// ============================================
function getEmailContentByStatus(status) {
  const configs = {
    pending: {
      subject: "تم استلام طلبك #{{order_id}} - متجري",
      header_title: "🎉 تم استلام طلبك!",
      header_color: "linear-gradient(135deg, #667eea, #764ba2)",
      main_message: "تم استلام طلبك بنجاح وسيتم التواصل معك قريباً لتأكيده.",
      status_text: "معلقة",
    },
    confirmed: {
      subject: "تم تأكيد طلبك #{{order_id}} ✅",
      header_title: "✅ تم تأكيد طلبك!",
      header_color: "linear-gradient(135deg, #17a2b8, #007bff)",
      main_message: "تم تأكيد طلبك بنجاح وجاري تجهيزه للشحن.",
      status_text: "مؤكدة",
    },
    shipped: {
      subject: "طلبك #{{order_id}} في الطريق إليك 🚚",
      header_title: "🚚 طلبك في الطريق!",
      header_color: "linear-gradient(135deg, #007bff, #0056b3)",
      main_message:
        "يسعدنا إخبارك بأن طلبك قد تم شحنه وهو في الطريق إليك. سيصلك خلال 2-3 أيام عمل.",
      status_text: "مشحونة",
    },
    delivered: {
      subject: "تم تسليم طلبك #{{order_id}} بنجاح 🎉",
      header_title: "🎉 تم تسليم طلبك!",
      header_color: "linear-gradient(135deg, #28a745, #20c997)",
      main_message: "تم تسليم طلبك بنجاح. نأمل أن تكون راضياً عن تجربتك!",
      status_text: "تم التسليم",
    },
    cancelled: {
      subject: "تم إلغاء طلبك #{{order_id}}",
      header_title: "❌ تم إلغاء طلبك",
      header_color: "linear-gradient(135deg, #e94560, #c73552)",
      main_message:
        "تم إلغاء طلبك. إذا كان لديك أي استفسار، يرجى التواصل معنا.",
      status_text: "ملغاة",
    },
  };

  return configs[status] || configs.pending;
}

// ============================================
// إرسال بريد تحديث حالة الطلب
// ============================================
async function sendOrderStatusEmail(order, status) {
  try {
    console.log("📧 إرسال بريد:", status);

    const content = getEmailContentByStatus(status);

    // استبدال {{order_id}} في الموضوع
    const subject = content.subject.replace("{{order_id}}", order.orderId);

    const templateParams = {
      // الموضوع
      email_subject: subject,

      // معلومات المستلم
      to_email: order.userEmail,
      to_name: order.userName,

      // معلومات الطلب
      order_id: order.orderId,
      order_total: order.total.toFixed(2),
      items_count: order.items.length,

      // عنوان التوصيل
      shipping_name: order.shippingAddress?.fullName || "",
      shipping_phone: order.shippingAddress?.phone || "",
      shipping_city: order.shippingAddress?.city || "",
      shipping_address: order.shippingAddress?.address || "",

      // التصميم حسب الحالة
      header_title: content.header_title,
      header_color: content.header_color,
      main_message: content.main_message,
      status_text: content.status_text,

      // الروابط
      orders_url: `${window.location.origin}/orders.html`,
    };

    const response = await emailjs.send(
      EMAILJS_CONFIG.serviceId,
      EMAILJS_CONFIG.templateId,
      templateParams,
    );

    console.log("✅ تم إرسال البريد:", response.status);
    return true;
  } catch (error) {
    console.error("❌ فشل إرسال البريد:", error);
    return false;
  }
}

// ============================================
// دوال مختصرة للاستخدام
// ============================================
async function sendOrderConfirmationEmail(order, user) {
  return sendOrderStatusEmail(
    {
      ...order,
      userEmail: user.email,
      userName: user.displayName || user.email.split("@")[0],
    },
    "pending",
  );
}

async function sendOrderShippedEmail(order) {
  return sendOrderStatusEmail(order, "shipped");
}

async function sendOrderDeliveredEmail(order) {
  return sendOrderStatusEmail(order, "delivered");
}

// جعل الدوال متاحة عالمياً
window.sendOrderStatusEmail = sendOrderStatusEmail;
window.sendOrderConfirmationEmail = sendOrderConfirmationEmail;
window.sendOrderShippedEmail = sendOrderShippedEmail;
window.sendOrderDeliveredEmail = sendOrderDeliveredEmail;

console.log("✅ email.js تم تحميله");
