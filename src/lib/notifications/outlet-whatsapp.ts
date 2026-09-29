/**
 * Saklar notifikasi WhatsApp untuk PELANGGAN OUTLET (konfirmasi/pengingat booking, peringatan
 * waktu sesi, pengingat Home Rental).
 *
 * DIMATIKAN (keputusan 2026-09-29): bot WhatsApp NEXBILL (scripts/whatsapp-bot.mts) sekarang
 * KHUSUS untuk CRM platform-admin (menghubungi prospek di /platform-admin/leads). Bot itu memakai
 * satu nomor milik NEXBILL, jadi tidak cocok untuk mengirim pesan atas nama outlet.
 *
 * Selama false: queueBookingNotification() dan queueHomeRentalNotification() langsung
 * mengembalikan null — tidak ada baris baru di booking_notifications, dan semua pemanggil sudah
 * menangani null (tidak ada yang bergantung pada notifikasi terkirim). Untuk menyalakan lagi
 * nanti, sediakan kanal pengirim per outlet dulu (mis. WhatsApp Cloud API per outlet), lalu ubah
 * nilai ini — sekaligus kembalikan klaimnya di katalog, landing, dan Pusat Bantuan.
 */
export const OUTLET_WHATSAPP_NOTIFICATIONS_ENABLED = false;
