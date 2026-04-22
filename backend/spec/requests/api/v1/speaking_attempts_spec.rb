require "rails_helper"

RSpec.describe "Api::V1::SpeakingAttempts", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "GET /api/v1/speaking_attempts" do
    before do
      create(:session_outcome,
             user: user,
             session_type: "speaking",
             raw_analysis: {
               input_sentence: "I goes to school every day.",
               part: "part1",
               prompt: "Introduce yourself",
               feedback: { corrected_sentence: "I go to school every day.", scores: { fluency: 6.5 } }
             })

      create(:session_outcome,
             user: user,
             session_type: "reading",
             raw_analysis: { score: 1 })

      create(:session_outcome,
             user: user,
             session_type: "speaking",
             raw_analysis: {
               input_sentence: "Part 2 attempt sentence",
               part: "part2",
               prompt: "Describe a journey",
               feedback: { corrected_sentence: "Part 2 corrected", scores: { fluency: 6.0 } }
             })
    end

    it "returns only speaking attempts" do
      get "/api/v1/speaking_attempts", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["attempts"].length).to eq(1)
      expect(body["attempts"][0]["sentence"]).to eq("I goes to school every day.")
    end

    it "supports pagination parameters" do
      get "/api/v1/speaking_attempts", headers: headers, params: { page: 1, per_page: 1 }
      body = JSON.parse(response.body)
      expect(body["attempts"].length).to eq(1)
      expect(body["meta"]["page"]).to eq(1)
      expect(body["meta"]["per_page"]).to eq(1)
      expect(body["meta"]["total"]).to eq(2)
      expect(body["meta"]["total_pages"]).to eq(2)
    end

    it "filters attempts by part" do
      get "/api/v1/speaking_attempts", headers: headers, params: { part: "part2" }
      body = JSON.parse(response.body)
      expect(body["attempts"].length).to eq(1)
      expect(body["attempts"][0]["part"]).to eq("part2")
    end

    it "returns 401 when unauthenticated" do
      get "/api/v1/speaking_attempts"
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
