require "rails_helper"

RSpec.describe ConversationChannel, type: :channel do
  let(:user) { create(:user) }
  let(:conversation) { create(:conversation, user: user) }

  before do
    # Stub the connection's current_user (bypasses JWT in tests)
    stub_connection current_user: user
  end

  describe "#subscribed" do
    context "with a valid conversation_id belonging to the user" do
      it "subscribes and starts streaming" do
        subscribe conversation_id: conversation.id
        expect(subscription).to be_confirmed
      end

      it "streams from the correct channel name" do
        subscribe conversation_id: conversation.id
        expect(streams).to include("conversation_#{conversation.id}")
      end

      it "transmits a subscribed event" do
        subscribe conversation_id: conversation.id
        expect(transmissions.last).to include("type" => "subscribed")
      end
    end

    context "with a conversation_id belonging to another user" do
      it "rejects the subscription" do
        other_conversation = create(:conversation)
        subscribe conversation_id: other_conversation.id
        expect(subscription).to be_rejected
      end
    end

    context "with a non-existent conversation_id" do
      it "rejects the subscription" do
        subscribe conversation_id: SecureRandom.uuid
        expect(subscription).to be_rejected
      end
    end
  end

  describe "#receive" do
    before { subscribe conversation_id: conversation.id }

    context "with valid message text" do
      it "broadcasts user_message_received event" do
        # Stub GemmaStreamingService so we don't hit real Ollama
        streaming_service = instance_double(Ai::GemmaStreamingService)
        allow(streaming_service).to receive(:stream).and_yield("Hello!")
        allow(Ai::GemmaStreamingService).to receive(:new).and_return(streaming_service)
        allow(Ai::GemmaService).to receive(:parse_response).and_return(
          { reply: "Hello!", correction: nil, vocabulary: nil }
        )

        expect {
          perform :receive, message: "Hi there"
          sleep 0.1 # allow background thread to run
        }.to have_broadcasted_to("conversation_#{conversation.id}")
          .with(hash_including("type" => "user_message_received"))
      end

      it "saves the user message to the database" do
        allow_any_instance_of(Ai::GemmaStreamingService).to receive(:stream)
        expect {
          perform :receive, message: "Practice English please"
          sleep 0.1
        }.to change(Message, :count).by(1)
      end
    end

    context "with an empty message" do
      it "does not broadcast anything" do
        perform :receive, message: ""
        expect(transmissions.count).to eq(1) # only the initial subscribed event
      end
    end
  end

  describe "#receive_audio" do
    before { subscribe conversation_id: conversation.id }

    context "accumulating audio chunks" do
      it "does not broadcast until end_of_speech" do
        perform :receive_audio, audio_chunk: Base64.strict_encode64("fake audio data")
        # Only the subscribed transmission, no processing event yet
        expect(transmissions.count).to eq(1)
      end
    end

    context "when end_of_speech is received with no chunks" do
      it "does not attempt transcription" do
        expect(Ai::WhisperService).not_to receive(:new)
        perform :receive_audio, action: "end_of_speech"
        sleep 0.05
      end
    end

    context "when end_of_speech is received with chunks" do
      it "broadcasts processing_audio event" do
        allow_any_instance_of(Ai::WhisperService).to receive(:transcribe).and_return(
          { text: "Hello", confidence: 0.9, language: "en" }
        )
        allow_any_instance_of(Ai::GemmaStreamingService).to receive(:stream)
        allow(Ai::GemmaService).to receive(:parse_response).and_return(
          { reply: "Hi!", correction: nil, vocabulary: nil }
        )

        perform :receive_audio, audio_chunk: Base64.strict_encode64("fake")
        perform :receive_audio, action: "end_of_speech"

        sleep 0.2
        events = transmissions.map { |t| t["type"] }
        expect(events).to include("processing_audio")
      end
    end
  end

  describe "rate limiting" do
    before { subscribe conversation_id: conversation.id }

    it "broadcasts stream_error after exceeding rate limit" do
      stub_const("ConversationChannel::RATE_LIMIT_MAX", 2)
      allow_any_instance_of(Ai::GemmaStreamingService).to receive(:stream)
      allow(Ai::GemmaService).to receive(:parse_response).and_return({ reply: "ok", correction: nil, vocabulary: nil })

      3.times { perform :receive, message: "test" }

      error_events = transmissions.select { |t| t["type"] == "stream_error" }
      expect(error_events).not_to be_empty
    end
  end
end
