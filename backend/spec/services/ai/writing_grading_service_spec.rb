require "rails_helper"

RSpec.describe Ai::WritingGradingService do
  it "returns success payload from LlmJsonCompletion" do
    allow(Ai::LlmJsonCompletion).to receive(:call).and_return({ status: :success, data: { "overall_band" => 6.0, "criteria" => {} } })
    result = described_class.call(task_type: "task_2", prompt: "Prompt", essay: "Essay")
    expect(result[:status]).to eq(:success)
  end

  it "passes through failure status" do
    allow(Ai::LlmJsonCompletion).to receive(:call).and_return({ status: :error, error: "Model down" })
    result = described_class.call(task_type: "task_1", prompt: "Prompt", essay: "Essay")
    expect(result[:status]).to eq(:error)
  end
end
