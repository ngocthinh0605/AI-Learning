require "rails_helper"

RSpec.describe Ai::SimilarQuestionService do
  let(:wrong_questions) do
    [
      { "id" => 1, "type" => "mcq", "question" => "What is the main argument?",
        "options" => ["A. X", "B. Y"], "answer" => "A" }
    ]
  end
  let(:passage_body) { "The study found significant improvements in urban biodiversity." }

  let(:similar_json) do
    [
      {
        "id"                  => 101,
        "type"                => "mcq",
        "question"            => "What did the study discover?",
        "options"             => ["A. Improvements", "B. Decline"],
        "answer"              => "A",
        "location_in_passage" => "significant improvements"
      }
    ].to_json
  end

  describe "#call" do
    context "when Ollama returns valid similar questions" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: similar_json } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns status :success with questions array" do
        service = described_class.new(wrong_questions, passage_body)
        result  = service.call
        expect(result[:status]).to eq(:success)
        expect(result[:questions]).to be_an(Array)
        expect(result[:questions].first["type"]).to eq("mcq")
      end
    end

    context "when wrong_questions is empty" do
      it "returns empty questions without calling Ollama" do
        service = described_class.new([], passage_body)
        result  = service.call
        expect(result[:status]).to eq(:success)
        expect(result[:questions]).to eq([])
      end
    end

    context "when Ollama fails" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Unavailable")
      end

      it "returns status :error" do
        service = described_class.new(wrong_questions, passage_body)
        result  = service.call
        expect(result[:status]).to eq(:error)
      end
    end
  end
end
