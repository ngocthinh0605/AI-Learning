# frozen_string_literal: true

require "rails_helper"

RSpec.describe LearningProfileUpsertService do
  let(:user) { create(:user) }

  it "creates a profile and merges vocabulary and grammar" do
    raw = {
      "vocabulary" => { "weak_lemmas" => [{ "lemma" => "biodiversity", "topic" => "environment" }] },
      "grammar" => [
        { "category" => "article", "subcategory" => "a_an", "user_fragment" => "a university" }
      ],
      "reading" => { "weak_question_types" => ["matching_headings"] },
      "ielts" => { "estimated_band" => 6.5 },
      "speaking" => { "fluency" => 6.0, "grammar" => 6.5, "pronunciation" => 6.0 }
    }

    profile = described_class.call(user: user, raw_analysis: raw, session_type: "mock_test", persist_session: true)

    expect(profile).to be_persisted
    expect(user.session_outcomes.count).to eq(1)
    expect(profile.vocabulary_weaknesses.find_by(lemma_or_concept: "biodiversity")).to be_present
    expect(profile.grammar_mistakes.find_by(category: "article")).to be_present
    expect(profile.learning_profile_reading_weaknesses.find_by(question_type: "matching_headings")).to be_present
    expect(profile.ielts_band_estimate).to be_within(0.01).of(6.5)
  end

  it "skips session_outcomes when persist_session is false" do
    raw = { "ielts" => { "estimated_band" => 5.0 } }
    described_class.call(user: user, raw_analysis: raw, session_type: "test", persist_session: false)
    expect(user.session_outcomes.count).to eq(0)
  end
end
