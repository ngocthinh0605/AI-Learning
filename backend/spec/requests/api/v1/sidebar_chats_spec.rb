require "rails_helper"

RSpec.describe "Api::V1::Sidebar chats", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "POST /api/v1/sidebar_chat" do
    it "returns 401 when unauthenticated" do
      post "/api/v1/sidebar_chat", params: { message: "Hi" }, as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "returns 400 when message is blank" do
      post "/api/v1/sidebar_chat", headers: headers, params: { message: "" }, as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 400 for invalid model key" do
      post "/api/v1/sidebar_chat",
        headers: headers,
        params: { message: "Hello", model: "invalid_model_key" },
        as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "streams NDJSON tokens from Gemma" do
      fake = instance_double(Ai::GemmaStreamingService)
      allow(Ai::GemmaStreamingService).to receive(:new).and_return(fake)
      allow(fake).to receive(:stream).and_yield("Hi").and_yield("!")

      post "/api/v1/sidebar_chat",
        headers: headers,
        params: { message: "Hello", model: "gemma2_9b" },
        as: :json

      expect(response).to have_http_status(:success)
      expect(response.media_type).to eq("application/x-ndjson")
      expect(response.body).to include('"token":"Hi"')
      expect(response.body).to include('"done":true')
    end

    it "streams an error line when Ollama fails" do
      fake = instance_double(Ai::GemmaStreamingService)
      allow(Ai::GemmaStreamingService).to receive(:new).and_return(fake)
      allow(fake).to receive(:stream).and_raise(Ai::GemmaStreamingService::Error, "down")

      post "/api/v1/sidebar_chat",
        headers: headers,
        params: { message: "Hello", model: "gemma2_9b" },
        as: :json

      expect(response).to have_http_status(:success)
      expect(response.body).to include("down")
    end
  end
end
