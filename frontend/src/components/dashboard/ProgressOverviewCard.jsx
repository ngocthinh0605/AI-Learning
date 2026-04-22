import React from "react";

const SKILLS = ["reading", "listening", "writing", "speaking"];

export default function ProgressOverviewCard({ progress, loading }) {
  const counts = progress?.skill_counts || {};
  const averages = progress?.average_band_by_skill || {};
  const trend = (progress?.recent_trend || []).slice(0, 10).reverse();
  const maxBand = Math.max(7, ...trend.map((t) => Number(t.band) || 0));

  return (
    <div className="card mb-6">
      <h2 className="text-white font-semibold mb-4">Cross-skill Progress</h2>
      {loading ? (
        <p className="text-sm text-gray-500">Loading progress...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {SKILLS.map((skill) => (
              <div key={skill} className="rounded-lg border border-gray-800 p-3">
                <p className="text-xs text-gray-400 uppercase">{skill}</p>
                <p className="text-lg text-white font-semibold">{counts[skill] || 0} sessions</p>
                <p className="text-xs text-gray-500">Avg band: {averages[skill] ?? "-"}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Recent band trend</p>
            <div className="flex items-end gap-1 h-20">
              {trend.length === 0 ? (
                <p className="text-xs text-gray-500">No scored attempts yet.</p>
              ) : (
                trend.map((point, index) => {
                  const value = Number(point.band) || 0;
                  const height = `${Math.max(8, (value / maxBand) * 100)}%`;
                  return <div key={`${point.created_at}-${index}`} className="bg-accent-500/70 w-4 rounded-t" style={{ height }} title={`${point.session_type}: ${value || "-"}`} />;
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
