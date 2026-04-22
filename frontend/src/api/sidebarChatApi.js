const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/** Keys accepted by POST /api/v1/sidebar_chat (see Ai::SidebarChatModels). */
export const SIDEBAR_MODEL_OPTIONS = [
  { value: "gemma2_9b", label: "Gemma 2 9B" },
  { value: "gemma4_26b", label: "Gemma 4: 26B" },
];

function parseNdjsonLine(line, { onToken, onDone, onError }) {
  if (!line.trim()) return;
  const obj = JSON.parse(line);
  if (obj.error) onError?.(obj.error);
  else if (obj.done) onDone?.();
  else if (obj.token) onToken(obj.token);
}

/**
 * Streams NDJSON lines: { token }, then { done } or { error }.
 * @param {object} opts
 * @param {string} opts.message
 * @param {string} opts.model - gemma2_9b | gemma4_26b
 * @param {{ role: string, content: string }[]} opts.messages
 * @param {(token: string) => void} opts.onToken
 * @param {() => void} [opts.onDone]
 * @param {(err: string) => void} [opts.onError]
 */
export async function streamSidebarChat({
  message,
  model,
  messages = [],
  onToken,
  onDone,
  onError,
}) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE_URL}/api/v1/sidebar_chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, model, messages }),
  });

  if (!res.ok) {
    let errText = res.statusText;
    try {
      const data = await res.json();
      if (data.error) errText = Array.isArray(data.error) ? data.error.join(", ") : data.error;
    } catch {
      /* ignore */
    }
    throw new Error(errText);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Streaming not supported in this browser.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const handlers = { onToken, onDone, onError };

  const flushCompleteLines = () => {
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";
    for (const line of parts) {
      parseNdjsonLine(line, handlers);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    flushCompleteLines();
    if (done) break;
  }

  if (buffer.trim()) {
    parseNdjsonLine(buffer, handlers);
  }
}
