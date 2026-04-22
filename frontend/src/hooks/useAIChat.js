import { useState, useCallback, useRef } from "react";
import { streamSidebarChat, SIDEBAR_MODEL_OPTIONS } from "../api/sidebarChatApi";

function nextId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useAIChat() {
  const [model, setModel] = useState(SIDEBAR_MODEL_OPTIONS[0].value);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const streamAcc = useRef("");

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setError(null);
    setInput("");
    const userMsg = { id: nextId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    streamAcc.current = "";
    setStreamingText("");

    const historyForApi = [...messages, userMsg].slice(0, -1).map(({ role, content }) => ({
      role,
      content,
    }));

    try {
      await streamSidebarChat({
        message: text,
        model,
        messages: historyForApi,
        onToken: (tok) => {
          streamAcc.current += tok;
          setStreamingText(streamAcc.current);
        },
        onDone: () => {
          const full = streamAcc.current;
          streamAcc.current = "";
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", content: full },
          ]);
          setStreamingText("");
          setIsStreaming(false);
        },
        onError: (msg) => {
          setError(msg);
          streamAcc.current = "";
          setStreamingText("");
          setIsStreaming(false);
        },
      });
    } catch (e) {
      setError(e.message || "Request failed");
      streamAcc.current = "";
      setStreamingText("");
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, model]);

  return {
    model,
    setModel,
    messages,
    input,
    setInput,
    streamingText,
    isStreaming,
    error,
    send,
    modelOptions: SIDEBAR_MODEL_OPTIONS,
  };
}
