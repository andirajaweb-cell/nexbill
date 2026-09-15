import crypto from "crypto";
import { PaymentGateway, PaymentMethod, PaymentRequest, PaymentResult } from "../types";

/**
 * iPaymu adapter — https://docs.ipaymu.com/id/docs
 *
 * Confirmed against the real iPaymu API v2 docs (previously this file — under the name
 * ipaymu-crossborder.ts — was an unverified scaffold based only on iPaymu's marketing page; the
 * signature recipe turned out to already be correct, everything else below was cross-checked and
 * fixed against docs.ipaymu.com on 2026-09-12).
 *
 * Two request flows, both used here:
 * 1. DIRECT (`POST /api/v2/payment/direct`) — merchant picks the exact channel (QRIS, a specific
 *    bank's VA, DANA, ShopeePay, Alfamart/Indomaret) and gets back a PaymentNo/Url immediately.
 *    This is the natural fit for an in-person POS/rental checkout where the cashier already knows
 *    which channel the customer wants — see createIpaymuDirectGateway() and the exported
 *    ipaymu_* channel gateways below.
 * 2. REDIRECT (`POST /api/v2/payment`) — sends the customer to iPaymu's own hosted checkout page
 *    to pick a channel themselves. Used by ipaymuHostedGateway (any channel) and
 *    ipaymuCrossBorderGateway (paymentMethod locked to "cc" for international card acceptance —
 *    see https://ipaymu.com/id/cross-border-transaction/; iPaymu itself never holds foreign
 *    currency, the card network converts at charge time, so this always charges req.amount in IDR).
 *
 * ENV required (see .env — "iPaymu" section):
 *   IPAYMU_BASE_URL     https://my.ipaymu.com (production) or https://sandbox.ipaymu.com (sandbox)
 *   IPAYMU_VA           merchant Virtual Account number, from the iPaymu dashboard's Integrasi page
 *   IPAYMU_API_KEY      used both as a signing secret for outgoing requests AND (separately, see
 *                       verifyIpaymuWebhookSignature) the VA itself is the secret for INCOMING
 *                       webhook signature verification — these are deliberately different keys,
 *                       don't mix them up.
 *   IPAYMU_NOTIFY_URL   this app's webhook endpoint — /api/payments/ipaymu/webhook (POS orders;
 *                       subscription billing has its own separate /api/subscription/webhook/ipaymu)
 *   IPAYMU_RETURN_URL   where the hosted checkout sends the customer after a successful payment
 *   IPAYMU_CANCEL_URL   where the hosted checkout sends the customer if they cancel
 *   IPAYMU_PROXY_URL    optional — see ipaymuFetch() below. When set, every outgoing request to
 *                       iPaymu is forwarded through scripts/ipaymu-egress-proxy.ts running on a
 *                       separate always-on VPS with a static IP, instead of leaving directly from
 *                       this app's own (non-static, on Vercel) outbound IP. Leave unset while on
 *                       sandbox or while the VPS isn't set up yet — falls back to a direct fetch.
 *   IPAYMU_PROXY_SECRET required alongside IPAYMU_PROXY_URL — shared Bearer secret the proxy
 *                       script checks, same pattern as RELAY_HUB_DISPATCH_SECRET.
 *
 *   IPAYMU_SANDBOX_BASE_URL / IPAYMU_SANDBOX_VA / IPAYMU_SANDBOX_API_KEY — added 2026-09-14,
 *                       COMPLETELY SEPARATE from the IPAYMU_* production vars above, used ONLY by
 *                       createIpaymuSandboxTestCheckout() / Platform Admin > iPaymu's "Ujicoba
 *                       Transaksi Sandbox" panel. Lets a Superuser run a real checkout->pay->webhook
 *                       round trip against sandbox.ipaymu.com (a dummy Rp10.000 test transaction)
 *                       any time, without touching IPAYMU_VA/IPAYMU_API_KEY, without needing the
 *                       static-IP proxy (sandbox has no IP/domain whitelist requirement — see
 *                       below), and without creating any real order/subscription-invoice row.
 *                       Register these separately at sandbox.ipaymu.com — they are NOT the same
 *                       credentials as production and will not work if pointed at IPAYMU_BASE_URL.
 *
 * If IPAYMU_BASE_URL/IPAYMU_VA/IPAYMU_API_KEY are not all set, every gateway below runs in MOCK
 * MODE so the POS/rental checkout flow can be developed/demoed without a live iPaymu account.
 *
 * PRODUCTION REQUIREMENT iPaymu itself enforces (not something this code can work around): your
 * server's IP must be static and whitelisted, and every domain used in returnUrl/cancelUrl/
 * notifyUrl must be pre-registered and approved (up to 2 business days) — see
 * https://docs.ipaymu.com/id/docs/ip-domain-validation. Sandbox has no such requirement, which is
 * why it's the right place to test first. Sandbox and Production also have COMPLETELY SEPARATE
 * VA/API Key pairs (register separately at sandbox.ipaymu.com) — pointing IPAYMU_BASE_URL at
 * sandbox while IPAYMU_VA/IPAYMU_API_KEY hold your Production credentials (or vice versa) will
 * just fail authentication.
 */

