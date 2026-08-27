/**
 * Instagram DM via Meta's Instagram Messaging API (Graph API).
 * Requires: an Instagram professional/business account linked to a Facebook Page,
 * a Meta App with the "Instagram Business Messaging" product added, and a
 * long-lived Page Access Token with the instagram_manage_messages permission.
 * Setup guide: https://developers.facebook.com/docs/messenger-platform/instagram
 *
 * ENV:
 *   IG_PAGE_ACCESS_TOKEN
 *   IG_APP_SECRET        (used to verify webhook signatures)
 *   IG_VERIFY_TOKEN       (arbitrary string you also enter in the Meta webhook setup form)
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export async function sendInstagramMessage(recipientId: string, text: string) {
  const token = process.env.IG_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.warn("IG_PAGE_ACCESS_TOKEN belum diset — pesan IG tidak benar-benar terkirim (mock).");
    return { mock: true };
  }

  const res = await fetch(`${GRAPH_BASE}/me/messages?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    }),
  });

  if (!res.ok) {
    throw new Error(`Instagram send message error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
