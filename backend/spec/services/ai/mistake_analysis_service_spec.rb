require "rails_helper"

RSpec.describe Ai::MistakeAnalysisService do
  it "delegates to LlmJsonCompletion with structured input" do
    allow(Ai::LlmJsonCompletion).to receive(:call).and_return({ status: :success, data: {} })
    result = described_class.call(
      questions: [{ id: 1, question: "Q", answer: "A" }],
      user_answers: { "1" => "B" },
      passage: "Passage text"
    )
    expect(result[:status]).to eq(:success)
    expect(Ai::LlmJsonCompletion).to have_received(:call)
  end
end
