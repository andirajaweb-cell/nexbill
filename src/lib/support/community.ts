/**
 * Grup Telegram komunitas merchant NEXBILL (pengumuman, tips, sesama pemilik rental). Bisa diganti
 * lewat env NEXT_PUBLIC_TELEGRAM_GROUP_URL tanpa ubah kode. Dipakai widget dashboard
 * (components/dashboard/TelegramCommunityFab.tsx) dan bot Telegram (/grup, menu bantuan).
 */
export const TELEGRAM_GROUP_URL = process.env.NEXT_PUBLIC_TELEGRAM_GROUP_URL?.trim() || "https://t.me/+mkCEL-KHiDExNjE1";
