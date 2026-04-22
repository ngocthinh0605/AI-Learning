require "rails_helper"

RSpec.describe "Api::V1::Ielts::Reading", type: :request do
  let(:user)    { create(:user) }
  let(:headers) { auth_headers_for(user) }

  let(:ai_passage_response) do
    {
      "title"     => "The Rise of Urban Farming",
      "body"      => "A" * 700,
      "questions" => [
        { "id" => 1, "type" => "mcq", "question" => "What is the topic?",
          "options" => ["A. Farming", "B. Cities", "C. Both", "D. None"], "answer" => "C" },
        { "id" => 2, "type" => "true_false_not_given",
          "statement" => "Urban farming is new.", "answer" => "FALSE" }
      ]
    }
  end

  # ─── POST /api/v1/ielts/reading/passages ────────────────────────────────────

  describe "POST /api/v1/ielts/reading/passages" do
    context "when AI service succeeds" do
      before do
        allow_any_instance_of(Ai::ReadingPassageService)
          .to receive(:call)
          .and_return({ status: :success, data: ai_passage_response.symbolize_keys })
      end

      it "creates and returns a passage with status 201" do
        post "/api/v1/ielts/reading/passages",
          headers: headers,
          params: { difficulty: "band_6", topic: "urban farming", passage_type: "academic" },
          as: :json

        expect(response).to have_http_status(:created)
        body = JSON.parse(response.body)
        expect(body["title"]).to eq("The Rise of Urban Farming")
        expect(body["difficulty"]).to eq("band_6")
      end

      it "persists the passage to the database" do
        expect {
          post "/api/v1/ielts/reading/passages",
            headers: headers,
            params: { difficulty: "band_6" },
            as: :json
        }.to change(IeltsReadingPassage, :count).by(1)
      end
    end

    context "when AI service fails" do
      before do
        allow_any_instance_of(Ai::ReadingPassageService)
          .to receive(:call)
          .and_return({ status: :error, error: "Ollama unavailable" })
      end

      it "returns 422 with an error message" do
        post "/api/v1/ielts/reading/passages",
          headers: headers,
          params: { difficulty: "band_6" },
          as: :json

        expect(response).to have_http_status(:unprocessable_entity)
        expect(JSON.parse(response.body)["error"]).to include("Ollama unavailable")
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        post "/api/v1/ielts/reading/passages", params: { difficulty: "band_6" }, as: :json
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  # ─── POST /api/v1/ielts/reading/passages/:id/submit ─────────────────────────

  describe "POST /api/v1/ielts/reading/passages/:id/submit" do
    let!(:passage) { create(:ielts_reading_passage, user: user) }

    let(:evaluation_result) do
      {
        status:   :success,
        score:    1,
        total:    2,
        feedback: {
          "band_score" => 5.0,
          "tips"       => "Keep practising.",
          "questions"  => [
            { "id" => 1, "is_correct" => true,  "explanation" => "Correct!" },
            { "id" => 2, "is_correct" => false, "explanation" => "Wrong." }
          ]
        }
      }
    end

    before do
      allow_any_instance_of(Ai::ReadingEvaluationService)
        .to receive(:call)
        .and_return(evaluation_result)
    end

    it "creates an attempt and returns it with status 201" do
      post "/api/v1/ielts/reading/passages/#{passage.id}/submit",
        headers: headers,
        params: { answers: { "1" => "C", "2" => "TRUE" }, time_taken_seconds: 600 },
        as: :json

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["score"]).to eq(1)
      expect(body["band_score"]).to eq(5.0)
    end

    it "awards XP to the user" do
      expect {
        post "/api/v1/ielts/reading/passages/#{passage.id}/submit",
          headers: headers,
          params: { answers: { "1" => "C", "2" => "TRUE" } },
          as: :json
      }.to change { user.reload.xp_points }
    end

    it "returns 404 when passage belongs to another user" do
      other_passage = create(:ielts_reading_passage)
      post "/api/v1/ielts/reading/passages/#{other_passage.id}/submit",
        headers: headers,
        params: { answers: {} },
        as: :json

      expect(response).to have_http_status(:not_found)
    end
  end

  # ─── GET /api/v1/ielts/reading/attempts ─────────────────────────────────────

  describe "GET /api/v1/ielts/reading/attempts" do
    it "returns the user's completed attempts" do
      create_list(:ielts_reading_attempt, 3, user: user, completed_at: Time.current)
      create(:ielts_reading_attempt, completed_at: nil)  # incomplete, different user

      get "/api/v1/ielts/reading/attempts", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["attempts"].length).to eq(3)
      expect(body["meta"]["total"]).to eq(3)
    end

    it "does not return other users' attempts" do
      other_user = create(:user)
      create(:ielts_reading_attempt, user: other_user, completed_at: Time.current)

      get "/api/v1/ielts/reading/attempts", headers: headers
      body = JSON.parse(response.body)
      expect(body["attempts"].length).to eq(0)
    end

    it "returns 401 when unauthenticated" do
      get "/api/v1/ielts/reading/attempts"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ─── GET /api/v1/ielts/reading/attempts/:id ─────────────────────────────────

  describe "GET /api/v1/ielts/reading/attempts/:id" do
    let!(:attempt) { create(:ielts_reading_attempt, user: user, completed_at: Time.current) }

    it "returns the attempt" do
      get "/api/v1/ielts/reading/attempts/#{attempt.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)["id"]).to eq(attempt.id)
    end

    it "returns 404 for another user's attempt" do
      other_attempt = create(:ielts_reading_attempt, completed_at: Time.current)
      get "/api/v1/ielts/reading/attempts/#{other_attempt.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # ─── GET /api/v1/ielts/reading/attempts/:id/review ──────────────────────────

  describe "GET /api/v1/ielts/reading/attempts/:id/review" do
    let!(:passage) { create(:ielts_reading_passage, user: user) }
    let!(:attempt) { create(:ielts_reading_attempt, user: user,
                            ielts_reading_passage: passage, completed_at: Time.current) }
    let!(:wrong_answer) { create(:ielts_user_answer, :wrong, user: user,
                                 ielts_reading_attempt: attempt) }

    before do
      allow_any_instance_of(Ai::SimilarQuestionService)
        .to receive(:call)
        .and_return({ status: :success, questions: [] })
    end

    it "returns attempt, wrong_answers, and similar_questions" do
      get "/api/v1/ielts/reading/attempts/#{attempt.id}/review", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to have_key("wrong_answers")
      expect(body).to have_key("similar_questions")
    end

    it "returns 404 for another user's attempt" do
      other_attempt = create(:ielts_reading_attempt, completed_at: Time.current)
      get "/api/v1/ielts/reading/attempts/#{other_attempt.id}/review", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end

  # ─── GET /api/v1/ielts/reading/weakness ─────────────────────────────────────

  describe "GET /api/v1/ielts/reading/weakness" do
    it "returns (or creates) the user weakness profile" do
      get "/api/v1/ielts/reading/weakness", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to have_key("weakness_by_type")
      expect(body).to have_key("recommended_difficulty")
    end

    it "returns 401 when unauthenticated" do
      get "/api/v1/ielts/reading/weakness"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ─── GET /api/v1/ielts/reading/training ─────────────────────────────────────

  describe "GET /api/v1/ielts/reading/training" do
    before do
      allow_any_instance_of(Ai::TrainingExerciseService)
        .to receive(:call)
        .and_return({
          status:    :success,
          exercises: [
            { "question" => "Which means the same?",
              "options" => ["A", "B"], "correct_answer" => "A", "explanation" => "...",
              "prompt" => "Which means the same?", "answer" => "A" }
          ]
        })
    end

    it "returns weakness_type and exercises" do
      get "/api/v1/ielts/reading/training", headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body).to have_key("weakness_type")
      expect(body["exercises"]).to be_an(Array)
      expect(body["exercises"][0]).to have_key("correct_answer")
    end

    it "accepts explicit weakness-aligned input parameters" do
      get "/api/v1/ielts/reading/training",
        headers: headers,
        params: {
          task_type: "reading_training",
          weakness_focus: "matching_heading",
          cognitive_bias: "distractor_trap"
        }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["task_type"]).to eq("reading_training")
      expect(body["weakness_focus"]).to eq("matching_heading")
      expect(body["cognitive_bias"]).to eq("distractor_trap")
    end

    it "returns 401 when unauthenticated" do
      get "/api/v1/ielts/reading/training"
      expect(response).to have_http_status(:unauthorized)
    end
  end
end
