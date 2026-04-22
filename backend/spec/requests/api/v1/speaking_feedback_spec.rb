require "rails_helper"

RSpec.describe "Api::V1::SpeakingFeedback", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "POST /api/v1/speaking_feedback" do
    context "when request is valid" do
      before do
        allow(Ai::SpeakingFeedbackService).to receive(:call).and_return(
          {
            status: :success,
            data: {
              "corrected_sentence" => "I go to school every day.",
              "scores" => { "fluency" => 6.5, "grammar" => 6.0, "pronunciation" => 6.5 }
            }
          }
        )
      end

      it "returns speaking feedback JSON" do
        post "/api/v1/speaking_feedback",
          headers: headers,
          params: { sentence: "I goes to school every day." },
          as: :json

        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body["scores"]["fluency"]).to eq(6.5)
      end

      it "persists a speaking session outcome for history" do
        expect {
          post "/api/v1/speaking_feedback",
            headers: headers,
            params: { sentence: "I goes to school every day.", part: "part1" },
            as: :json
        }.to change { user.session_outcomes.where(session_type: "speaking").count }.by(1)
      end
    end

    context "when sentence is blank" do
      it "returns 400" do
        post "/api/v1/speaking_feedback",
          headers: headers,
          params: { sentence: "   " },
          as: :json

        expect(response).to have_http_status(:bad_request)
        expect(JSON.parse(response.body)["error"]).to eq("sentence is required")
      end
    end

    context "when AI service fails" do
      before do
        allow(Ai::SpeakingFeedbackService).to receive(:call)
          .and_return({ status: :error, error: "LLM unavailable" })
      end

      it "returns 422 with error message" do
        post "/api/v1/speaking_feedback",
          headers: headers,
          params: { sentence: "I like reading books." },
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)["error"]).to include("LLM unavailable")
      end
    end
  end
end
