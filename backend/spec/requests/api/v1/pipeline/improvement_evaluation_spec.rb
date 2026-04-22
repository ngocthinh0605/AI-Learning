require "rails_helper"

RSpec.describe "Api::V1::Pipeline::ImprovementEvaluation", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }
  let(:payload) do
    {
      previous_attempt_data: { accuracy: 0.4, skill_breakdown: { matching_heading: 0.4 } },
      training_session_results: { accuracy: 0.65, skill_breakdown: { matching_heading: 0.65 } }
    }
  end

  it "returns structured improvement evaluation when valid" do
    allow(Ai::ImprovementEvaluationService).to receive(:call).and_return(
      status: :success,
      data: {
        "improvement" => { "before" => 0.4, "after" => 0.65, "delta" => 0.25 },
        "insight" => "User improved in inference by reducing distractor-driven errors.",
        "next_focus" => "paraphrase_confusion"
      }
    )

    post "/api/v1/pipeline/evaluate_improvement", params: payload, headers: headers, as: :json

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body.dig("improvement", "delta")).to eq(0.25)
  end

  it "returns 422 when model output violates strict contract" do
    allow(Ai::ImprovementEvaluationService).to receive(:call).and_return(
      status: :success,
      data: { "improvement" => { "before" => 0.4, "after" => 0.6, "delta" => 0.1 } }
    )

    post "/api/v1/pipeline/evaluate_improvement", params: payload, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error_code"]).to eq("IMPROVEMENT_EVALUATION_INVALID_FORMAT")
  end

  it "returns 400 when required inputs are missing" do
    post "/api/v1/pipeline/evaluate_improvement", params: { previous_attempt_data: {} }, headers: headers, as: :json

    expect(response).to have_http_status(:bad_request)
    expect(JSON.parse(response.body)["error_code"]).to eq("INVALID_REQUEST")
  end
end
