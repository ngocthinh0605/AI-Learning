import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRealtimeSpeaking } from "../../hooks/useRealtimeSpeaking";

// ── Browser API mocks ────────────────────────────────────────────────────────

const mockStop = vi.fn();
const mockTrack = { stop: mockStop };
const mockStream = { getTracks: () => [mockTrack] };
const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  state: "inactive",
  ondataavailable: null,
  onstop: null,
};

vi.stubGlobal("navigator", {
  mediaDevices: {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
  },
});

vi.stubGlobal("MediaRecorder", vi.fn(() => {
  mockMediaRecorder.state = "inactive";
  return mockMediaRecorder;
}));
MediaRecorder.isTypeSupported = vi.fn(() => false);

const mockAnalyser = {
  fftSize: 512,
  frequencyBinCount: 256,
  getByteFrequencyData: vi.fn((arr) => arr.fill(0)), // silence by default
};
const mockSource = { connect: vi.fn() };
const mockAudioContext = {
  createMediaStreamSource: vi.fn(() => mockSource),
  createAnalyser: vi.fn(() => mockAnalyser),
  close: vi.fn(),
};
vi.stubGlobal("AudioContext", vi.fn(() => mockAudioContext));
vi.stubGlobal("requestAnimationFrame", vi.fn());
vi.stubGlobal("cancelAnimationFrame", vi.fn());

vi.mock("../../hooks/useTTS", () => ({
  useTTS: () => ({ stop: vi.fn(), speakStreamToken: vi.fn(), flushSentenceBuffer: vi.fn(), resetSentenceBuffer: vi.fn(), isSpeaking: false }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useRealtimeSpeaking", () => {
  const mockSubscription = {
    perform: vi.fn(),
    sendAudioChunk: vi.fn(),
    endOfSpeech: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockMediaRecorder.state = "inactive";
  });

  it("starts in IDLE state", () => {
    const { result } = renderHook(() =>
      useRealtimeSpeaking({ subscription: mockSubscription, isStreaming: false })
    );
    expect(result.current.state).toBe("IDLE");
    expect(result.current.isListening).toBe(false);
  });

  it("transitions to LISTENING on startListening", async () => {
    const { result } = renderHook(() =>
      useRealtimeSpeaking({ subscription: mockSubscription, isStreaming: false })
    );

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.state).toBe("LISTENING");
    expect(result.current.isListening).toBe(true);
  });

  it("requests microphone permission on startListening", async () => {
    const { result } = renderHook(() =>
      useRealtimeSpeaking({ subscription: mockSubscription, isStreaming: false })
    );

    await act(async () => { await result.current.startListening(); });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: true })
    );
  });

  it("sets micError when getUserMedia is denied", async () => {
    navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(
      Object.assign(new Error("denied"), { name: "NotAllowedError" })
    );

    const { result } = renderHook(() =>
      useRealtimeSpeaking({ subscription: mockSubscription, isStreaming: false })
    );

    await act(async () => { await result.current.startListening(); });

    expect(result.current.micError).toContain("permission denied");
    expect(result.current.state).toBe("IDLE");
  });

  it("transitions to PROCESSING when onstop fires", async () => {
    const { result } = renderHook(() =>
      useRealtimeSpeaking({ subscription: mockSubscription, isStreaming: false })
    );

    await act(async () => { await result.current.startListening(); });

    // Simulate recorder stopping
    mockMediaRecorder.state = "recording";
    await act(async () => {
      mockMediaRecorder.onstop?.();
    });

    expect(result.current.state).toBe("PROCESSING");
  });

  it("mirrors isStreaming=true to AI_SPEAKING from PROCESSING", async () => {
    const { result, rerender } = renderHook(
      ({ isStreaming }) => useRealtimeSpeaking({ subscription: mockSubscription, isStreaming }),
      { initialProps: { isStreaming: false } }
    );

    // Force into PROCESSING state
    await act(async () => { await result.current.startListening(); });
    mockMediaRecorder.state = "recording";
    await act(async () => { mockMediaRecorder.onstop?.(); });

    // Now isStreaming becomes true
    rerender({ isStreaming: true });
    expect(result.current.state).toBe("AI_SPEAKING");
  });

  it("returns to IDLE when isStreaming ends from AI_SPEAKING", async () => {
    const { result, rerender } = renderHook(
      ({ isStreaming }) => useRealtimeSpeaking({ subscription: mockSubscription, isStreaming }),
      { initialProps: { isStreaming: false } }
    );

    await act(async () => { await result.current.startListening(); });
    mockMediaRecorder.state = "recording";
    await act(async () => { mockMediaRecorder.onstop?.(); });
    rerender({ isStreaming: true });
    rerender({ isStreaming: false });

    expect(result.current.state).toBe("IDLE");
  });
});