function isConfigured() {
  return Boolean(process.env.IPAYMU_BASE_URL && process.env.IPAYMU_VA && process.env.IPAYMU_API_KEY);
}

/** Sandbox counterpart to isConfigured() — see the top-of-file doc comment on IPAYMU_SANDBOX_*. */
function isSandboxConfigured() {
  return Boolean(process.env.IPAYMU_SANDBOX_BASE_URL && process.env.IPAYMU_SANDBOX_VA && process.env.IPAYMU_SANDBOX_API_KEY);
}

/** Resolves which credential set a request should use — production (default, used by every
 * existing gateway/call site below) or sandbox (only createIpaymuSandboxTestCheckout passes
 * sandbox: true). Kept as one function so nothing else has to duplicate the env-var names. */
function resolveIpaymuCreds(sandbox: boolean): { baseUrl?: string; va?: string; apiKey?: string } {
  if (sandbox) {
    return {
      baseUrl: process.env.IPAYMU_SANDBOX_BASE_URL || "https://sandbox.ipaymu.com",
      va: process.env.IPAYMU_SANDBOX_VA,
      apiKey: process.env.IPAYMU_SANDBOX_API_KEY,
    };
  }
  return { baseUrl: process.env.IPAYMU_BASE_URL, va: process.env.IPAYMU_VA, apiKey: process.env.IPAYMU_API_KEY };
}

/**
 * Outgoing request signature.
 *
 * CORRECTED 2026-09-13, second pass: the generic docs.ipaymu.com/id/docs/signature page claims GET
 * requests sign the RAW stringified query-params JSON, NOT hashed — this file briefly implemented
 * exactly that (see git history) after checkIpaymuChannels() became its first GET call. Confirmed
 * LIVE against Production that this is wrong: every variant tried ("{}" for no params, then "" for
 * no params) got rejected with "401: unauthorized signature". The authoritative source turned out
 * to be a DIFFERENT, more specific PDF — https://storage.googleapis.com/ipaymu-docs/ipaymu-api/
 * iPaymu-signature-documentation-v2.pdf — linked directly from the "signature" header field on the
 * newer parts of iPaymu's own Postman collection (List Payment Channels, Direct Payment, Redirect
 * Payment, Check Transaction). It states plainly, with no method-based exception:
 *   StringToSign = HTTPMethod + ":" + VaNumber + ":" + Lowercase(SHA-256(RequestBody)) + ":" + ApiKey
 *   "Request body harus berupa JSON" / "Request body di enkripsi menggunakan SHA256"
 * i.e. RequestBody is ALWAYS SHA-256-hashed, for every method including GET — there is no unhashed
 * case. This matches what the code did before this file ever had a GET call at all, so the fix is
 * simply to stop branching on method here.
 */
