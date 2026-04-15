require "rails_helper"

RSpec.describe Ai::ReadingPassageService do
  let(:service) { described_class.new(difficulty: "band_6", topic: "climate", passage_type: "academic") }

  let(:valid_ai_json) do
    {
      "title"     => "Climate and Society",
      "body"      => "A" * 700,
      "questions" => [
        { "id" => 1, "type" => "mcq", "question" => "Q?",
          "options" => ["A. X", "B. Y", "C. Z", "D. W"], "answer" => "A" }
      ]
    }.to_json
  end

  describe "#call" do
    context "when Ollama returns valid JSON" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: valid_ai_json } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns status :success with parsed passage data" do
        result = service.call
        expect(result[:status]).to eq(:success)
        expect(result[:data][:title]).to eq("Climate and Society")
        expect(result[:data][:questions]).to be_an(Array)
      end
    end

    context "when Ollama wraps JSON in markdown fences" do
      before do
        wrapped = "```json\n#{valid_ai_json}\n```"
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: wrapped } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "strips the fences and returns :success" do
        result = service.call
        expect(result[:status]).to eq(:success)
        expect(result[:data][:title]).to eq("Climate and Society")
      end
    end

    context "when Ollama returns malformed JSON" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body:   { message: { content: "not json at all" } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )
      end

      it "returns status :error with a parse error message" do
        result = service.call
        expect(result[:status]).to eq(:error)
        expect(result[:error]).to include("Failed to parse")
      end
    end

    context "when Ollama returns a non-200 status" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Service Unavailable")
      end

      it "returns status :error" do
        result = service.call
        expect(result[:status]).to eq(:error)
        expect(result[:error]).to match(/Ollama Error: 503/)
      end
    end

    context "when the connection is refused" do
      before do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_raise(Errno::ECONNREFUSED)
      end

      it "returns status :error with a connection message" do
        result = service.call
        expect(result[:status]).to eq(:error)
        expect(result[:error]).to include("Connection to Ollama failed")
      end
    end
  end
end
