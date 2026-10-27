import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { topicFromHashHex, tvTopicBrowser } from "./push-topic";

describe("kanal colekan NEXBILL TV", () => {
  it("browser (Web Crypto) & server (node crypto, lib/tv/push.ts) menghasilkan kanal yang sama", async () => {
    const token = "tok_abc123";
    const server = topicFromHashHex(createHash("sha256").update(`nexbill-tv-push:${token}`).digest("hex"));
    expect(await tvTopicBrowser(token)).toBe(server);
    expect(server).toMatch(/^nbtv-[0-9a-f]{32}$/);
  });
  it("token berbeda → kanal berbeda; token tidak terlihat di nama kanal", async () => {
    const a = await tvTopicBrowser("token-a");
    const b = await tvTopicBrowser("token-b");
    expect(a).not.toBe(b);
    expect(a).not.toContain("token-a");
  });
});