function buildSignature(va: string, apiKey: string, bodyOrQueryJson: string, method: "POST" | "GET" = "POST"): string {
  const bodyHash = crypto.createHash("sha256").update(bodyOrQueryJson).digest("hex");
  const stringToSign = `${method}:${va}:${bodyHash}:${apiKey}`;
  return crypto.createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

function ipaymuTimestamp(): string {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

/**
 * Shared success check for every iPaymu response below — deliberately NOT just `data?.Success`.
 * Cross-checked against the current docs.ipaymu.com examples on 2026-09-13: Direct Payment and
 * Check Balance's example responses both include `"Success": true`, but the Redirect Payment
 * (`POST /api/v2/payment`) example response does NOT — it's only `{ Status: 200, Message:
 * "success", Data: {...} }`, no Success field at all. If that's accurate (not just an abbreviated
 * doc example) and this only checked `data?.Success`, every real Redirect Payment call — used by
 * BOTH ipaymuHostedGateway and ipaymuCrossBorderGateway — would throw "iPaymu error" on a request
 * that actually succeeded, because `undefined` is falsy. Accepting `Status === 200` as an
 * alternative success signal (in addition to `Success === true`) fixes that without weakening
 * failure detection: a real failure (e.g. the 401 unauthorized-credential response Check Balance
 * returns for bad credentials) reports a non-200 Status, so it's still correctly rejected either way.
 */
function isIpaymuSuccess(data: any): boolean {
  return data?.Success === true || Number(data?.Status) === 200;
}

async function parseIpaymuResponse(res: Response): Promise<any> {
  const data = await res.json().catch(() => null);
  if (!res.ok || !isIpaymuSuccess(data)) {
    throw new Error(`iPaymu error ${res.status}: ${data?.Message ?? (await res.text().catch(() => "unknown error"))}`);
  }
  return data;
}

/**
 * Transport layer shared by ipaymuRequest/ipaymuGetRequest — added 2026-09-13 alongside
 * scripts/ipaymu-egress-proxy.ts so a real static-IP requirement (docs.ipaymu.com's
 * ip-domain-validation page) doesn't have to change any of the signing/business logic in this
 * file. When IPAYMU_PROXY_URL is unset (sandbox, or before the VPS is provisioned) this is a plain
 * passthrough to fetch() — identical behavior to before this existed. When set, the exact same
 * method/url/headers/body this file already built get handed to the proxy verbatim; the proxy just
 * re-issues that request from its own (static, whitelisted) IP and hands the raw status+body back,
 * which is reassembled into a real Response here so parseIpaymuResponse above needs zero changes.
 */
async function ipaymuFetch(
  url: string,
  init: { method: "GET" | "POST"; headers: Record<string, string>; body?: string },
  opts: { skipProxy?: boolean } = {}
): Promise<Response> {
  // Sandbox test traffic always skips the proxy — sandbox.ipaymu.com has no static-IP requirement
  // (see top-of-file doc comment), and routing a Superuser's one-off test transaction through the
  // production VPS proxy would add a pointless extra hop and a shared failure point with real traffic.
  const proxyUrl = opts.skipProxy ? undefined : process.env.IPAYMU_PROXY_URL;
  if (!proxyUrl) return fetch(url, init);

  const proxySecret = process.env.IPAYMU_PROXY_SECRET;
  const proxyRes = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(proxySecret ? { Authorization: `Bearer ${proxySecret}` } : {}),
    },
    body: JSON.stringify({ method: init.method, url, headers: init.headers, body: init.body }),
  });

  if (!proxyRes.ok) {
    const errText = await proxyRes.text().catch(() => "unknown error");
    throw new Error(`iPaymu egress proxy error ${proxyRes.status}: ${errText}`);
  }
  const relayed = await proxyRes.json().catch(() => null);
  if (!relayed) throw new Error("iPaymu egress proxy returned an unreadable response.");
  return new Response(relayed.bodyText ?? "", { status: relayed.status ?? 502, headers: { "Content-Type": "application/json" } });
}

