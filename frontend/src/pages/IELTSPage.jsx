import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Headphones, PenLine, Mic2, ChevronRight, Lock } from "lucide-react";

const SKILLS = [
  {
    id:       "reading",
    label:    "Reading",
    Icon:     BookOpen,
    desc:     "AI-generated passages, comprehension questions, vocabulary extraction, and band score feedback.",
    path:     "/ielts/reading",
    active:   true,
    color:    "text-accent-400",
    bg:       "bg-accent-500/10",
    border:   "border-accent-500/30",
  },
  {
    id:       "listening",
    label:    "Listening",
    Icon:     Headphones,
    desc:     "Transcript-based listening passages with comprehension scoring and attempt history.",
    path:     "/ielts/listening",
    active:   true,
    color:    "text-accent-400",
    bg:       "bg-accent-500/10",
    border:   "border-accent-500/30",
  },
  {
    id:       "writing",
    label:    "Writing",
    Icon:     PenLine,
    desc:     "Task 1 & Task 2 essay practice with AI rubric grading and attempt history.",
    path:     "/ielts/writing",
    active:   true,
    color:    "text-accent-400",
    bg:       "bg-accent-500/10",
    border:   "border-accent-500/30",
  },
  {
    id:       "speaking",
    label:    "Speaking",
    Icon:     Mic2,
    desc:     "Part 1, 2 & 3 speaking practice with AI evaluation and score breakdown.",
    path:     "/ielts/speaking",
    active:   true,
    color:    "text-accent-400",
    bg:       "bg-accent-500/10",
    border:   "border-accent-500/30",
  },
];

export default function IELTSPage() {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">IELTS Preparation</h1>
        <p className="text-gray-400">
          Practice all four IELTS skills with AI-powered exercises and personalised feedback.
        </p>
      </div>

      {/* Skill cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {SKILLS.map(({ id, label, Icon, desc, path, active, color, bg, border }) => (
          <button
            key={id}
            onClick={() => active && path && navigate(path)}
            disabled={!active}
            className={`group relative text-left rounded-2xl border p-6 transition-all
              ${active
                ? `${bg} ${border} hover:scale-[1.01] cursor-pointer`
                : "bg-gray-800/20 border-gray-800 cursor-not-allowed opacity-60"
              }`}
          >
            {/* Lock badge for inactive skills */}
            {!active && (
              <span className="absolute top-4 right-4 flex items-center gap-1 text-xs text-gray-600">
                <Lock size={12} /> Soon
              </span>
            )}

            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
              <Icon size={20} className={color} />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h2 className={`text-lg font-bold ${active ? "text-white" : "text-gray-500"}`}>
                {label}
              </h2>
              {active && (
                <ChevronRight
                  size={18}
                  className="text-gray-500 group-hover:text-accent-400 group-hover:translate-x-0.5 transition-all"
                />
              )}
            </div>

            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
