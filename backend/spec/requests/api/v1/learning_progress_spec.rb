require "rails_helper"

RSpec.describe "Api::V1::LearningProgress", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  it "returns progress aggregates for all skills" do
    create(:session_outcome, user: user, session_type: "ielts_reading", raw_analysis: { feedback: { band_score: 6.0 } })
    create(:session_outcome, user: user, session_type: "ielts_listening", raw_analysis: { feedback: { band_score: 5.5 } })
    create(:session_outcome, user: user, session_type: "ielts_writing", raw_analysis: { grading: { overall_band: 6.5 } })
    create(:session_outcome, user: user, session_type: "speaking", raw_analysis: { ielts: { estimated_band: 6.0 } })

    get "/api/v1/learning_progress", headers: headers
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["skill_counts"]["reading"]).to eq(1)
    expect(body["average_band_by_skill"]["writing"]).to eq(6.5)
  end

  it "returns 401 when unauthenticated" do
    get "/api/v1/learning_progress"
    expect(response).to have_http_status(:unauthorized)
  end
end