async function ipaymuRequest(path: string, body: Record<string, unknown>, sandbox = false): Promise<any> {
  const { baseUrl, va, apiKey } = resolveIpaymuCreds(sandbox);
  const jsonBody = JSON.stringify(body);
  const signature = buildSignature(va!, apiKey!, jsonBody);

  const res = await ipaymuFetch(
    `${baseUrl}${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", va: va!, signature, timestamp: ipaymuTimestamp() },
      body: jsonBody,
    },
    { skipProxy: sandbox }
  );

  return parseIpaymuResponse(res);
}

/** GET counterpart to ipaymuRequest — only caller so far is checkIpaymuChannels() below, which
 * passes no query params (queryParams stays "{}" after stringifying) since that endpoint takes
 * none. Per buildSignature's doc comment, this "{}" gets SHA-256-hashed exactly like a POST body
 * would — there is no unhashed case for GET, despite what the generic signature docs page implies. */
async function ipaymuGetRequest(path: string, queryParams: Record<string, unknown> = {}): Promise<any> {
  const va = process.env.IPAYMU_VA!;
  const apiKey = process.env.IPAYMU_API_KEY!;
  const queryJson = JSON.stringify(queryParams);
  const signature = buildSignature(va, apiKey, queryJson, "GET");

  const res = await ipaymuFetch(`${process.env.IPAYMU_BASE_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", va, signature, timestamp: ipaymuTimestamp() },
  });

  return parseIpaymuResponse(res);
}

function mockResult(refPrefix: string, note: string, extra: Partial<PaymentResult> = {}): PaymentResult {
  const providerRef = `MOCK-${refPrefix}-${Date.now()}`;
  return {
    providerRef,
    status: "pending",
    feeAmount: 0,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    rawResponse: { mock: true, note },
    ...extra,
  };
}

/** Status codes per docs.ipaymu.com/id/docs/transaction/check-transaction. */
function mapTransactionStatus(statusCode: unknown): PaymentResult["status"] {
  const code = String(statusCode);
  if (code === "1" || code === "6") return "success"; // 6 = success, settlement pending separately
  if (code === "2" || code === "3" || code === "4" || code === "5" || code === "-2") return "failed"; // cancelled/refund/error/failed/expired
  return "pending"; // 0 = pending, 7 = escrow
}

/**
 * Direct Payment (POST /api/v2/payment/direct) — one gateway per (paymentMethod, paymentChannel)
 * pair. See https://docs.ipaymu.com/id/docs/payment/direct-payment for the full channel table;
 * the exported gateways below cover the channels most relevant to an Indonesian retail/F&B/rental
 * POS. Add another exported const here (same factory call, different method/paymentChannel) if an
 * outlet needs one not listed — no other file needs to change except registering the new key in
 * lib/payments/index.ts's registry.
 */
function createIpaymuDirectGateway(config: { method: PaymentMethod; paymentMethod: string; paymentChannel: string; refPrefix: string }): PaymentGateway {
  return {
    method: config.method,

    async createPayment(req: PaymentRequest): Promise<PaymentResult> {
      if (!isConfigured()) {
        return mockResult(config.refPrefix, `IPAYMU_* env vars not set — mock ${config.paymentMethod}/${config.paymentChannel} payment for development.`, {
          vaNumber: config.paymentMethod === "va" || config.paymentMethod === "cstore" ? "8888" + req.orderId.replace(/[^0-9]/g, "").padStart(6, "0").slice(-6) : undefined,
          bankCode: config.paymentMethod === "va" ? config.paymentChannel : undefined,
          checkoutUrl: `https://sandbox.ipaymu.com/mock-checkout/${config.refPrefix}-${req.orderId}`,
        });
      }

      const referenceId = `NEXBILL-${req.orderId}-${Date.now()}`;
      // name/phone/email are Wajib (required) per docs even for a walk-in POS customer with no
      // profile on file — fall back to generic placeholders rather than failing the whole payment.
      const body: Record<string, unknown> = {
        name: req.description || "Pelanggan",
        phone: req.customerPhone || "080000000000",
        email: "customer@nexbill.id",
        amount: req.amount,
        notifyUrl: process.env.IPAYMU_NOTIFY_URL,
        referenceId,
        paymentMethod: config.paymentMethod,
        paymentChannel: config.paymentChannel,
        product: [req.description || `NEXBILL - ${req.orderId}`],
        qty: [1],
        price: [req.amount],
      };

      const data = await ipaymuRequest("/api/v2/payment/direct", body);
      const d = data?.Data ?? {};

      return {
        providerRef: String(d.TransactionId ?? referenceId),
        status: "pending",
        vaNumber: d.PaymentNo ? String(d.PaymentNo) : undefined,
        bankCode: config.paymentMethod === "va" ? config.paymentChannel : undefined,
        checkoutUrl: d.Url ?? undefined,
        feeAmount: d.Fee ?? 0,
        expiresAt: d.Expired ?? undefined,
        rawResponse: data,
      };
    },

    async checkStatus(providerRef: string): Promise<PaymentResult["status"]> {
      if (!isConfigured()) return "pending";
      try {
        const data = await ipaymuRequest("/api/v2/transaction", { transactionId: providerRef });
        return mapTransactionStatus(data?.Data?.Status);
      } catch {
        return "pending"; // network/lookup failure — don't flip status on a transient error, wait for the next poll or the webhook
      }
    },
  };
}

