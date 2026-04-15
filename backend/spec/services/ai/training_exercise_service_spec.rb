require "rails_helper"

RSpec.describe Ai::TrainingExerciseService do
  let(:snippet) { "Urban farming has grown significantly in the last decade." }

  let(:ai_exercises_json) do
    [
      {
        "type"        => "paraphrase_match",
        "prompt"      => "Which sentence means the same as 'Urban farming has grown'?",
        "options"     => ["A. City agriculture expanded", "B. Rural farming declined"],
        "answer"      => "A. City agriculture expanded",
        "explanation" => "'Grown' is paraphrased as 'expanded'."
      }
    ].to_json
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
        service = described_class.new(weakness_type: "paraphrase", passage_snippet: snippet)
        result  = service.call
        expect(result[:status]).to eq(:success)
        expect(result[:exercises]).to be_an(Array)
        expect(result[:exercises].first["type"]).to eq("paraphrase_match")
      end
    end

    context "when Ollama returns a non-200 status" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Unavailable")
      end

      it "returns status :error" do
        service = described_class.new(weakness_type: "paraphrase", passage_snippet: snippet)
        result  = service.call
        expect(result[:status]).to eq(:error)
      end
    end

    context "with different weakness types" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: [].to_json } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "maps vocabulary weakness to keyword_spotting exercise type" do
        service = described_class.new(weakness_type: "vocabulary", passage_snippet: snippet)
        expect(service.instance_variable_get(:@exercise_type)).to eq("keyword_spotting")
      end

      it "maps trap weakness to main_idea exercise type" do
        service = described_class.new(weakness_type: "trap", passage_snippet: snippet)
        expect(service.instance_variable_get(:@exercise_type)).to eq("main_idea")
      end
    end
  end
end
