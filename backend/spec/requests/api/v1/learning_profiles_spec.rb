# frozen_string_literal: true

require "rails_helper"

RSpec.describe "Learning profile API", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "GET /api/v1/learning_profile" do
    it "returns 401 when unauthenticated" do
      get "/api/v1/learning_profile", as: :json
      expect(response).to have_http_status(:unauthorized)
    end

    it "creates and returns a learning profile" do
      get "/api/v1/learning_profile", headers: headers, as: :json
      expect(response).to have_http_status(:success)
      json = JSON.parse(response.body)
      expect(json["profile_version"]).to eq(1)
    end
  end

  describe "POST /api/v1/session_outcomes" do
    it "merges data and returns profile" do
      post "/api/v1/session_outcomes",
        headers: headers,
        params: {
          session_type: "custom",
          raw_analysis: { "ielts" => { "estimated_band" => 6.0 } }
        },
        as: :json

      expect(response).to have_http_status(:created)
      json = JSON.parse(response.body)
      expect(json["ielts_band_estimate"].to_f).to be_within(0.1).of(6.0)
    end
  end
end
