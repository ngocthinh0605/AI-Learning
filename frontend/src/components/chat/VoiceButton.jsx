import React, { useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceRecorder } from "../../hooks/useVoiceRecorder";

/**
 * Voice record button with animated recording indicator.
 * Calls onAudioReady(blob) when the user stops recording.
 */
export default function VoiceButton({ onAudioReady, disabled }) {
  const { isRecording, audioBlob, error, startRecording, stopRecording, reset } = useVoiceRecorder();

  // When a new blob is ready, pass it up and reset the hook
  useEffect(() => {
    if (audioBlob) {
      onAudioReady(audioBlob);
      reset();
    }
  }, [audioBlob, onAudioReady, reset]);

  function handleClick() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
          ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 focus:ring-red-400 animate-pulse-ring"
              : "bg-accent-500 hover:bg-accent-600 focus:ring-accent-400"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        title={isRecording ? "Stop recording" : "Start recording"}
      >
        {disabled ? (
          <Loader2 size={22} className="text-white animate-spin" />
        ) : isRecording ? (
          <MicOff size={22} className="text-white" />
        ) : (
          <Mic size={22} className="text-white" />
        )}
      </button>

      {error && <p className="text-red-400 text-xs text-center max-w-[120px]">{error}</p>}
      {isRecording && <p className="text-red-400 text-xs animate-pulse">Recording…</p>}
    </div>
  );
}
