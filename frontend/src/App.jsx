import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./stores/useAuthStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ConversationPage from "./pages/ConversationPage";
import VocabularyPage from "./pages/VocabularyPage";
import ReviewSessionPage from "./pages/ReviewSessionPage";
import RoomsPage from "./pages/RoomsPage";
import IELTSPage from "./pages/IELTSPage";
import ReadingPage from "./pages/ielts/ReadingPage";
import ListeningPage from "./pages/ielts/ListeningPage";
import WritingPage from "./pages/ielts/WritingPage";
import ReviewPage from "./pages/ielts/ReviewPage";
import SpeakingPage from "./pages/ielts/SpeakingPage";
import AIChatPage from "./pages/AIChatPage";
import Layout from "./components/common/Layout";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user } = useAuthStore();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="conversations/:id" element={<ConversationPage />} />
        <Route path="vocabulary" element={<VocabularyPage />} />
        <Route path="vocabulary/review" element={<ReviewSessionPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="ielts" element={<IELTSPage />} />
        <Route path="ielts/reading" element={<ReadingPage />} />
        <Route path="ielts/listening" element={<ListeningPage />} />
        <Route path="ielts/writing" element={<WritingPage />} />
        <Route path="ielts/speaking" element={<SpeakingPage />} />
        <Route path="ielts/reading/attempts/:id/review" element={<ReviewPage />} />
        <Route path="ai-chat" element={<AIChatPage />} />
      </Route>
    </Routes>
  );
}
