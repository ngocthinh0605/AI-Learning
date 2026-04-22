require "rails_helper"

RSpec.describe Ai::ImprovementEvaluationService do
  it "delegates to LlmJsonCompletion with previous and training inputs" do
    allow(Ai::LlmJsonCompletion).to receive(:call).and_return({ status: :success, data: {} })

    result = described_class.call(
      previous_attempt_data: { accuracy: 0.4, skill: "matching_heading" },
      training_session_results: { accuracy: 0.65, exercises_completed: 3 }
    )

    expect(result[:status]).to eq(:success)
    expect(Ai::LlmJsonCompletion).to have_received(:call)
  end
end
