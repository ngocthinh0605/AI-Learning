import { apiGet } from "../src/api/client";

describe("mobile api error handling", () => {
  it("throws on non-ok responses", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({ ok: false } as Response);
    await expect(apiGet("/profile", "token")).rejects.toThrow(/failed/i);
    global.fetch = originalFetch;
  });
});
