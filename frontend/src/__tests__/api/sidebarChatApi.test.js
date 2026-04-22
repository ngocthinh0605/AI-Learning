import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { streamSidebarChat, SIDEBAR_MODEL_OPTIONS } from "../../api/sidebarChatApi";

function ndjsonReadableStream(lines) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(enc.encode(`${line}\n`));
      }
      controller.close();
    },
  });
}

describe("sidebarChatApi", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    localStorage.setItem("auth_token", "test-token");
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("exposes two model options", () => {
    expect(SIDEBAR_MODEL_OPTIONS).toHaveLength(2);
    expect(SIDEBAR_MODEL_OPTIONS[0].value).toBe("gemma2_9b");
  });

  it("streams tokens then onDone", async () => {
    const received = [];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: ndjsonReadableStream([
        JSON.stringify({ token: "Hello" }),
        JSON.stringify({ token: "!" }),
        JSON.stringify({ done: true }),
      ]),
    });

    await streamSidebarChat({
      message: "Hi",
      model: "gemma2_9b",
      messages: [],
      onToken: (t) => received.push(t),
      onDone: () => received.push("__DONE__"),
    });

    expect(received).toEqual(["Hello", "!", "__DONE__"]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/sidebar_chat"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
      })
    );
  });

  it("calls onError when the stream contains an error object", async () => {
    const received = [];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: ndjsonReadableStream([JSON.stringify({ error: "AI unavailable" })]),
    });

    await streamSidebarChat({
      message: "Hi",
      model: "gemma2_9b",
      messages: [],
      onToken: () => {},
      onError: (e) => received.push(e),
    });

    expect(received).toEqual(["AI unavailable"]);
  });

  it("throws when the response is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
      json: async () => ({ error: "missing" }),
    });

    await expect(
      streamSidebarChat({
        message: "Hi",
        model: "gemma2_9b",
        messages: [],
        onToken: () => {},
      })
    ).rejects.toThrow("missing");
  });
});
