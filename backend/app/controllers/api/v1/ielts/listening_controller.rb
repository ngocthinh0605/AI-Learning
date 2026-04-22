module Api
  module V1
    module Ielts
      class ListeningController < ApplicationController
        wrap_parameters false

        # POST /api/v1/ielts/listening/passages
        def generate
          result = Ai::ListeningPassageService.call(
            difficulty: params[:difficulty].presence || "band_6",
            topic: params[:topic],
            accent: params[:accent].presence || "mixed"
          )
          return render json: { error: result[:error] }, status: :unprocessable_entity if result[:status] != :success

          data = result[:data]
          if data["title"].blank? || data["transcript"].blank? || !data["questions"].is_a?(Array)
            return render json: { error: "AI returned malformed listening data" }, status: :unprocessable_entity
          end

          render json: {
            id: SecureRandom.uuid,
            title: data["title"],
            transcript: data["transcript"],
            questions: data["questions"],
            difficulty: params[:difficulty].presence || "band_6",
            topic: params[:topic],
            accent: params[:accent].presence || "mixed"
          }, status: :created
        end

        # POST /api/v1/ielts/listening/submit
        def submit
          questions = params.require(:questions)
          answers = params.require(:answers)
          transcript = params[:transcript].to_s

          service = Ai::ListeningEvaluationService.new(questions, answers)
          result = service.call
          return render json: { error: result[:error] }, status: :unprocessable_entity if result[:status] != :success

          attempt = {
            id: SecureRandom.uuid,
            session_type: "ielts_listening",
            score: result[:score],
            total_questions: result[:total],
            answers: answers,
            feedback: result[:feedback],
            title: params[:title],
            transcript: transcript,
            difficulty: params[:difficulty],
            topic: params[:topic],
            completed_at: Time.current
          }

          SessionOutcome.create!(
            user: current_user,
            session_type: "ielts_listening",
            raw_analysis: attempt
          )

          render json: attempt, status: :created
        end

        # GET /api/v1/ielts/listening/attempts
        def attempts
          page = (params[:page] || 1).to_i
          page = 1 if page <= 0
          per_page = 10

          scope = current_user.session_outcomes.where(session_type: "ielts_listening").order(created_at: :desc)
          total = scope.count
          records = scope.offset((page - 1) * per_page).limit(per_page)

          render json: {
            attempts: records.map { |r| (r.raw_analysis || {}).merge("created_at" => r.created_at, "id" => r.id) },
            meta: { total: total, page: page, per_page: per_page, pages: (total.to_f / per_page).ceil }
          }
        end
      end
    end
  end
end
