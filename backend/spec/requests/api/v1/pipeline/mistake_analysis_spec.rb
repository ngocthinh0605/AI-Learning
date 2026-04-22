require "rails_helper"

RSpec.describe "Api::V1::Pipeline::MistakeAnalysis", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }
  let(:payload) do
    {
      questions: [
        { id: 1, question: "Q1", answer: "A" }
      ],
      user_answers: { "1" => "B" },
      passage: "Short reading passage"
    }
  end

  it "returns structured mistake analysis when valid" do
    allow(Ai::MistakeAnalysisService).to receive(:call).and_return(
      status: :success,
      data: {
        "summary" => "Keyword overlap dominates answer selection.",
        "error_breakdown" => { "keyword_matching_bias" => 2 },
        "skills" => { "true_false" => 0.6 },
        "key_weakness" => "keyword_matching_bias"
      }
    )

    post "/api/v1/pipeline/analyze_attempt", params: payload, headers: headers, as: :json

    expect(response).to have_http_status(:ok)
    body = JSON.parse(response.body)
    expect(body["key_weakness"]).to eq("keyword_matching_bias")
  end

  it "returns 422 when model output violates strict contract" do
    allow(Ai::MistakeAnalysisService).to receive(:call).and_return(
      status: :success,
      data: { "summary" => "invalid shape" }
    )

    post "/api/v1/pipeline/analyze_attempt", params: payload, headers: headers, as: :json

    expect(response).to have_http_status(:unprocessable_entity)
    expect(JSON.parse(response.body)["error_code"]).to eq("MISTAKE_ANALYSIS_INVALID_FORMAT")
  end

  it "returns 400 when required fields are missing" do
    post "/api/v1/pipeline/analyze_attempt", params: { passage: "x" }, headers: headers, as: :json

    expect(response).to have_http_status(:bad_request)
    expect(JSON.parse(response.body)["error_code"]).to eq("INVALID_REQUEST")
  end
end