export const ipaymuQrisGateway = createIpaymuDirectGateway({ method: "ipaymu_qris", paymentMethod: "qris", paymentChannel: "mpm", refPrefix: "QRIS" });
export const ipaymuVaBcaGateway = createIpaymuDirectGateway({ method: "ipaymu_va_bca", paymentMethod: "va", paymentChannel: "bca", refPrefix: "VABCA" });
export const ipaymuVaBniGateway = createIpaymuDirectGateway({ method: "ipaymu_va_bni", paymentMethod: "va", paymentChannel: "bni", refPrefix: "VABNI" });
export const ipaymuVaMandiriGateway = createIpaymuDirectGateway({ method: "ipaymu_va_mandiri", paymentMethod: "va", paymentChannel: "mandiri", refPrefix: "VAMDR" });
export const ipaymuVaBriGateway = createIpaymuDirectGateway({ method: "ipaymu_va_bri", paymentMethod: "va", paymentChannel: "bri", refPrefix: "VABRI" });
export const ipaymuVaPermataGateway = createIpaymuDirectGateway({ method: "ipaymu_va_permata", paymentMethod: "va", paymentChannel: "permata", refPrefix: "VAPRM" });
export const ipaymuDanaGateway = createIpaymuDirectGateway({ method: "ipaymu_dana", paymentMethod: "ewallet", paymentChannel: "dana", refPrefix: "DANA" });
export const ipaymuShopeepayGateway = createIpaymuDirectGateway({ method: "ipaymu_shopeepay", paymentMethod: "ewallet", paymentChannel: "shopeepay", refPrefix: "SPAY" });
export const ipaymuAlfamartGateway = createIpaymuDirectGateway({ method: "ipaymu_alfamart", paymentMethod: "cstore", paymentChannel: "alfamart", refPrefix: "ALFA" });
export const ipaymuIndomaretGateway = createIpaymuDirectGateway({ method: "ipaymu_indomaret", paymentMethod: "cstore", paymentChannel: "indomaret", refPrefix: "INDO" });

/**
 * Redirect Payment (POST /api/v2/payment) — customer is sent to iPaymu's own hosted checkout page
 * (Data.Url in the response) to pick a channel and pay; result only reaches this app via the
 * webhook (see verifyIpaymuWebhookSignature below), there is no reliable TransactionId to poll
 * with immediately (the response only carries a SessionID, and /api/v2/transaction expects a real
 * numeric TransactionId) — checkStatus is intentionally NOT implemented for this flow.
 */
