import { useState, useCallback } from "react";
import { fetchTrainingExercises, evaluateTrainingImprovement } from "../api/readingApi";

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
  const [improvement,   setImprovement]   = useState(null);
  const [improvementLoading, setImprovementLoading] = useState(false);
  const [improvementError, setImprovementError] = useState(null);
  const [previousAttemptData, setPreviousAttemptData] = useState(null);

  const load = useCallback(async ({ count = 3, previousAttemptData: previous } = {}) => {
    setLoading(true);
    setError(null);
    setExercises([]);
    setUserAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
    setImprovement(null);
    setImprovementError(null);
    setPreviousAttemptData(previous || null);

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
      setImprovementLoading(true);
      setImprovementError(null);

      const total = exercises.length || 1;
      const correct = exercises.filter((ex, i) =>
        (userAnswers[i] || "").trim().toLowerCase() ===
        (ex.correct_answer || "").trim().toLowerCase()
      ).length;

      const trainingSessionResults = {
        score: correct,
        total_exercises: exercises.length,
        accuracy: Number((correct / total).toFixed(4)),
      };

      evaluateTrainingImprovement({
        previousAttemptData: previousAttemptData || { accuracy: 0 },
        trainingSessionResults,
      })
        .then((data) => {
          setImprovement(data);
        })
        .catch((err) => {
          setImprovementError(err.response?.data?.error || "Failed to evaluate improvement.");
        })
        .finally(() => {
          setImprovementLoading(false);
        });
    }
  }, [currentIndex, exercises, previousAttemptData, userAnswers]);

  const reset = useCallback(() => {
    setExercises([]);
    setUserAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
    setError(null);
    setImprovement(null);
    setImprovementLoading(false);
    setImprovementError(null);
    setPreviousAttemptData(null);
  }, []);

  const currentExercise = exercises[currentIndex] || null;
  const currentAnswer   = userAnswers[currentIndex] ?? null;

  const score = submitted
    ? exercises.filter((ex, i) =>
        (userAnswers[i] || "").trim().toLowerCase() ===
        (ex.correct_answer || "").trim().toLowerCase()
      ).length
    : null;

  return {
    exercises, weaknessType, currentIndex, currentExercise,
    currentAnswer, userAnswers, submitted, loading, error, score,
    improvement, improvementLoading, improvementError,
    load, answerCurrent, next, reset,
  };
}
