import { useState, useCallback } from "react";
import { fetchTrainingExercises } from "../api/readingApi";

/**
 * Manages the state for a Training Mode session:
 * - Fetches AI-generated micro-exercises
 * - Tracks current exercise index and user answers
 * - Advances through exercises and shows results
 */
export function useTrainingSession() {
  const [exercises,     setExercises]     = useState([]);
  const [weaknessType,  setWeaknessType]  = useState(null);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [userAnswers,   setUserAnswers]   = useState({});
  const [submitted,     setSubmitted]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);

  const load = useCallback(async ({ count = 3 } = {}) => {
    setLoading(true);
    setError(null);
    setExercises([]);
    setUserAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);

    try {
      const data = await fetchTrainingExercises({ count });
      setExercises(data.exercises || []);
      setWeaknessType(data.weakness_type);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load exercises.");
    } finally {
      setLoading(false);
    }
  }, []);

  const answerCurrent = useCallback((answer) => {
    setUserAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
  }, [currentIndex]);

  const next = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setSubmitted(true);
    }
  }, [currentIndex, exercises.length]);

  const reset = useCallback(() => {
    setExercises([]);
    setUserAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
    setError(null);
  }, []);

  const currentExercise = exercises[currentIndex] || null;
  const currentAnswer   = userAnswers[currentIndex] ?? null;

  const score = submitted
    ? exercises.filter((ex, i) =>
        (userAnswers[i] || "").trim().toLowerCase() ===
        (ex.answer || "").trim().toLowerCase()
      ).length
    : null;

  return {
    exercises, weaknessType, currentIndex, currentExercise,
    currentAnswer, userAnswers, submitted, loading, error, score,
    load, answerCurrent, next, reset,
  };
}
