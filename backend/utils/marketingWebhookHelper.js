const MARKETING_WEBHOOK_URL = process.env.MARKETING_WEBHOOK_URL || 'http://localhost:5000/api/webhooks/tutor-event';

/**
 * Dispatches an event to the Cuvasol Marketing Portal webhook asynchronously.
 * Non-blocking with silent failure handling so tutoring workflows are never affected.
 */
async function sendMarketingEvent(payload) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(MARKETING_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cuvasol-Tutor-Platform/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Marketing Webhook] Response status ${res.status}: ${errText}`);
      return null;
    }

    const data = await res.json().catch(() => null);
    console.log(`[Marketing Webhook] Successfully delivered "${payload.event}" for refCode [${payload.refCode}]:`, data?.message || 'OK');
    return data;
  } catch (err) {
    console.warn(`[Marketing Webhook] Failed to deliver event "${payload?.event}": ${err.message}`);
    return null;
  }
}

/**
 * Triggered when a new student signs up on tutor.cuvasol.com with an affiliate marketing referral code.
 */
async function notifyMarketingStudentSignup({ refCode, studentName, studentEmail, studentPhone }) {
  if (!refCode) return;
  return sendMarketingEvent({
    event: 'STUDENT_SIGNUP',
    refCode: refCode.trim().toUpperCase(),
    studentName: studentName || 'New Student',
    studentEmail: studentEmail || '',
    studentPhone: studentPhone || ''
  });
}

/**
 * Triggered when a referred student completes a class on tutor.cuvasol.com.
 */
async function notifyMarketingClassCompleted({ refCode, studentEmail, studentName, bookingId, subject, planType, commissionAmount }) {
  if (!refCode) return;
  return sendMarketingEvent({
    event: 'CLASS_COMPLETED',
    refCode: refCode.trim().toUpperCase(),
    studentEmail: studentEmail || '',
    studentName: studentName || 'Student',
    bookingId: bookingId ? bookingId.toString() : '',
    subject: subject || 'Class Session',
    planType: planType || 'Regular Class',
    commissionAmount: Number(commissionAmount) || 500
  });
}

module.exports = {
  notifyMarketingStudentSignup,
  notifyMarketingClassCompleted,
  sendMarketingEvent
};
