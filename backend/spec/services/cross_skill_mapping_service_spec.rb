require "rails_helper"

RSpec.describe CrossSkillMappingService do
  it "maps top weaknesses to multiple skill interventions" do
    result = described_class.call(
      latest_mistake_analysis: {
        "error_breakdown" => {
          "paraphrase_confusion" => 3,
          "keyword_matching_bias" => 2
        },
        "key_weakness" => "paraphrase_confusion"
      }
    )

    expect(result["cross_skill_map"]).to be_an(Array)
    expect(result["cross_skill_map"].first["interventions"].size).to be >= 2
    expect(result["recommended_task_mix"].map { |x| x["task_type"] }).to include("reading_training")
  end

  it "prioritizes key_weakness even when missing in error breakdown" do
    result = described_class.call(
      latest_mistake_analysis: {
        "error_breakdown" => { "inference_failure" => 1 },
        "key_weakness" => "keyword_matching_bias"
      }
    )

    expect(result["prioritized_weaknesses"].first).to eq("keyword_matching_bias")
  end

  it "falls back to default interventions for unknown weakness data" do
    result = described_class.call(
      latest_mistake_analysis: {
        "error_breakdown" => { "unknown" => 4 },
        "key_weakness" => "unknown"
      }
    )

    expect(result["cross_skill_map"]).to eq([])
    expect(result["recommended_task_mix"]).to eq([])
  end
end