function createIpaymuRedirectGateway(config: { method: "ipaymu_crossborder" | "ipaymu_hosted"; refPrefix: string; lockToCard: boolean }): PaymentGateway {
  return {
    method: config.method,

    async createPayment(req: PaymentRequest): Promise<PaymentResult> {
      if (!isConfigured()) {
        return mockResult(
          config.refPrefix,
          config.lockToCard
            ? "IPAYMU_* env vars not set — mock cross-border (card) hosted checkout for development."
            : "IPAYMU_* env vars not set — mock hosted checkout (customer picks channel) for development.",
          { checkoutUrl: `https://sandbox.ipaymu.com/mock-checkout/${config.refPrefix}-${req.orderId}` }
        );
      }

      const referenceId = `NEXBILL-${config.lockToCard ? "XB" : "HOSTED"}-${req.orderId}-${Date.now()}`;
      const description = req.description || `NEXBILL - ${req.orderId}`;
      const body: Record<string, unknown> = {
        product: [description],
        qty: [1],
        price: [req.amount], // always IDR — see top-of-file note on cross-border
        description: [description], // required by the Redirect endpoint, previously missing here
        referenceId,
        buyerPhone: req.customerPhone,
        returnUrl: process.env.IPAYMU_RETURN_URL,
        notifyUrl: process.env.IPAYMU_NOTIFY_URL,
        cancelUrl: process.env.IPAYMU_CANCEL_URL,
      };
      // Cross-border card acceptance pre-selects the "cc" channel on iPaymu's hosted page; hosted
      // checkout (ipaymu_hosted) deliberately leaves paymentMethod unset so the customer sees
      // every domestic channel enabled for this merchant (VA/e-wallet/QRIS/retail).
      if (config.lockToCard) body.paymentMethod = "cc";

      const data = await ipaymuRequest("/api/v2/payment", body);
      const d = data?.Data ?? {};

      return {
        providerRef: d.SessionID ?? referenceId,
        status: "pending",
        checkoutUrl: d.Url ?? undefined,
        feeAmount: 0,
        rawResponse: data,
      };
    },
  };
}

export const ipaymuCrossBorderGateway: PaymentGateway = createIpaymuRedirectGateway({ method: "ipaymu_crossborder", refPrefix: "IPAYMU-XB", lockToCard: true });
export const ipaymuHostedGateway: PaymentGateway = createIpaymuRedirectGateway({ method: "ipaymu_hosted", refPrefix: "IPAYMU-HOSTED", lockToCard: false });

export interface IpaymuSandboxCheckoutResult {
  configured: boolean;
  checkoutUrl?: string;
  referenceId?: string;
  error?: string;
}

/**
 * "Ujicoba Transaksi Sandbox" — Platform Admin > iPaymu. Creates a REAL Redirect Payment request
 * against sandbox.ipaymu.com (never production, never the IPAYMU_VA/IPAYMU_API_KEY pair) so a
 * Superuser can walk through the full checkout -> pay -> webhook round trip risk-free. Isolation
 * from real data is deliberate at every layer:
 *  - Separate credentials (IPAYMU_SANDBOX_*, see top-of-file doc comment).
 *  - Separate notify/return/cancel URLs, pointing at this feature's own
 *    /api/platform-admin/ipaymu/sandbox-test/* routes — never the real POS or subscription webhooks.
 *  - referenceId is always prefixed "NEXBILL-SANDBOXTEST-" so even if a URL were ever misregistered,
 *    the sandbox webhook route only ever touches its own platformIpaymuSandboxTests rows.
 * Amount is fixed and small (see the route's TEST_AMOUNT) — this only ever needs to prove the
 * plumbing works, not exercise arbitrary amounts.
 */
export async function createIpaymuSandboxTestCheckout(referenceId: string, amount: number): Promise<IpaymuSandboxCheckoutResult> {
  if (!isSandboxConfigured()) return { configured: false };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const description = "NEXBILL Sandbox Test";
  const body: Record<string, unknown> = {
    product: [description],
    qty: [1],
    price: [amount],
    description: [description],
    referenceId,
    returnUrl: `${appUrl}/platform-admin/ipaymu?sandboxTest=${referenceId}`,
    notifyUrl: `${appUrl}/api/platform-admin/ipaymu/sandbox-test/webhook`,
    cancelUrl: `${appUrl}/platform-admin/ipaymu?sandboxTest=${referenceId}`,
  };

  try {
    const data = await ipaymuRequest("/api/v2/payment", body, true);
    const d = data?.Data ?? {};
    return { configured: true, checkoutUrl: d.Url ?? undefined, referenceId };
  } catch (err: any) {
    return { configured: true, error: err?.message ?? String(err) };
  }
}

export interface IpaymuConnectionCheck {
  configured: boolean;
  baseUrl?: string;
  va?: string;
  merchantBalance?: string;
  memberBalance?: string;
  error?: string;
}

