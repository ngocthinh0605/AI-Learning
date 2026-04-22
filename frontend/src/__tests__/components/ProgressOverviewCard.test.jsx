import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressOverviewCard from "../../components/dashboard/ProgressOverviewCard";

describe("ProgressOverviewCard", () => {
  it("renders skill counts and averages", () => {
    render(
      <ProgressOverviewCard
        loading={false}
        progress={{
          skill_counts: { reading: 2, listening: 1, writing: 1, speaking: 3 },
          average_band_by_skill: { reading: 6.0, speaking: 6.5 },
          recent_trend: [{ session_type: "reading", band: 6.0, created_at: "2026-01-01T00:00:00Z" }],
        }}
      />
    );
    expect(screen.getByText(/cross-skill progress/i)).toBeInTheDocument();
    expect(screen.getByText(/2 sessions/i)).toBeInTheDocument();
    expect(screen.getByText(/avg band: 6/i)).toBeInTheDocument();
  });

  it("handles empty trend edge state", () => {
    render(<ProgressOverviewCard loading={false} progress={{ skill_counts: {}, average_band_by_skill: {}, recent_trend: [] }} />);
    expect(screen.getByText(/no scored attempts yet/i)).toBeInTheDocument();
  });
});
