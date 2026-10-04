// Buat sepasang kunci VAPID untuk notifikasi push NEXBILL (sekali saja).
//   node scripts/generate-vapid-keys.mjs
// Salin hasilnya ke Vercel → Settings → Environment Variables (Production) lalu redeploy.
// JANGAN commit VAPID_PRIVATE_KEY. Mengganti kunci membuat semua perangkat harus mengaktifkan ulang notifikasi.
import webpush from "web-push";
const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log("VAPID_PUBLIC_KEY=" + publicKey);
console.log("VAPID_PRIVATE_KEY=" + privateKey);
console.log("VAPID_SUBJECT=mailto:sales@nexbill.id");
