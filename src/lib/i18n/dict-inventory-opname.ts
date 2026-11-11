import { registerDict } from "./registry";

/** Stock Opname (2026-11-11): koreksi persediaan tanpa Laba Rugi, stok minus, pemindahan jurnal lama. */
registerDict({
  "inventory.opname.countPlaceholder": { id: "fisik", en: "count", ms: "fizikal", th: "นับจริง", fil: "bilang", vi: "thực tế" },
  "inventory.opname.ruleNote": {
    id: "Isi jumlah barang yang benar-benar ada. Saat diterapkan, stok sistem disamakan dengan hasil hitung (dikurangi penjualan sesudah dihitung). Selisihnya dicatat sebagai Koreksi Persediaan — tidak masuk Laba Rugi. Barang rusak/hilang yang ingin dibebankan, catat lewat Penyesuaian Barang di tab Produk.",
    en: "Enter how many items are actually there. When applied, system stock is set to the count (minus any sales after counting). The difference is booked as an Inventory Correction — not in Profit & Loss. To expense damaged/lost items, use Stock Adjustment on the Products tab.",
    ms: "Isi jumlah barang yang benar-benar ada. Apabila diterapkan, stok sistem disamakan dengan hasil kiraan (tolak jualan selepas dikira). Perbezaannya direkod sebagai Pembetulan Inventori — tidak masuk Untung Rugi. Barang rosak/hilang yang mahu dibebankan, rekod melalui Pelarasan Barang di tab Produk.",
    th: "กรอกจำนวนสินค้าที่มีอยู่จริง เมื่อใช้การปรับปรุง สต็อกในระบบจะเท่ากับผลการนับ (หักยอดขายหลังการนับ) ส่วนต่างบันทึกเป็นการแก้ไขสินค้าคงคลัง — ไม่เข้างบกำไรขาดทุน สินค้าเสีย/สูญหายที่ต้องการบันทึกเป็นค่าใช้จ่าย ให้ใช้การปรับสต็อกในแท็บสินค้า",
    fil: "Ilagay kung ilan talaga ang mayroon. Pag inilapat, ang stock ng sistema ay gagawing katumbas ng bilang (bawas ang benta pagkatapos magbilang). Ang diperensya ay itatala bilang Inventory Correction — hindi papasok sa Profit & Loss. Para gawing gastos ang sira/nawalang item, gamitin ang Stock Adjustment sa tab na Produkto.",
    vi: "Nhập số lượng thực tế đang có. Khi áp dụng, tồn kho hệ thống được đặt bằng số đếm (trừ phần bán sau khi đếm). Chênh lệch được ghi là Điều chỉnh tồn kho — không vào Lãi lỗ. Hàng hỏng/mất muốn ghi chi phí, dùng Điều chỉnh hàng ở tab Sản phẩm.",
  },
  "inventory.opname.negativeNote": {
    id: "{n} produk punya stok sistem minus — artinya ada penjualan yang belanjanya tidak dicatat lewat Belanja Supplier. Hitung fisik produk itu dan isi angkanya agar stok kembali benar; ke depan catat belanja di tab Belanja Supplier.",
    en: "{n} products have negative system stock — some sales had no purchase recorded in Supplier Purchases. Count those products and enter the numbers to fix stock; from now on record purchases in the Supplier Purchases tab.",
    ms: "{n} produk mempunyai stok sistem negatif — ada jualan yang belianya tidak direkod melalui Belian Pembekal. Kira produk itu dan isi angkanya supaya stok kembali betul; selepas ini rekod belian di tab Belian Pembekal.",
    th: "มีสินค้า {n} รายการที่สต็อกในระบบติดลบ — แปลว่ามียอดขายที่ไม่ได้บันทึกการซื้อในการซื้อจากซัพพลายเออร์ ให้นับสินค้าเหล่านั้นแล้วกรอกตัวเลขเพื่อแก้สต็อก และต่อไปบันทึกการซื้อในแท็บการซื้อจากซัพพลายเออร์",
    fil: "{n} produkto ang may negatibong stock sa sistema — may benta na hindi naitala ang pagbili sa Supplier Purchases. Bilangin ang mga produktong iyon at ilagay ang numero para maayos ang stock; mula ngayon itala ang pagbili sa tab na Supplier Purchases.",
    vi: "{n} sản phẩm có tồn kho hệ thống âm — có hàng đã bán nhưng việc nhập hàng không được ghi ở Mua hàng NCC. Hãy đếm các sản phẩm đó và nhập số để sửa tồn kho; từ nay ghi việc nhập hàng ở tab Mua hàng NCC.",
  },
  "inventory.opname.reclassHint": {
    id: "Selisih opname sebelum 11 Nov 2026 tercatat sebagai Kerugian Stock Opname di Laba Rugi. Pindahkan ke Koreksi Persediaan supaya Laba Rugi tidak minus karena opname.",
    en: "Stock count differences before 11 Nov 2026 were booked as Stock Count Loss in Profit & Loss. Move them to Inventory Correction so stock counts no longer push profit negative.",
    ms: "Perbezaan kiraan stok sebelum 11 Nov 2026 direkod sebagai Kerugian Kiraan Stok dalam Untung Rugi. Pindahkan ke Pembetulan Inventori supaya Untung Rugi tidak negatif kerana kiraan stok.",
    th: "ส่วนต่างการตรวจนับก่อน 11 พ.ย. 2026 ถูกบันทึกเป็นผลขาดทุนจากการตรวจนับในงบกำไรขาดทุน ย้ายไปที่การแก้ไขสินค้าคงคลังเพื่อไม่ให้กำไรติดลบเพราะการตรวจนับ",
    fil: "Ang diperensya ng stock count bago 11 Nob 2026 ay naitala bilang Loss sa Stock Count sa Profit & Loss. Ilipat sa Inventory Correction para hindi na maging negatibo ang kita dahil sa stock count.",
    vi: "Chênh lệch kiểm kê trước 11/11/2026 đã ghi là Lỗ kiểm kê trong Lãi lỗ. Chuyển sang Điều chỉnh tồn kho để kiểm kê không còn làm lợi nhuận âm.",
  },
  "inventory.opname.reclassButton": { id: "Pindahkan ke Koreksi Persediaan", en: "Move to Inventory Correction", ms: "Pindahkan ke Pembetulan Inventori", th: "ย้ายไปการแก้ไขสินค้าคงคลัง", fil: "Ilipat sa Inventory Correction", vi: "Chuyển sang Điều chỉnh tồn kho" },
  "inventory.opname.reclassBusy": { id: "Memindahkan...", en: "Moving...", ms: "Memindahkan...", th: "กำลังย้าย...", fil: "Inililipat...", vi: "Đang chuyển..." },
  "inventory.opname.reclassConfirm": {
    id: "Pindahkan selisih stock opname lama dari Laba Rugi (Kerugian Stock Opname) ke Koreksi Persediaan? Stok tidak berubah — hanya jurnalnya. Jurnal lama dibatalkan dan dicatat ulang pada tanggal yang sama.",
    en: "Move old stock count differences out of Profit & Loss (Stock Count Loss) into Inventory Correction? Stock doesn't change — only the journals. The old journals are voided and re-posted on the same date.",
    ms: "Pindahkan perbezaan kiraan stok lama daripada Untung Rugi (Kerugian Kiraan Stok) ke Pembetulan Inventori? Stok tidak berubah — hanya jurnalnya. Jurnal lama dibatalkan dan direkod semula pada tarikh yang sama.",
    th: "ย้ายส่วนต่างการตรวจนับเดิมออกจากงบกำไรขาดทุน (ผลขาดทุนจากการตรวจนับ) ไปยังการแก้ไขสินค้าคงคลังหรือไม่? สต็อกไม่เปลี่ยน — เปลี่ยนเฉพาะรายการบัญชี รายการเดิมจะถูกยกเลิกและบันทึกใหม่ในวันที่เดิม",
    fil: "Ilipat ang lumang diperensya ng stock count mula sa Profit & Loss (Loss sa Stock Count) papunta sa Inventory Correction? Hindi magbabago ang stock — journal lang. Ivo-void ang lumang journal at itatala ulit sa parehong petsa.",
    vi: "Chuyển chênh lệch kiểm kê cũ khỏi Lãi lỗ (Lỗ kiểm kê) sang Điều chỉnh tồn kho? Tồn kho không đổi — chỉ bút toán. Bút toán cũ bị hủy và ghi lại vào cùng ngày.",
  },
  "inventory.opname.reclassDone": {
    id: "{n} jurnal opname dipindahkan ke Koreksi Persediaan (Rp{amount}). Laba Rugi tidak lagi memuat selisih stock opname.",
    en: "{n} stock count journals moved to Inventory Correction (Rp{amount}). Profit & Loss no longer includes stock count differences.",
    ms: "{n} jurnal kiraan stok dipindahkan ke Pembetulan Inventori (Rp{amount}). Untung Rugi tidak lagi memuatkan perbezaan kiraan stok.",
    th: "ย้ายรายการบัญชีการตรวจนับ {n} รายการไปยังการแก้ไขสินค้าคงคลังแล้ว (Rp{amount}) งบกำไรขาดทุนไม่มีส่วนต่างการตรวจนับอีกต่อไป",
    fil: "{n} journal ng stock count ang nailipat sa Inventory Correction (Rp{amount}). Wala nang diperensya ng stock count sa Profit & Loss.",
    vi: "Đã chuyển {n} bút toán kiểm kê sang Điều chỉnh tồn kho (Rp{amount}). Lãi lỗ không còn chênh lệch kiểm kê.",
  },
  "inventory.opname.reclassNone": { id: "Tidak ada jurnal opname lama yang perlu dipindahkan.", en: "No old stock count journals need moving.", ms: "Tiada jurnal kiraan stok lama yang perlu dipindahkan.", th: "ไม่มีรายการบัญชีการตรวจนับเดิมที่ต้องย้าย", fil: "Walang lumang journal ng stock count na kailangang ilipat.", vi: "Không có bút toán kiểm kê cũ nào cần chuyển." },
});
