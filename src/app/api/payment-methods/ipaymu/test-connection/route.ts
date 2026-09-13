import { NextResponse } from "next/server";

/**
 * MOVED 2026-09-13 to /api/platform-admin/ipaymu/test-connection — see that route's doc comment.
 * IPAYMU_VA/IPAYMU_API_KEY are ONE shared platform-wide credential, not scoped to an outlet, so an
 * outlet Owner hitting this URL was never their own data to see. Kept as a 410 stub (instead of
 * deleting the file outright) so this old path fails safely/obviously rather than 404ing silently
 * or — worse — still working, if anything cached still points at it. Delete this file entirely
 * once confirmed nothing references it anymore.
 */
export async function POST() {
  return NextResponse.json({ error: "Endpoint ini sudah dipindah ke Platform Admin — tidak lagi bisa diakses dari outlet." }, { status: 410 });
}
