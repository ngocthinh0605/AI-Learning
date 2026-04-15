import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, Timer, TrendingUp, ChevronLeft, Zap } from "lucide-react";
import PassagePracticeTab from "../../components/ielts/reading/PassagePracticeTab";
import MockTestTab from "../../components/ielts/reading/MockTestTab";
import ProgressTab from "../../components/ielts/reading/ProgressTab";
import TrainingTab from "../../components/ielts/reading/TrainingTab";

const TABS = [
  { id: "practice", label: "Practice",  Icon: BookOpen   },
  { id: "mock",     label: "Mock Test", Icon: Timer      },
  { id: "progress", label: "Progress",  Icon: TrendingUp },
  { id: "training", label: "Training",  Icon: Zap        },
];

export default function ReadingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.some((tab) => tab.id === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "practice";
  const [activeTab, setActiveTab] = useState(initialTab);
  const navigate = useNavigate();

  const handleChangeTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "practice") {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: tabId }, { replace: true });
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/ielts")}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Back to IELTS"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">IELTS Reading</h1>
          <p className="text-sm text-gray-400">AI-powered passages and comprehension practice</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => handleChangeTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === id
                ? "bg-accent-500 text-white shadow-sm"
                : "text-gray-400 hover:text-white"
              }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "practice" && <PassagePracticeTab />}
        {activeTab === "mock"     && <MockTestTab />}
        {activeTab === "progress" && <ProgressTab />}
        {activeTab === "training" && <TrainingTab />}
      </div>
    </div>
  );
}
