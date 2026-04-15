/**
 * Shared utility formatters used across components.
 */

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatConfidence(score) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  if (pct >= 85) return { label: `${pct}% clarity`, color: "text-green-400" };
  if (pct >= 60) return { label: `${pct}% clarity`, color: "text-yellow-400" };
  return { label: `${pct}% clarity — speak more clearly`, color: "text-red-400" };
}
