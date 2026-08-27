/**
 * Minimal transactional email sender for NEXBILL platform billing (trial
 * reminders, "masa percobaan habis" + payment info, invoice paid receipts).
 * This codebase had NO email infrastructure before this feature — everything
 * else (booking reminders, session-time warnings) goes out over WhatsApp via
 * scripts/whatsapp-bot.ts. Email is used here specifically because the
 * outlet owner needs a payment notice that survives even if nobody's
 * watching WhatsApp that day, per the original request ("mengirimkan email
 * untuk informasi pembayaran").
 *
 * Uses Resend (https://resend.com) via a plain fetch call — no SDK
 * dependency needed, one env var. If RESEND_API_KEY isn't set, every call
 * here is a safe no-op that just logs to the console, so local dev / a
 * fresh checkout of this repo never crashes for lack of email credentials.
 *
 * ENV required for real sending:
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL   e.g. "NEXBILL <billing@yourdomain.com>" — must be a
 *                        domain verified in your Resend account.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

function isConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; reason?: string }> {
  if (!input.to) return { sent: false, reason: "no-recipient" };
  if (!isConfigured()) {
    console.log(`[email:MOCK] To: ${input.to} — Subject: ${input.subject} (RESEND_API_KEY belum diset, email tidak benar-benar terkirim)`);
    return { sent: false, reason: "not-configured" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[email] Resend error ${res.status}: ${text}`);
      return { sent: false, reason: `resend-${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.error("[email] Gagal kirim email:", err);
    return { sent: false, reason: "exception" };
  }
}

function wrapTemplate(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2 style="color:#0891b2;margin-bottom:4px">${title}</h2>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#888">NEXBILL — Rental &amp; Billing System</p>
  </div>`;
}

export function trialReminderEmail(outletName: string, daysLeft: number, billingUrl: string) {
  const urgency = daysLeft === 0 ? "berakhir hari ini" : `tersisa ${daysLeft} hari lagi`;
  return {
    subject: daysLeft === 0 ? `Masa percobaan NEXBILL ${outletName} berakhir hari ini` : `Masa percobaan NEXBILL ${outletName} ${urgency}`,
    html: wrapTemplate(
      "Masa Percobaan Segera Berakhir",
      `<p>Halo,</p>
       <p>Masa percobaan gratis NEXBILL untuk outlet <strong>${outletName}</strong> ${urgency}.</p>
       <p>Setelah masa percobaan habis, dashboard akan masuk mode terbatas (read-only) sampai berlangganan aktif. Data kamu tetap aman dan tidak hilang.</p>
       <p><a href="${billingUrl}" style="background:#0891b2;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Berlangganan Sekarang</a></p>`
    ),
  };
}

export function trialExpiredPaymentInfoEmail(outletName: string, billingUrl: string) {
  return {
    subject: `Masa percobaan NEXBILL ${outletName} telah berakhir — informasi pembayaran`,
    html: wrapTemplate(
      "Masa Percobaan Telah Berakhir",
      `<p>Halo,</p>
       <p>Masa percobaan 30 hari untuk outlet <strong>${outletName}</strong> telah berakhir. Dashboard sekarang dalam mode terbatas (read-only) — data transaksi kamu tetap tersimpan utuh.</p>
       <p>Untuk mengaktifkan kembali akses penuh, silakan selesaikan langganan lewat halaman Langganan. Sistem akan otomatis menghitung kebutuhan smart plug berdasarkan jenis TV yang sudah kamu daftarkan.</p>
       <p><a href="${billingUrl}" style="background:#0891b2;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Lihat Info Pembayaran</a></p>`
    ),
  };
}

export function forgotPasswordEmail(name: string, resetUrl: string) {
  return {
    subject: "Reset password akun NEXBILL kamu",
    html: wrapTemplate(
      "Reset Password",
      `<p>Halo ${name},</p>
       <p>Ada permintaan untuk mereset password akun NEXBILL kamu. Klik tombol di bawah untuk membuat password baru — link ini berlaku 30 menit.</p>
       <p><a href="${resetUrl}" style="background:#0891b2;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block">Reset Password</a></p>
       <p style="font-size:12px;color:#888">Kalau kamu tidak meminta ini, abaikan saja email ini — password kamu tidak akan berubah.</p>`
    ),
  };
}

export function invoicePaidEmail(outletName: string, invoiceNumber: string, amount: number, manualUrl?: string) {
  return {
    subject: `Pembayaran diterima — ${invoiceNumber}`,
    html: wrapTemplate(
      "Pembayaran Diterima",
      `<p>Halo,</p>
       <p>Pembayaran untuk outlet <strong>${outletName}</strong> — invoice <strong>${invoiceNumber}</strong> sebesar <strong>Rp${amount.toLocaleString("id-ID")}</strong> telah diterima. Terima kasih!</p>
       ${manualUrl ? `<p>Buku manual smart plug bisa diunduh di sini: <a href="${manualUrl}">${manualUrl}</a></p>` : ""}`
    ),
  };
}
