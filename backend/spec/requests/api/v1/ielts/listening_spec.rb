require "rails_helper"

RSpec.describe "Api::V1::Ielts::Listening", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "POST /api/v1/ielts/listening/passages" do
    before do
      allow(Ai::ListeningPassageService).to receive(:call).and_return(
        {
          status: :success,
          data: {
            "title" => "Campus Tour",
            "transcript" => "A student asks for directions in the campus library.",
            "questions" => [
              { "id" => 1, "type" => "mcq", "question" => "Where is the desk?", "options" => %w[A B C D], "answer" => "A" }
            ]
          }
        }
      )
    end

    it "returns generated listening set" do
      post "/api/v1/ielts/listening/passages", headers: headers, params: { difficulty: "band_6" }, as: :json
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["title"]).to eq("Campus Tour")
    end

    it "returns 422 when AI generation fails" do
      allow(Ai::ListeningPassageService).to receive(:call).and_return({ status: :error, error: "Ollama down" })
      post "/api/v1/ielts/listening/passages", headers: headers, params: { difficulty: "band_6" }, as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "POST /api/v1/ielts/listening/submit" do
    let(:questions) { [{ "id" => 1, "answer" => "A" }, { "id" => 2, "answer" => "TRUE" }] }

    it "creates persisted listening attempt outcome" do
      post "/api/v1/ielts/listening/submit",
        headers: headers,
        params: { title: "Test", transcript: "Hello", questions: questions, answers: { "1" => "A", "2" => "TRUE" } },
        as: :json

      expect(response).to have_http_status(:created)
      expect(user.session_outcomes.where(session_type: "ielts_listening").count).to eq(1)
    end

    it "returns 400-like error for missing required fields" do
      post "/api/v1/ielts/listening/submit", headers: headers, params: { title: "Bad" }, as: :json
      expect(response).to have_http_status(:bad_request)
    end
  end

  describe "GET /api/v1/ielts/listening/attempts" do
    it "returns listening attempts for current user" do
      create(:session_outcome, user: user, session_type: "ielts_listening", raw_analysis: { title: "L1", score: 1, total_questions: 2 })
      get "/api/v1/ielts/listening/attempts", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["attempts"].length).to eq(1)
    end
  end
end
