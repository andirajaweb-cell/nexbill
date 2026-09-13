/**
 * DEPRECATED — superseded by ./ipaymu.ts (2026-09-12). This file's logic (an unverified scaffold
 * based only on iPaymu's marketing page) has been fully replaced there after cross-checking
 * against the real docs.ipaymu.com — most notably, the old verifyIpaymuWebhookSignature() here
 * signed with IPAYMU_API_KEY, which is wrong (the real secret is the merchant's VA number) and
 * would have rejected every genuine iPaymu callback. Nothing in this codebase imports from this
 * file anymore; kept only as a re-export shim in case something external still points at this
 * path, so it fails loudly by pointing at the correct implementation rather than silently.
 */
export {
  ipaymuCrossBorderGateway,
  ipaymuHostedGateway,
  verifyIpaymuWebhookSignature,
  normalizeIpaymuCallback,
  mapIpaymuCallbackStatus,
} from "./ipaymu";
