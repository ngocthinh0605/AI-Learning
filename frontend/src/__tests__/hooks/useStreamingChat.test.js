import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStreamingChat } from "../../hooks/useStreamingChat";

// Mock the cable API so tests don't open real WebSockets
vi.mock("../../api/cableApi", () => {
  let capturedHandlers = {};
  let mockSubscription = {
    unsubscribe: vi.fn(),
    sendMessage: vi.fn(),
  };

  return {
    subscribeToConversation: vi.fn((conversationId, handlers) => {
      capturedHandlers = handlers;
      // Simulate immediate connection
      setTimeout(() => handlers.onSubscribed?.(), 0);
      return {
        ...mockSubscription,
        // expose handlers for test use
        _triggerEvent: (type, ...args) => {
          if (type === "token") handlers.onToken?.(...args);
          if (type === "streamStart") handlers.onStreamStart?.(...args);
          if (type === "streamEnd") handlers.onStreamEnd?.(...args);
          if (type === "error") handlers.onError?.(...args);
          if (type === "userMessage") handlers.onUserMessage?.(...args);
        },
      };
    }),
    __capturedHandlers: () => capturedHandlers,
    __mockSubscription: () => mockSubscription,
  };
});

import * as cableApi from "../../api/cableApi";

describe("useStreamingChat", () => {
  let subscription;

  beforeEach(() => {
    subscription = null;
    cableApi.subscribeToConversation.mockImplementation((conversationId, handlers) => {
      const sub = {
        unsubscribe: vi.fn(),
        sendMessage: vi.fn(),
        _handlers: handlers,
      };
      subscription = sub;
      setTimeout(() => handlers.onSubscribed?.(), 0);
      return sub;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty messages and disconnected state", () => {
    const { result } = renderHook(() => useStreamingChat("conv-1"));
    expect(result.current.messages).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isStreaming).toBe(false);
  });

  it("initializes with provided initialMessages", () => {
    const initial = [{ id: "1", role: "user", content: "Hi" }];
    const { result } = renderHook(() => useStreamingChat("conv-1", initial));
    expect(result.current.messages).toEqual(initial);
  });

  it("accumulates tokens during streaming", () => {
    const { result } = renderHook(() => useStreamingChat("conv-1"));

    act(() => {
      subscription._handlers.onStreamStart({});
      subscription._handlers.onToken("Hello");
      subscription._handlers.onToken(" world");
    });

    expect(result.current.isStreaming).toBe(true);
    expect(result.current.streamingText).toBe("Hello world");
  });

  it("appends assistant message and clears streaming state on stream_end", () => {
    const { result } = renderHook(() => useStreamingChat("conv-1"));

    act(() => {
      subscription._handlers.onStreamStart({});
      subscription._handlers.onToken("Hi");
    });

    const assistantMsg = { id: "msg-2", role: "assistant", content: "Hi there!", created_at: new Date().toISOString() };

    act(() => {
      subscription._handlers.onStreamEnd({ assistant_message: assistantMsg, correction: null });
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamingText).toBe("");
    expect(result.current.messages).toContainEqual(assistantMsg);
  });

  it("surfaces errors as a chat message", () => {
    const { result } = renderHook(() => useStreamingChat("conv-1"));

    act(() => {
      subscription._handlers.onStreamStart({});
      subscription._handlers.onError("Ollama offline");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.messages.at(-1).content).toContain("Ollama offline");
  });

  it("adds an optimistic user message when sendMessage is called", () => {
    const { result } = renderHook(() => useStreamingChat("conv-1"));

    act(() => {
      result.current.sendMessage("Hello Aria");
    });

    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("Hello Aria");
  });

  it("exposes vocabSuggestion from stream_end payload", () => {
    const { result } = renderHook(() => useStreamingChat("conv-1"));
    const vocab = { word: "eloquent", definition: "Fluent and persuasive", context_sentence: "She was eloquent." };

    act(() => {
      subscription._handlers.onStreamStart({});
      subscription._handlers.onStreamEnd({
        assistant_message: { id: "m", role: "assistant", content: "ok", created_at: "" },
        vocabulary_suggestion: vocab,
      });
    });

    expect(result.current.vocabSuggestion).toEqual(vocab);
  });

  it("clears vocab on clearVocab()", () => {
    const { result } = renderHook(() => useStreamingChat("conv-1"));

    act(() => {
      subscription._handlers.onStreamStart({});
      subscription._handlers.onStreamEnd({
        assistant_message: { id: "m", role: "assistant", content: "ok", created_at: "" },
        vocabulary_suggestion: { word: "fluent" },
      });
    });

    act(() => { result.current.clearVocab(); });
    expect(result.current.vocabSuggestion).toBeNull();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useStreamingChat("conv-1"));
    unmount();
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });
});
