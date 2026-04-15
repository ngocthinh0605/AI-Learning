import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";

// Mock the MediaRecorder API which is not available in jsdom
const mockStop = vi.fn();
const mockStart = vi.fn();
const mockMediaRecorder = {
  start: mockStart,
  stop: mockStop,
  ondataavailable: null,
  onstop: null,
  state: "inactive",
};

beforeEach(() => {
  vi.clearAllMocks();

  global.MediaRecorder = vi.fn(() => mockMediaRecorder);
  global.navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    }),
  };
});

describe("useVoiceRecorder", () => {
  it("starts in idle state", () => {
    const { result } = renderHook(() => useVoiceRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("sets isRecording to true after startRecording is called", async () => {
    const { result } = renderHook(() => useVoiceRecorder());
    await act(() => result.current.startRecording());
    expect(result.current.isRecording).toBe(true);
    expect(mockStart).toHaveBeenCalledWith(100);
  });

  it("sets error when getUserMedia permission is denied", async () => {
    global.navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
      Object.assign(new Error("Permission denied"), { name: "NotAllowedError" })
    );

    const { result } = renderHook(() => useVoiceRecorder());
    await act(() => result.current.startRecording());
    expect(result.current.error).toBe("Microphone permission denied.");
    expect(result.current.isRecording).toBe(false);
  });
});
