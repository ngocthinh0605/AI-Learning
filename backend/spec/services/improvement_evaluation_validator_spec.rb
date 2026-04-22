require "rails_helper"

RSpec.describe ImprovementEvaluationValidator do
  let(:valid_result) do
    {
      "improvement" => {
        "before" => 0.4,
        "after" => 0.65,
        "delta" => 0.25
      },
      "insight" => "Inference and paraphrase handling improved after targeted drills.",
      "next_focus" => "distractor_trap"
    }
  end

  it "accepts valid improvement evaluation" do
    result = described_class.call(result: valid_result)
    expect(result[:valid]).to eq(true)
  end

  it "rejects invalid delta math" do
    invalid = Marshal.load(Marshal.dump(valid_result))
    invalid["improvement"]["delta"] = 0.1
    result = described_class.call(result: invalid)
    expect(result[:valid]).to eq(false)
  end

  it "rejects out-of-range scores" do
    invalid = Marshal.load(Marshal.dump(valid_result))
    invalid["improvement"]["after"] = 1.2
    result = described_class.call(result: invalid)
    expect(result[:valid]).to eq(false)
  end
end
