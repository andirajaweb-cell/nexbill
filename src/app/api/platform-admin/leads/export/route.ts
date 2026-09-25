import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { LEAD_STATUS_LABEL } from "@/lib/leads/constants";
import { listLeads, parseLeadFilters } from "@/lib/leads/service";
import { outletDateYmd } from "@/lib/time/outlet-time";

/** Excel export of the CRM list, honoring the same filters as the page (status/kota/cari/jatuh tempo). */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const leads = await listLeads(parseLeadFilters(req.nextUrl.searchParams));

    const rows = leads.map((l) => ({
      "Nama Usaha": l.name,
      "Kategori": l.category ?? "",
      "Kontak": l.contactName ?? "",
      "Telepon": l.phone ?? "",
      "WhatsApp": l.waNumber ?? "",
      "Kota": l.city ?? "",
      "Alamat": l.address ?? "",
      "Rating": l.rating ?? "",
      "Jumlah Ulasan": l.reviewCount ?? "",
      "Website": l.website ?? "",
      "Google Maps": l.mapsUrl ?? "",
      "Status": LEAD_STATUS_LABEL[l.status],
      "Follow Up Berikutnya": l.nextFollowUpDate ?? "",
      "Terakhir Dihubungi": l.lastContactedAt ? l.lastContactedAt.slice(0, 10) : "",
      "Catatan": l.notes ?? "",
      "Sumber": l.source === "google_maps" ? `Google Maps (${l.searchQuery ?? "-"})` : "Manual",
      "Dibuat": l.createdAt.slice(0, 10),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Leads");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="leads-nexbill-${outletDateYmd(new Date())}.xlsx"`,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
