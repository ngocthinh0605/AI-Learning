require "rails_helper"

RSpec.describe Ai::ListeningEvaluationService do
  let(:questions) do
    [
      { "id" => 1, "answer" => "A" },
      { "id" => 2, "answer" => "TRUE" },
      { "id" => 3, "answer" => "library" }
    ]
  end

  it "returns expected score for matching answers" do
    result = described_class.new(questions, { "1" => "A", "2" => "TRUE", "3" => "library" }).call
    expect(result[:status]).to eq(:success)
    expect(result[:score]).to eq(3)
  end

  it "handles edge case mixed spacing/casing" do
    result = described_class.new(questions, { "1" => " a ", "2" => "true", "3" => " Library " }).call
    expect(result[:score]).to eq(3)
  end

  it "returns failure-style low score when answers are wrong" do
    result = described_class.new(questions, { "1" => "B", "2" => "FALSE", "3" => "park" }).call
    expect(result[:score]).to eq(0)
    expect(result[:feedback]["band_score"]).to be <= 5.0
  end
end
