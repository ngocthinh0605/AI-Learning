require "rails_helper"

RSpec.describe Ai::GemmaStreamingService do
  let(:service) { described_class.new("Hello", [], english_level: "B1") }

  describe "#stream" do
    context "when Ollama streams tokens successfully" do
      it "yields each token to the block" do
        # Simulate Ollama NDJSON stream: one JSON object per line
        ndjson = [
          { message: { content: "Hello" }, done: false }.to_json,
          { message: { content: " there" }, done: false }.to_json,
          { message: { content: "!" }, done: true }.to_json,
        ].join("\n") + "\n"

        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 200, body: ndjson)

        tokens = []
        service.stream { |token| tokens << token }
        expect(tokens).to eq(["Hello", " there", "!"])
      end

      it "concatenates into the full response when joined" do
        ndjson = [
          { message: { content: "Good " }, done: false }.to_json,
          { message: { content: "morning!" }, done: true }.to_json,
        ].join("\n") + "\n"

        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 200, body: ndjson)

        full = ""
        service.stream { |token| full += token }
        expect(full).to eq("Good morning!")
      end
    end

    context "when Ollama returns a non-200 status" do
      it "raises GemmaStreamingService::Error" do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 503, body: "Service Unavailable")

        expect { service.stream { |t| } }.to raise_error(
          Ai::GemmaStreamingService::Error, /Ollama returned 503/
        )
      end
    end

    context "when the connection is refused" do
      it "raises GemmaStreamingService::Error" do
        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_raise(Errno::ECONNREFUSED)

        expect { service.stream { |t| } }.to raise_error(
          Ai::GemmaStreamingService::Error, /connection failed/
        )
      end
    end

    context "with malformed JSON lines" do
      it "skips invalid lines and continues" do
        ndjson = "not-json\n" \
                 "#{({ message: { content: "OK" }, done: true }).to_json}\n"

        stub_request(:post, /localhost:11434\/api\/chat/)
          .to_return(status: 200, body: ndjson)

        tokens = []
        service.stream { |token| tokens << token }
        expect(tokens).to eq(["OK"])
      end
    end
  end
end
