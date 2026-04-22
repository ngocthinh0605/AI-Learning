require "rails_helper"

RSpec.describe Ai::TrainingExerciseService do
  let(:snippet) { "Urban farming has grown significantly in the last decade." }

  let(:ai_exercises_json) do
    {
      "questions" => [
        {
          "question" => "Which option best paraphrases the sentence?",
          "options" => ["A", "B", "C"],
          "correct_answer" => "A",
          "explanation" => "A preserves the meaning without lexical overlap."
        }
      ]
    }.to_json
  end

  describe "#call" do
    context "when Ollama returns valid exercises" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: ai_exercises_json } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns status :success with exercises array" do
        service = described_class.new(
          task_type: "reading_training",
          weakness_focus: "matching_heading",
          cognitive_bias: "paraphrase_confusion",
          passage_snippet: snippet
        )
        result  = service.call
        expect(result[:status]).to eq(:success)
        expect(result[:exercises]).to be_an(Array)
        expect(result[:exercises].first["question"]).to be_present
        expect(result[:exercises].first["correct_answer"]).to eq("A")
      end
    end

    context "when Ollama returns a non-200 status" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Unavailable")
      end

      it "returns status :error" do
        service = described_class.new(
          task_type: "reading_training",
          weakness_focus: "matching_heading",
          cognitive_bias: "paraphrase_confusion",
          passage_snippet: snippet
        )
        result  = service.call
        expect(result[:status]).to eq(:error)
      end
    end

    context "with strict schema validation" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: { "questions" => [{ "question" => "Q", "options" => ["A", "B"] }] }.to_json } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "rejects malformed questions from the model" do
        service = described_class.new(
          task_type: "reading_training",
          weakness_focus: "matching_heading",
          cognitive_bias: "distractor_trap",
          passage_snippet: snippet
        )
        result = service.call
        expect(result[:status]).to eq(:error)
      end
    end
  end
end
