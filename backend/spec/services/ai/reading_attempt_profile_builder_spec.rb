# frozen_string_literal: true

require "rails_helper"

RSpec.describe Ai::ReadingAttemptProfileBuilder do
  it "builds raw_analysis with weak question types from wrong answers" do
    passage = create(:ielts_reading_passage)
    attempt = create(
      :ielts_reading_attempt,
      ielts_reading_passage: passage,
      answers: { "1" => "A", "2" => "FALSE" }
    )

    eval_result = { score: 1, total: 2, feedback: {}, weakness_analysis: [] }

    raw = described_class.build(attempt, eval_result)

    expect(raw["reading"]["weak_question_types"]).to include("mcq")
    expect(raw["ielts"]["estimated_band"]).to be_a(Numeric)
  end
end
