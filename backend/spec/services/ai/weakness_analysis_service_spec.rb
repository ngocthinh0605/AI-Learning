require "rails_helper"

RSpec.describe Ai::WeaknessAnalysisService do
  let(:wrong_answers) do
    [
      { "id" => 1, "type" => "mcq",                "question" => "Q1?", "submitted" => "B", "correct" => "A" },
      { "id" => 2, "type" => "true_false_not_given", "question" => "S2.", "submitted" => "TRUE", "correct" => "FALSE" }
    ]
  end
  let(:passage_body) { "The study found significant improvements in urban biodiversity." }

  let(:ai_response_json) do
    [
      { "id" => 1, "error_type" => "paraphrase",
        "explanation" => "The passage paraphrases the answer.",
        "suggestion"  => "Practice synonym recognition." },
      { "id" => 2, "error_type" => "trap",
        "explanation" => "This is a T/F/NG trap.",
        "suggestion"  => "Read more carefully." }
    ].to_json
  end

  describe "#call" do
    context "when Ollama returns valid JSON" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: ai_response_json } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns an array of weakness hashes" do
        service = described_class.new(wrong_answers, passage_body)
        result  = service.call
        expect(result).to be_an(Array)
        expect(result.length).to eq(2)
        expect(result.first["error_type"]).to eq("paraphrase")
      end
    end

    context "when Ollama is unavailable (fallback)" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Unavailable")
      end

      it "returns rule-based fallback classification" do
        service = described_class.new(wrong_answers, passage_body)
        result  = service.call
        expect(result).to be_an(Array)
        expect(result.length).to eq(2)
        # MCQ defaults to "scanning" in fallback
        expect(result.first["error_type"]).to eq("scanning")
        # T/F/NG defaults to "trap"
        expect(result.last["error_type"]).to eq("trap")
      end
    end

    context "when wrong_answers is empty" do
      it "returns an empty array without calling Ollama" do
        service = described_class.new([], passage_body)
        expect(service.call).to eq([])
      end
    end
  end
end
