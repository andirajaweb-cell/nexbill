"use client";

/**
 * Unggah foto Marketplace dari browser (foto barang, bukti bayar/serah-terima, bukti aduan).
 * Dipisah dari page.tsx karena dipakai beberapa komponen, dan file page di App Router tidak boleh
 * mengekspor fungsi lain.
 *
 * Foto kamera HP sering 3–8 MB, sementara Vercel menolak unggahan di atas ~4,5 MB. Foto dikecilkan
 * di browser dulu (sisi terpanjang maks. 1600 px, JPEG 85%) — cukup tajam untuk melihat goresan
 * pada stik atau membaca bukti transfer, dan biasanya jadi 200–600 KB. Kalau browser gagal membaca
 * gambarnya, berkas asli yang dikirim dan server yang memutuskan.
 */
async function kecilkanFoto(file: File): Promise<Blob> {
  const SISI_MAKS = 1600;
  try {
    const bitmap = await createImageBitmap(file);
    const skala = Math.min(1, SISI_MAKS / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * skala);
    canvas.height = Math.round(bitmap.height * skala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#ffffff"; // PNG transparan → latar putih, bukan hitam, setelah jadi JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export async function unggahFotoMarketplace(file: File): Promise<string> {
  const blob = await kecilkanFoto(file);
  const nama = blob === file ? file.name : file.name.replace(/\.[^.]+$/, "") + ".jpg";
  const fd = new FormData();
  fd.append("file", blob, nama);
  const res = await fetch("/api/marketplace/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({ error: "Foto terlalu besar atau koneksi terputus." }));
  if (!res.ok) throw new Error(data.error || "Gagal mengunggah foto.");
  return data.url as string;
}
