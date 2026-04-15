import { Mic, Loader2, PhoneOff, Radio } from "lucide-react";

/**
 * Continuous voice conversation UI.
 *
 * Visual spec:
 *   IDLE        → Full-width invite card (blue mic, dashed border)
 *   LISTENING   → Green pill bar, live waveform bars driven by audioLevel,
 *                 "End" button visible
 *   PROCESSING  → Yellow spinner + pulsing "Thinking…" label
 *   AI_SPEAKING → Blue animated wave bars, TTS activity pulse, mic button
 *                 to interrupt, "End" button
 *
 * Progress indicator:
 *   A thin colour-coded line runs across the top of the active bar — green
 *   in LISTENING, yellow (animated shimmer) in PROCESSING, blue in AI_SPEAKING.
 *   This gives a constant visual signal of whose turn it is without any text.
 */
export default function RealtimeSpeakingButton({
  state,
  STATES,
  audioLevel   = 0,
  isSpeaking   = false, // true while TTS is actually playing a sentence
  micError     = null,
  liveTranscript = "",
  onToggle,
  disabled = false,
}) {
  if (!STATES) return null;

  const isIdle       = state === STATES.IDLE;
  const isListening  = state === STATES.LISTENING;
  const isProcessing = state === STATES.PROCESSING;
  const isAISpeaking = state === STATES.AI_SPEAKING;

  // ─── Progress bar colour per state ───────────────────────────────────────
  const progressColor = isListening
    ? "bg-green-500"
    : isProcessing
    ? "bg-yellow-400"
    : isAISpeaking
    ? "bg-blue-500"
    : "bg-gray-700";

  const progressAnim = isProcessing
    ? "animate-[shimmer_1.5s_ease-in-out_infinite]"
    : isAISpeaking && isSpeaking
    ? "animate-pulse"
    : "";

  // ─── Live mic waveform bars ───────────────────────────────────────────────
  function WaveformBars({ level }) {
    const multipliers = [0.3, 0.6, 1.0, 0.6, 0.3];
    return (
      <div className="flex items-end gap-0.5 h-8">
        {multipliers.map((m, i) => {
          const h = Math.max(3, Math.round((level / 100) * 28 * m));
          return (
            <div
              key={i}
              className="w-1.5 rounded-full bg-green-400 transition-all duration-75"
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
    );
  }

  // ─── AI speaking animated bars ────────────────────────────────────────────
  function AIWaveBars() {
    return (
      <div className="flex items-end gap-0.5 h-8">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full ${isSpeaking ? "bg-blue-400" : "bg-blue-800"}`}
            style={{
              animation: isSpeaking
                ? `aiWave 0.65s ease-in-out ${i * 0.1}s infinite alternate`
                : "none",
              height: "8px",
            }}
          />
        ))}
        <style>{`
          @keyframes aiWave {
            from { height: 4px;  opacity: 0.5; }
            to   { height: 26px; opacity: 1; }
          }
          @keyframes shimmer {
            0%   { opacity: 0.6; }
            50%  { opacity: 1; }
            100% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  // ─── IDLE: big invite card ────────────────────────────────────────────────
  if (isIdle) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 w-full">
        {micError && (
          <p className="text-red-400 text-sm text-center px-4">{micError}</p>
        )}
        <button
          onClick={onToggle}
          disabled={disabled}
          aria-label="Start voice conversation"
          className="
            group w-full max-w-sm flex items-center gap-4 px-6 py-5
            rounded-2xl border-2 border-dashed border-gray-600
            hover:border-blue-500 hover:bg-blue-500/8
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all duration-200
          "
        >
          <div className="
            w-14 h-14 rounded-full bg-blue-600 flex-shrink-0
            flex items-center justify-center
            group-hover:bg-blue-500 group-hover:scale-110
            transition-all duration-200 shadow-lg shadow-blue-500/30
          ">
            <Mic className="w-7 h-7 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">Start Voice Conversation</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Speak naturally · AI responds · repeats automatically
            </p>
          </div>
        </button>
      </div>
    );
  }

  // ─── Active: compact status bar ──────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-2 w-full">

      {/* Live transcript preview */}
      {liveTranscript && (
        <div className="
          text-sm text-gray-300 italic px-4 py-1.5
          bg-gray-800/70 rounded-full max-w-xs truncate
          border border-gray-700/50
        ">
          "{liveTranscript}"
        </div>
      )}

      {/* ── Main status bar ── */}
      <div className="
        relative w-full max-w-sm rounded-2xl overflow-hidden
        bg-gray-800 border border-gray-700 shadow-lg
      ">
        {/* Colour-coded progress line at the top */}
        <div
          className={`h-0.5 w-full ${progressColor} ${progressAnim} transition-colors duration-300`}
        />

        <div className="flex items-center gap-3 px-4 py-3">

          {/* Left: waveform / spinner / AI wave */}
          <div className="flex-shrink-0 w-14 flex items-center justify-center">
            {isListening  && <WaveformBars level={audioLevel} />}
            {isProcessing && <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />}
            {isAISpeaking && <AIWaveBars />}
          </div>

          {/* Center: status text */}
          <div className="flex-1 min-w-0">
            {isListening && (
              <>
                <p className="text-green-400 font-medium text-sm leading-tight">Listening…</p>
                <p className="text-gray-500 text-xs">Silence auto-stops · tap end to quit</p>
              </>
            )}
            {isProcessing && (
              <>
                <p className="text-yellow-400 font-medium text-sm leading-tight">Thinking…</p>
                <p className="text-gray-500 text-xs">Transcribing · generating reply</p>
              </>
            )}
            {isAISpeaking && (
              <>
                <p className="text-blue-400 font-medium text-sm leading-tight flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  Aria is speaking
                </p>
                <p className="text-gray-500 text-xs">
                  {isSpeaking ? "Tap mic to interrupt" : "Finishing…"}
                </p>
              </>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Interrupt mic button — only during AI_SPEAKING */}
            {isAISpeaking && (
              <button
                onClick={onToggle}
                aria-label="Interrupt AI and speak"
                className="
                  w-9 h-9 rounded-full bg-green-600
                  flex items-center justify-center
                  hover:bg-green-500 active:scale-90
                  transition-all duration-150
                  shadow-md shadow-green-600/30
                "
              >
                <Mic className="w-4 h-4 text-white" />
              </button>
            )}

            {/* End session button — single tap ends when LISTENING/PROCESSING,
                requires double-tap when AI is speaking to avoid accidental exits */}
            <button
              onClick={isAISpeaking ? undefined : onToggle}
              onDoubleClick={isAISpeaking ? onToggle : undefined}
              aria-label={isAISpeaking ? "Double-tap to end session" : "End voice conversation"}
              title={isAISpeaking ? "Double-tap to end" : "End conversation"}
              className="
                w-9 h-9 rounded-full bg-red-700/80
                flex items-center justify-center
                hover:bg-red-600 active:scale-90
                transition-all duration-150
              "
            >
              <PhoneOff className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>

      {micError && (
        <p className="text-red-400 text-xs text-center">{micError}</p>
      )}
    </div>
  );
}
