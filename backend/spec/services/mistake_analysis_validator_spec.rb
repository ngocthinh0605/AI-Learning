require "rails_helper"

RSpec.describe MistakeAnalysisValidator do
  let(:valid_result) do
    {
      "summary" => "User is over-relying on lexical overlap and misses paraphrases.",
      "error_breakdown" => {
        "keyword_matching_bias" => 3,
        "paraphrase_confusion" => 2
      },
      "skills" => {
        "matching_heading" => 0.4,
        "true_false" => 0.7
      },
      "key_weakness" => "keyword_matching_bias"
    }
  end

  it "accepts valid structured analysis" do
    result = described_class.call(result: valid_result)
    expect(result[:valid]).to eq(true)
  end

  it "rejects unknown error taxonomy keys" do
    bad = valid_result.merge("error_breakdown" => { "unknown_error" => 1 })
    result = described_class.call(result: bad)
    expect(result[:valid]).to eq(false)
  end

  it "rejects skill values outside 0..1 range" do
    bad = valid_result.merge("skills" => { "matching_heading" => 1.2 })
    result = described_class.call(result: bad)
    expect(result[:valid]).to eq(false)
  end
end
