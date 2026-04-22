require "rails_helper"

RSpec.describe Ai::SpeakingFeedbackService do
  describe ".to_profile_raw" do
    let(:data) do
      {
        "errors" => [
          { "type" => "grammar", "subtype" => "verb_tense", "original" => "I goes" }
        ],
        "corrected_sentence" => "I go",
        "scores" => { "fluency" => 6.0, "grammar" => 5.5, "pronunciation" => 6.5 },
        "scores_rationale" => { "fluency" => "clear", "grammar" => "few mistakes", "pronunciation" => "good" }
      }
    end

    it "maps speaking feedback into profile upsert schema" do
      raw = described_class.to_profile_raw(data)
      expect(raw["session_type"]).to eq("speaking")
      expect(raw.dig("speaking", "fluency")).to eq(6.0)
      expect(raw.dig("grammar", 0, "category")).to eq("grammar")
    end
  end

  describe ".avg_band" do
    it "returns rounded average for speaking scores" do
      avg = described_class.send(:avg_band, { "fluency" => 6.0, "grammar" => 5.5, "pronunciation" => 6.5 })
      expect(avg).to eq(6.0)
    end

    it "returns nil for edge case missing scores" do
      avg = described_class.send(:avg_band, {})
      expect(avg).to be_nil
    end

    it "ignores zero values in failure-like invalid output" do
      avg = described_class.send(:avg_band, { "fluency" => 0, "grammar" => 0, "pronunciation" => 0 })
      expect(avg).to be_nil
    end
  end
end
