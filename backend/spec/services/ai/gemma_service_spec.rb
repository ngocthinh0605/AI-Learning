require "rails_helper"

RSpec.describe Ai::GemmaService do
  # New interface: GemmaService.new(user_message, history, english_level:).call
  let(:service) { described_class.new("Hello", [], english_level: "B1") }

  describe "#call" do
    context "when Ollama responds successfully" do
      it "returns status :success with the raw content string" do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body: { message: { content: "Hello! How can I help?" } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        result = service.call
        expect(result[:status]).to eq(:success)
        expect(result[:raw]).to eq("Hello! How can I help?")
      end
    end

    context "when Ollama returns a non-200 status" do
      it "returns status :error with an error message" do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Service Unavailable")

        result = service.call
        expect(result[:status]).to eq(:error)
        expect(result[:error]).to match(/Ollama Error: 503/)
      end
    end

    context "when the connection is refused" do
      it "returns status :error with a connection message" do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_raise(Errno::ECONNREFUSED)

        result = service.call
        expect(result[:status]).to eq(:error)
        expect(result[:error]).to match(/Connection to Ollama failed/)
      end
    end

    context "when Ollama returns an empty content field" do
      it "returns status :error" do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body: { message: { content: nil } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        result = service.call
        expect(result[:status]).to eq(:error)
      end
    end

    context "when conversation history is provided" do
      it "includes history in the payload sent to Ollama" do
        history = [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello!" }]
        service_with_history = described_class.new("How are you?", history, english_level: "B2")

        stub = stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(
            status: 200,
            body: { message: { content: "I'm doing well!" } }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        service_with_history.call

        expect(stub).to have_been_requested
        # The body should contain history messages
        expect(WebMock::RequestRegistry.instance.requested_signatures.hash.values.first.body)
          .to include("How are you?")
      end
    end
  end

  describe ".parse_response" do
    context "with a response containing correction and vocabulary markers" do
      let(:raw) do
        "That sounds great! Let's practice ordering coffee.\n" \
        "[CORRECTION]: You should say \"I would like\" instead of \"I want\"\n" \
        "[VOCABULARY]: ubiquitous | present everywhere | Coffee shops are ubiquitous in modern cities."
      end

      it "extracts the clean reply" do
        result = described_class.parse_response(raw)
        expect(result[:reply]).to include("That sounds great!")
        expect(result[:reply]).not_to include("[CORRECTION]")
        expect(result[:reply]).not_to include("[VOCABULARY]")
      end

      it "extracts the correction note" do
        result = described_class.parse_response(raw)
        expect(result[:correction]).to include("I would like")
      end

      it "extracts the vocabulary suggestion" do
        result = described_class.parse_response(raw)
        expect(result[:vocabulary][:word]).to eq("ubiquitous")
        expect(result[:vocabulary][:definition]).to eq("present everywhere")
      end
    end

    context "with a plain response (no markers)" do
      it "returns the full text as reply with nil correction and vocabulary" do
        result = described_class.parse_response("Great job today!")
        expect(result[:reply]).to eq("Great job today!")
        expect(result[:correction]).to be_nil
        expect(result[:vocabulary]).to be_nil
      end
    end
  end
end
