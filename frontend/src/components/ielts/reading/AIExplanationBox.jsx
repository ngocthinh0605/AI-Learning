import React from "react";
import { AlertTriangle, BookOpen, Eye, Target, Zap, HelpCircle, Lightbulb } from "lucide-react";

const ERROR_CONFIG = {
  vocabulary: {
    label: "Vocabulary",
    Icon:  BookOpen,
    color: "text-blue-400",
    bg:    "bg-blue-500/10 border-blue-500/20",
  },
  paraphrase: {
    label: "Paraphrase",
    Icon:  Zap,
    color: "text-purple-400",
    bg:    "bg-purple-500/10 border-purple-500/20",
  },
  scanning: {
    label: "Scanning",
    Icon:  Eye,
    color: "text-yellow-400",
    bg:    "bg-yellow-500/10 border-yellow-500/20",
  },
  trap: {
    label: "Trap Answer",
    Icon:  Target,
    color: "text-red-400",
    bg:    "bg-red-500/10 border-red-500/20",
  },
  misread: {
    label: "Misread",
    Icon:  AlertTriangle,
    color: "text-orange-400",
    bg:    "bg-orange-500/10 border-orange-500/20",
  },
};

/**
 * Displays a styled explanation box for a wrong answer.
 * Shows error_type badge, explanation, and improvement suggestion.
 *
 * Props:
 *   errorType   {string} - one of vocabulary/paraphrase/scanning/trap/misread
 *   explanation {string} - why the answer was wrong
 *   suggestion  {string} - how to improve
 */
export default function AIExplanationBox({ errorType, explanation, suggestion }) {
  const config = ERROR_CONFIG[errorType] || {
    label: "Incorrect",
    Icon:  HelpCircle,
    color: "text-gray-400",
    bg:    "bg-gray-700/40 border-gray-600",
  };
  const { label, Icon, color, bg } = config;

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${bg}`}>
      {/* Error type badge */}
      <div className="flex items-center gap-2">
        <Icon size={15} className={color} />
        <span className={`text-xs font-semibold uppercase tracking-wider ${color}`}>
          {label} Issue
        </span>
      </div>

      {/* Explanation */}
      {explanation && (
        <p className="text-sm text-gray-300 leading-relaxed">{explanation}</p>
      )}

      {/* Suggestion */}
      {suggestion && (
        <div className="flex items-start gap-2 pt-1 border-t border-white/5">
          <Lightbulb size={13} className="text-yellow-400 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400">{suggestion}</p>
        </div>
      )}
    </div>
  );
}