/**
 * "Test Koneksi iPaymu" — the concrete, in-app answer to "apakah iPaymu sudah pasti berjalan,
 * bagaimana cara ceknya" (has iPaymu been confirmed to be running, how do I check it). Rather than
 * only a manual checklist (correct env vars, a real test transaction, watching webhook logs — all
 * still worth doing, see the Pembayaran page's own hint text), this calls iPaymu's own
 * `POST /api/v2/balance` ("Check Balance", confirmed against docs.ipaymu.com's Postman collection
 * on 2026-09-13) using the exact same signing helper (ipaymuRequest/buildSignature) every other
 * live call in this file already uses — so a successful response here is real, direct proof the
 * configured IPAYMU_VA/IPAYMU_API_KEY/IPAYMU_BASE_URL actually authenticate against iPaymu's
 * servers, not just that the env vars are non-empty.
 *
 * Distinguishes three outcomes the caller needs to tell apart:
 *  - `configured: false` — IPAYMU_* env vars aren't set at all, so every gateway is running in
 *    MOCK MODE (see isConfigured() above) — nothing has actually been tried against iPaymu yet.
 *  - `configured: true, error: undefined` — the credentials are valid and iPaymu responded; the
 *    returned balance is real, current data straight from iPaymu's own system.
 *  - `configured: true, error: "..."` — env vars are set but iPaymu rejected the request (wrong
 *    VA/API Key pair, sandbox credentials pointed at the production base URL or vice versa — see
 *    this file's own top-of-file doc comment on that exact mismatch — or a network/outage issue).
 */
export async function checkIpaymuConnection(): Promise<IpaymuConnectionCheck> {
  if (!isConfigured()) return { configured: false };

  const va = process.env.IPAYMU_VA!;
  try {
    const data = await ipaymuRequest("/api/v2/balance", { account: va });
    const d = data?.Data ?? {};
    return {
      configured: true,
      baseUrl: process.env.IPAYMU_BASE_URL,
      va: d.Va ?? va,
      merchantBalance: d.MerchantBalance !== undefined ? String(d.MerchantBalance) : undefined,
      memberBalance: d.MemberBalance !== undefined ? String(d.MemberBalance) : undefined,
    };
  } catch (err: any) {
    return { configured: true, baseUrl: process.env.IPAYMU_BASE_URL, va, error: err?.message ?? String(err) };
  }
}

export interface IpaymuChannelStatus {
  categoryCode: string;
  categoryName: string;
  code: string;
  name: string;
  /** "active"/"inactive" — whether the channel is enabled for this merchant at all. */
  featureStatus: string;
  /** "online"/"offline" (or similar) — whether iPaymu's own infra for this channel is currently up. */
  healthStatus: string;
}

export interface IpaymuChannelsResult {
  configured: boolean;
  channels?: IpaymuChannelStatus[];
  error?: string;
}

/**
 * "Status Kanal iPaymu" panel — GET /api/v2/payment-channels (confirmed against
 * docs.ipaymu.com/id/docs/payment/payment-channels on 2026-09-13). Lets an owner tell apart "this
 * channel is failing because iPaymu itself reports it offline right now" from "something's wrong
 * on our side" — the direct/redirect gateways above have no visibility into this on their own,
 * since a failed createPayment call just throws a generic HTTP/signature-shaped error either way.
 * Read-only and side-effect-free (a GET, unlike checkIpaymuConnection's balance check which is
 * also read-only but hits a different endpoint) — safe to call as often as the UI wants.
 */
export async function checkIpaymuChannels(): Promise<IpaymuChannelsResult> {
  if (!isConfigured()) return { configured: false };
  try {
    const data = await ipaymuGetRequest("/api/v2/payment-channels");
    const categories = Array.isArray(data?.Data) ? data.Data : [];
    const channels: IpaymuChannelStatus[] = [];
    for (const cat of categories) {
      const subChannels = Array.isArray(cat?.Channels) ? cat.Channels : [];
      for (const ch of subChannels) {
        channels.push({
          categoryCode: String(cat?.Code ?? ""),
          categoryName: String(cat?.Name ?? ""),
          code: String(ch?.Code ?? ""),
          name: String(ch?.Name ?? ""),
          featureStatus: String(ch?.FeatureStatus ?? ""),
          healthStatus: String(ch?.HealthStatus ?? ""),
        });
      }
    }
    return { configured: true, channels };
  } catch (err: any) {
    return { configured: true, error: err?.message ?? String(err) };
  }
}

