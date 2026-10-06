import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { describeError, errorStatus } from "@/lib/api/error";
import { confirmAccountDeletion } from "@/lib/account-deletion/service";
import { CONFIRM_PHRASE, isValidCodeFormat } from "@/lib/account-deletion/rules";
import { isDemoEmail, DemoAccountError } from "@/lib/auth/demo-account";

/** Konfirmasi hapus akun dengan kode email + ketik "HAPUS". Akun langsung nonaktif & sesi diakhiri. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (isDemoEmail(session.email)) return NextResponse.json({ error: new DemoAccountError("Hapus akun").message }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    if (String(body.phrase ?? "").trim().toUpperCase() !== CONFIRM_PHRASE) {
      return NextResponse.json({ error: `Ketik ${CONFIRM_PHRASE} untuk mengonfirmasi.` }, { status: 400 });
    }
    if (!isValidCodeFormat(body.code)) return NextResponse.json({ error: "Kode harus 6 digit angka." }, { status: 400 });
    const result = await confirmAccountDeletion(session, body.code);
    const res = NextResponse.json(result);
    res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
