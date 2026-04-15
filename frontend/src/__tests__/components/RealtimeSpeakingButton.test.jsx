import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RealtimeSpeakingButton from "../../components/chat/RealtimeSpeakingButton";

const STATES = { IDLE: "IDLE", LISTENING: "LISTENING", PROCESSING: "PROCESSING", AI_SPEAKING: "AI_SPEAKING" };

describe("RealtimeSpeakingButton", () => {
  function renderBtn(state, extra = {}) {
    const onToggle = vi.fn();
    render(
      <RealtimeSpeakingButton
        state={state}
        STATES={STATES}
        audioLevel={0}
        micError={null}
        liveTranscript=""
        onToggle={onToggle}
        disabled={false}
        {...extra}
      />
    );
    return { onToggle };
  }

  it("renders the mic button in IDLE state", () => {
    renderBtn(STATES.IDLE);
    expect(screen.getByRole("button", { name: /start speaking/i })).toBeTruthy();
  });

  it("calls onToggle when clicked", () => {
    const { onToggle } = renderBtn(STATES.IDLE);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("shows Listening label in LISTENING state", () => {
    renderBtn(STATES.LISTENING);
    expect(screen.getByText(/listening/i)).toBeTruthy();
  });

  it("shows Processing label and disables button in PROCESSING state", () => {
    renderBtn(STATES.PROCESSING);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByText(/processing/i)).toBeTruthy();
  });

  it("shows AI speaking label in AI_SPEAKING state", () => {
    renderBtn(STATES.AI_SPEAKING);
    expect(screen.getByText(/aria is speaking/i)).toBeTruthy();
  });

  it("displays mic error message", () => {
    renderBtn(STATES.IDLE, { micError: "Microphone permission denied." });
    expect(screen.getByText("Microphone permission denied.")).toBeTruthy();
  });

  it("shows live transcript when provided", () => {
    renderBtn(STATES.LISTENING, { liveTranscript: "Hello world" });
    expect(screen.getByText(/"Hello world"/)).toBeTruthy();
  });

  it("is non-interactive when disabled", () => {
    renderBtn(STATES.IDLE, { disabled: true });
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