// ---------------------------------------------------------------------------------------------
// Inbound webhook (Callback) verification — POST /api/payments/webhook/ipaymu
// ---------------------------------------------------------------------------------------------

/**
 * Fields the Callback normalization step (docs.ipaymu.com/id/docs/callback) requires converting
 * to a specific type before hashing, or the computed signature will never match iPaymu's.
 */
const CALLBACK_INT_FIELDS = ["trx_id", "status_code", "transaction_status_code", "paid_off"];

/** Normalizes a raw callback payload (from either x-www-form-urlencoded or JSON) into the exact
 * shape iPaymu hashed when computing X-Signature — see the 8-step "Alur Proses Callback" in the
 * docs. Exported so the webhook route can reuse the same normalized object for both signature
 * verification and reading the actual status fields afterward. */
export function normalizeIpaymuCallback(raw: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(raw)) {
    if (key === "signature") continue; // never part of the signed payload
    const val = raw[key];
    if (key === "is_escrow") {
      result[key] = val === "true" || val === "1" || val === 1 || val === true;
    } else if (CALLBACK_INT_FIELDS.includes(key)) {
      result[key] = typeof val === "number" ? val : parseInt(String(val), 10) || 0;
    } else if (key === "additional_info") {
      result[key] = val === "[]" || val === undefined || val === null ? [] : val;
    } else {
      result[key] = String(val);
    }
  }
  if (!("additional_info" in result)) result.additional_info = [];
  return result;
}

/**
 * Verifies an inbound webhook's X-Signature header. CRITICAL: the secret here is the merchant's
 * VA NUMBER, not the API key (confirmed explicitly in docs.ipaymu.com/id/docs/callback — this is
 * easy to get backwards since every OUTGOING request above signs with the API key instead). The
 * previous version of this function used IPAYMU_API_KEY here, which would have rejected every
 * real callback iPaymu ever sent.
 *
 * Steps (per docs): normalize types → drop `signature` if present → sort keys ascending A-Z
 * (case-sensitive) → JSON.stringify → escape "/" to "\/" (matches PHP's json_encode default,
 * which is what iPaymu's own backend uses) → HMAC-SHA256 with the VA as the key → compare hex.
 *
 * Takes an ALREADY-normalized payload (run it through normalizeIpaymuCallback first) — the caller
 * needs that same normalized object afterward anyway to read the actual status fields, so this
 * doesn't re-normalize internally (idempotent either way, but doing it twice was just wasted work).
 *
 * `options.sandbox` (added 2026-09-14, default false — every existing caller is unaffected) checks
 * against IPAYMU_SANDBOX_VA instead of IPAYMU_VA — used only by the Platform Admin sandbox-test
 * webhook route, which must never accept a signature that was actually computed with the
 * production VA (or vice versa).
 */
export function verifyIpaymuWebhookSignature(normalizedBody: Record<string, unknown>, signatureHeader: string | null, options: { sandbox?: boolean } = {}): boolean {
  const sandbox = options.sandbox ?? false;
  if (sandbox ? !isSandboxConfigured() : !isConfigured()) return true; // mock mode — accept all for local testing
  if (!signatureHeader) return false;
  const va = (sandbox ? process.env.IPAYMU_SANDBOX_VA : process.env.IPAYMU_VA)!;

  const sortedKeys = Object.keys(normalizedBody)
    .filter((k) => k !== "signature")
    .sort((a, b) => a.localeCompare(b));
  const sorted: Record<string, unknown> = {};
  for (const k of sortedKeys) sorted[k] = normalizedBody[k];

  let json = JSON.stringify(sorted);
  json = json.replace(/\//g, "\\/");

  const expected = crypto.createHmac("sha256", va).update(json).digest("hex");
  return expected === signatureHeader;
}

/** Maps a callback's status_code (already normalized to a number) to this app's payment status —
 * same codes as mapTransactionStatus, callback additionally uses transaction_status_code 1/6 the
 * same way (see the "Field Bersyarat" table in the callback docs). */
export function mapIpaymuCallbackStatus(statusCode: number): PaymentResult["status"] {
  return mapTransactionStatus(statusCode);
}
