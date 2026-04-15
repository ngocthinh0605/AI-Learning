import { useState, useEffect, useCallback } from "react";
import { fetchAttemptReview } from "../api/readingApi";

/**
 * Fetches Review Mode data for a specific attempt:
 * - Original attempt details
 * - Wrong answers with AI error_type + explanation
 * - AI-generated similar questions for further practice
 */
export function useReviewSession(attemptId) {
  const [reviewData,  setReviewData]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // Tracks user answers to the similar (practice) questions
  const [practiceAnswers,   setPracticeAnswers]   = useState({});
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);

  const load = useCallback(async () => {
    if (!attemptId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAttemptReview(attemptId);
      setReviewData(data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load review.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => { load(); }, [load]);

  const setPracticeAnswer = useCallback((questionId, value) => {
    setPracticeAnswers((prev) => ({ ...prev, [String(questionId)]: value }));
  }, []);

  const submitPractice = useCallback(() => setPracticeSubmitted(true), []);

  const resetPractice = useCallback(() => {
    setPracticeAnswers({});
    setPracticeSubmitted(false);
  }, []);

  return {
    reviewData, loading, error,
    practiceAnswers, practiceSubmitted,
    setPracticeAnswer, submitPractice, resetPractice,
    reload: load,
  };
}
