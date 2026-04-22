import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare, Flame, Star, Trash2, Brain } from "lucide-react";
import { useAuthStore } from "../stores/useAuthStore";
import { useConversationStore } from "../stores/useConversationStore";
import { fetchVocabularyWords } from "../api/vocabularyApi";
import { fetchLearningProgress } from "../api/learningProgressApi";
import ProgressOverviewCard from "../components/dashboard/ProgressOverviewCard";
import toast from "react-hot-toast";

const TOPICS = ["Travel", "Business", "Food", "Technology", "Sports", "Health", "Education", "Daily Life"];

export default function DashboardPage() {
  const { user, refreshUser } = useAuthStore();
  const { conversations, loading, loadConversations, startConversation, removeConversation } = useConversationStore();
  const navigate = useNavigate();

  const [showNewForm, setShowNewForm] = useState(false);
  const [newConvo, setNewConvo] = useState({ title: "", topic: "Travel", difficultyLevel: "intermediate" });
  const [dueWordCount, setDueWordCount] = useState(0);
  const [progress, setProgress] = useState(null);
  const [progressLoading, setProgressLoading] = useState(true);

  useEffect(() => {
    loadConversations();
    refreshUser();
    // Fetch due word count for the SRS nudge card
    fetchVocabularyWords({ dueForReview: true })
      .then((words) => setDueWordCount(words.length))
      .catch(() => {});
    fetchLearningProgress()
      .then((data) => setProgress(data))
      .catch(() => {})
      .finally(() => setProgressLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newConvo.title.trim()) return;
    try {
      const convo = await startConversation(newConvo);
      setShowNewForm(false);
      setNewConvo({ title: "", topic: "Travel", difficultyLevel: "intermediate" });
      navigate(`/conversations/${convo.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  }

  async function handleDelete(id) {
    try {
      await removeConversation(id);
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header stats */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back{user?.display_name ? `, ${user.display_name}` : ""}!
        </h1>
        <p className="text-gray-400">Let's keep your streak going.</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Flame className="text-orange-400" />} label="Day Streak" value={user?.streak_days ?? 0} />
        <StatCard icon={<Star className="text-yellow-400" />} label="XP Points" value={user?.xp_points ?? 0} />
        <StatCard icon={<MessageSquare className="text-accent-400" />} label="Conversations" value={conversations.length} />
        <StatCard icon={<Brain className="text-purple-400" />} label="Words Due" value={dueWordCount} />
      </div>

      <ProgressOverviewCard progress={progress} loading={progressLoading} />

      {/* SRS nudge banner */}
      {dueWordCount > 0 && (
        <div
          onClick={() => navigate("/vocabulary/review")}
          className="mb-8 flex items-center gap-3 bg-purple-500/10 hover:bg-purple-500/15
            border border-purple-500/25 rounded-xl px-5 py-3.5 cursor-pointer transition-colors"
        >
          <Brain size={20} className="text-purple-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-white font-medium text-sm">
              {dueWordCount} vocabulary word{dueWordCount !== 1 ? "s" : ""} ready for review
            </p>
            <p className="text-purple-300/60 text-xs">Keep your streak — start a quick SRS session →</p>
          </div>
        </div>
      )}

      {/* New conversation */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Conversations</h2>
        <button onClick={() => setShowNewForm(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> New Conversation
        </button>
      </div>

      {showNewForm && (
        <form onSubmit={handleCreate} className="card mb-5 space-y-3">
          <h3 className="font-semibold text-white">New Conversation</h3>
          <input
            autoFocus
            type="text"
            placeholder="Topic title (e.g. Ordering at a Restaurant)"
            value={newConvo.title}
            onChange={(e) => setNewConvo({ ...newConvo, title: e.target.value })}
            className="input-field"
          />
          <div className="flex gap-3">
            <select
              value={newConvo.topic}
              onChange={(e) => setNewConvo({ ...newConvo, topic: e.target.value })}
              className="input-field flex-1"
            >
              {TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select
              value={newConvo.difficultyLevel}
              onChange={(e) => setNewConvo({ ...newConvo, difficultyLevel: e.target.value })}
              className="input-field flex-1"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Start</button>
            <button type="button" onClick={() => setShowNewForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading conversations…</div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>No conversations yet. Start one above!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              className="card hover:border-gray-700 transition-all cursor-pointer flex items-center gap-4 group"
              onClick={() => navigate(`/conversations/${c.id}`)}
            >
              <div className="w-10 h-10 bg-accent-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare size={18} className="text-accent-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{c.title}</p>
                <p className="text-xs text-gray-500">
                  {c.topic} · {c.message_count} messages · {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                className="text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="card flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}
