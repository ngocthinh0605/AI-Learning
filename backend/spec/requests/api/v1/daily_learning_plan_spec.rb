require "rails_helper"

RSpec.describe "Api::V1::DailyLearningPlan", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  let(:valid_plan) do
    {
      "summary" => { "main_focus" => "reading", "reason" => "cognitive weaknesses dominate" },
      "tasks" => [
        { "type" => "reading_training", "focus" => "inference", "duration_minutes" => 15, "reason" => "low accuracy + inference failure" },
        { "type" => "paraphrase_training", "focus" => "synonyms", "duration_minutes" => 9, "reason" => "paraphrase confusion" },
        { "type" => "vocab_training", "focus" => "academic words", "duration_minutes" => 6, "reason" => "secondary surface support" }
      ]
    }
  end

  it "returns persisted daily plan history" do
    create(:session_outcome,
      user: user,
      session_type: "daily_plan",
      raw_analysis: { daily_time_minutes: 30, plan: valid_plan })

    get "/api/v1/daily_learning_plan", headers: headers
    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["attempts"].length).to eq(1)
    expect(body["attempts"][0]["plan"]["summary"]["main_focus"]).to eq("reading")
  end

  it "returns a validated daily plan" do
    allow(Ai::DailyLearningPlanService).to receive(:call).and_return({ status: :success, data: valid_plan })

    post "/api/v1/daily_learning_plan",
      headers: headers,
      params: {
        learning_profile_json: { level: "B1" },
        latest_mistake_analysis_json: { key_weakness: "keyword_matching_bias" },
        learning_goal_json: { target_band: 7.0 },
        daily_time_minutes: 30
      },
      as: :json

    expect(response).to have_http_status(:ok)
    expect(JSON.parse(response.body)["tasks"].length).to eq(3)
  end

  it "returns 400 on missing inputs" do
    post "/api/v1/daily_learning_plan", headers: headers, params: { daily_time_minutes: 30 }, as: :json
    expect(response).to have_http_status(:bad_request)
  end

  it "returns 422 when AI returns invalid plan shape" do
    allow(Ai::DailyLearningPlanService).to receive(:call).and_return({ status: :success, data: { "tasks" => [] } })
    post "/api/v1/daily_learning_plan",
      headers: headers,
      params: {
        learning_profile_json: { level: "B1" },
        latest_mistake_analysis_json: { key_weakness: "keyword_matching_bias" },
        learning_goal_json: { target_band: 7.0 },
        daily_time_minutes: 30
      },
      as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "returns 422 when AI plan violates strict output schema" do
    bad_split = Marshal.load(Marshal.dump(valid_plan))
    bad_split["tips"] = ["legacy key from old planner"]
    allow(Ai::DailyLearningPlanService).to receive(:call).and_return({ status: :success, data: bad_split })

    post "/api/v1/daily_learning_plan",
      headers: headers,
      params: {
        learning_profile_json: { level: "B1" },
        latest_mistake_analysis_json: { key_weakness: "keyword_matching_bias" },
        learning_goal_json: { target_band: 7.0 },
        daily_time_minutes: 30
      },
      as: :json
    expect(response).to have_http_status(:unprocessable_entity)
  end

  it "returns 422 when AI plan uses only one skill type" do
    single_skill = Marshal.load(Marshal.dump(valid_plan))
    single_skill["tasks"].each { |task| task["type"] = "reading_training" }
    allow(Ai::DailyLearningPlanService).to receive(:call).and_return({ status: :success, data: single_skill })

    post "/api/v1/daily_learning_plan",
      headers: headers,
      params: {
        learning_profile_json: { level: "B1" },
        latest_mistake_analysis_json: { key_weakness: "keyword_matching_bias" },
        learning_goal_json: { target_band: 7.0 },
        daily_time_minutes: 30
      },
      as: :json
    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error_code"]).to eq("DAILY_PLAN_INVALID_FORMAT")
  end
end
