require "rails_helper"

RSpec.describe Ai::DailyLearningPlanService do
  it "passes prompts to LlmJsonCompletion" do
    allow(CrossSkillMappingService).to receive(:call).and_return(
      { "recommended_task_mix" => [{ "task_type" => "reading_training", "weight" => 0.7 }] }
    )
    allow(Ai::LlmJsonCompletion).to receive(:call).and_return({ status: :success, data: { "summary" => {}, "tasks" => [] } })
    result = described_class.call(
      learning_profile: { level: "B1" },
      latest_mistake_analysis: { key_weakness: "keyword_matching_bias" },
      learning_goal: { target_band: 7.0 },
      daily_time_minutes: 30
    )
    expect(result[:status]).to eq(:success)
    expect(CrossSkillMappingService).to have_received(:call)
    expect(Ai::LlmJsonCompletion).to have_received(:call).with(
      hash_including(user_prompt: a_string_including("Cross-skill mapping recommendations"))
    )
  end
end
