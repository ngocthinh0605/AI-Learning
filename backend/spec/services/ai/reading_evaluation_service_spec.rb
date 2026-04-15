require "rails_helper"

RSpec.describe Ai::ReadingEvaluationService do
  let(:questions) do
    [
      { "id" => 1, "type" => "mcq",                "question" => "Q1?",        "answer" => "A" },
      { "id" => 2, "type" => "true_false_not_given", "statement" => "S2.",       "answer" => "TRUE" },
      { "id" => 3, "type" => "fill_blank",           "sentence"  => "Fill ___.", "answer" => "word" }
    ]
  end

  let(:answers_all_correct)  { { "1" => "A", "2" => "TRUE", "3" => "WORD" } }
  let(:answers_all_wrong)    { { "1" => "B", "2" => "FALSE", "3" => "bad" } }
  let(:answers_partial)      { { "1" => "A", "2" => "FALSE", "3" => "word" } }

  let(:ai_feedback_json) do
    {
      "band_score" => 6.0,
      "tips"       => "Work on True/False questions.",
      "questions"  => [
        { "id" => 1, "is_correct" => true,  "explanation" => "Correct!" },
        { "id" => 2, "is_correct" => false, "explanation" => "Wrong." },
        { "id" => 3, "is_correct" => true,  "explanation" => "Correct!" }
      ]
    }.to_json
  end

  describe "#call" do
    context "when Ollama returns valid feedback JSON" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: ai_feedback_json } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns status :success with feedback and score" do
        service = described_class.new(questions, answers_partial)
        result  = service.call

        expect(result[:status]).to eq(:success)
        expect(result[:score]).to eq(2)
        expect(result[:total]).to eq(3)
        expect(result[:feedback]["band_score"]).to eq(6.0)
      end
    end

    context "when Ollama is unavailable (fallback path)" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Unavailable")
      end

      it "falls back to local evaluation and still returns :success" do
        service = described_class.new(questions, answers_all_correct)
        result  = service.call

        expect(result[:status]).to eq(:success)
        # All answers correct — score should be 3
        expect(result[:score]).to eq(3)
        expect(result[:feedback]).to have_key("band_score")
      end
    end

    context "when all answers are wrong" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Unavailable")
      end

      it "returns score 0 via fallback" do
        service = described_class.new(questions, answers_all_wrong)
        result  = service.call

        expect(result[:score]).to eq(0)
      end
    end

    context "when answers hash has string keys" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Unavailable")
      end

      it "normalises keys and evaluates correctly" do
        service = described_class.new(questions, { "1" => "A", "2" => "TRUE", "3" => "WORD" })
        result  = service.call
        expect(result[:score]).to eq(3)
      end
    end
  end
end
