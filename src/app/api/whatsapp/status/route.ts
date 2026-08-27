import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const file = path.join(process.cwd(), "data", "whatsapp-status.json");
    if (!fs.existsSync(file)) {
      return NextResponse.json({ connected: false, qrDataUrl: null, note: "Bot belum dijalankan. Jalankan `npm run bot:whatsapp`." });
    }
    const status = JSON.parse(fs.readFileSync(file, "utf-8"));
    return NextResponse.json(status);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
