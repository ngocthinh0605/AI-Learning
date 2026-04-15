import { useState, useEffect, useRef, useCallback } from "react";
import { generatePassage, submitAnswers } from "../api/readingApi";

/**
 * Manages the full lifecycle of an IELTS reading session:
 *   - Passage generation
 *   - Answer tracking
 *   - Optional countdown timer (mock test mode)
 *   - Submission and feedback display
 *
 * @param {Object}  options
 * @param {boolean} options.timedMode   - If true, starts a 60-minute countdown
 * @param {number}  options.timeLimitSeconds - Defaults to 3600 (60 min)
 */
export function useReadingSession({ timedMode = false, timeLimitSeconds = 3600 } = {}) {
  const [passage,     setPassage]     = useState(null);
  const [answers,     setAnswers]     = useState({});
  const [attempt,     setAttempt]     = useState(null);
  const [generating,  setGenerating]  = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);
  const [timeLeft,    setTimeLeft]    = useState(timeLimitSeconds);
  const [timerActive, setTimerActive] = useState(false);

  // Reason: track elapsed seconds independently of timeLeft so we can send
  // time_taken_seconds to the backend even in non-timed mode.
  const startTimeRef = useRef(null);
  const timerRef     = useRef(null);

  // ─── Timer ────────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    if (!timedMode) return;
    startTimeRef.current = Date.now();
    setTimerActive(true);
  }, [timedMode]);

  const stopTimer = useCallback(() => {
    setTimerActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!timerActive) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerActive, stopTimer]);

  // Auto-submit when timer reaches 0 in timed mode
  useEffect(() => {
    if (timedMode && timerActive === false && timeLeft === 0 && passage && !attempt) {
      handleSubmit();
    }
    // Reason: intentionally omitting handleSubmit from deps to avoid stale closure loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, timerActive]);

  // ─── Passage generation ───────────────────────────────────────────────────

  const generate = useCallback(async ({ difficulty, topic, passageType }) => {
    setGenerating(true);
    setError(null);
    setPassage(null);
    setAnswers({});
    setAttempt(null);
    setTimeLeft(timeLimitSeconds);

    try {
      const data = await generatePassage({ difficulty, topic, passageType });
      setPassage(data);
      startTimer();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate passage. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [timeLimitSeconds, startTimer]);

  // ─── Answer management ────────────────────────────────────────────────────

  const setAnswer = useCallback((questionId, value) => {
    setAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);

  const clearAnswers = useCallback(() => setAnswers({}), []);

  // ─── Submission ───────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!passage || submitting) return;

    stopTimer();
    setSubmitting(true);
    setError(null);

    const timeTaken = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : undefined;

    try {
      const data = await submitAnswers({
        passageId:        passage.id,
        answers,
        timeTakenSeconds: timeTaken,
      });
      setAttempt(data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit answers. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [passage, answers, submitting, stopTimer]);

  // ─── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    stopTimer();
    setPassage(null);
    setAnswers({});
    setAttempt(null);
    setError(null);
    setTimeLeft(timeLimitSeconds);
    startTimeRef.current = null;
  }, [stopTimer, timeLimitSeconds]);

  // ─── Derived state ────────────────────────────────────────────────────────

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = passage?.questions?.length ?? 0;
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  // Format mm:ss for display
  const formattedTime = (() => {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const s = (timeLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  })();

  return {
    passage,
    answers,
    attempt,
    generating,
    submitting,
    error,
    timeLeft,
    formattedTime,
    timerActive,
    answeredCount,
    totalQuestions,
    allAnswered,
    generate,
    setAnswer,
    clearAnswers,
    handleSubmit,
    reset,
  };
}
