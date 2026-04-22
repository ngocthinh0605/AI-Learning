require "rails_helper"

RSpec.describe "Api::V1::Ielts::Writing", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "POST /api/v1/ielts/writing/grade" do
    let(:grading_data) do
      {
        "overall_band" => 6.5,
        "criteria" => {
          "task_response" => { "score" => 6.0, "feedback" => "Clear position." },
          "coherence_cohesion" => { "score" => 6.5, "feedback" => "Good structure." },
          "lexical_resource" => { "score" => 6.0, "feedback" => "Adequate vocabulary." },
          "grammar_range_accuracy" => { "score" => 6.0, "feedback" => "Some grammar errors." }
        }
      }
    end

    it "returns graded essay and persists attempt" do
      allow(Ai::WritingGradingService).to receive(:call).and_return({ status: :success, data: grading_data })

      expect {
        post "/api/v1/ielts/writing/grade",
          headers: headers,
          params: { task_type: "task_2", prompt: "Discuss both views.", essay: "This is my essay response." },
          as: :json
      }.to change { user.session_outcomes.where(session_type: "ielts_writing").count }.by(1)

      expect(response).to have_http_status(:created)
    end

    it "returns 400 for edge case empty essay" do
      post "/api/v1/ielts/writing/grade",
        headers: headers,
        params: { task_type: "task_2", prompt: "Prompt", essay: "   " },
        as: :json
      expect(response).to have_http_status(:bad_request)
    end

    it "returns 422 when AI grading fails" do
      allow(Ai::WritingGradingService).to receive(:call).and_return({ status: :error, error: "LLM unavailable" })
      post "/api/v1/ielts/writing/grade",
        headers: headers,
        params: { task_type: "task_1", prompt: "Prompt", essay: "Essay body." },
        as: :json
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "GET /api/v1/ielts/writing/attempts" do
    it "returns persisted writing attempts for current user" do
      create(:session_outcome, user: user, session_type: "ielts_writing", raw_analysis: { task_type: "task_2", grading: { overall_band: 6.0 } })
      get "/api/v1/ielts/writing/attempts", headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["attempts"].length).to eq(1)
    end
  end
end
