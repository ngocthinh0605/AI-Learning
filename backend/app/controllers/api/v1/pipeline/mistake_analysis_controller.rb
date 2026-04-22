# frozen_string_literal: true

module Api
  module V1
    module Pipeline
      class MistakeAnalysisController < ApplicationController
        wrap_parameters false

        # POST /api/v1/pipeline/analyze_attempt
        def create
          questions = params.require(:questions)
          user_answers = params.require(:user_answers)
          passage = params[:passage]

          result = Ai::MistakeAnalysisService.call(
            questions: questions,
            user_answers: user_answers,
            passage: passage
          )
          if result[:status] != :success
            return render json: {
              error: result[:error],
              error_code: "MISTAKE_ANALYSIS_GENERATION_FAILED"
            }, status: :unprocessable_entity
          end

          validation = MistakeAnalysisValidator.call(result: result[:data])
          unless validation[:valid]
            return render json: {
              error: validation[:errors].join("; "),
              error_code: "MISTAKE_ANALYSIS_INVALID_FORMAT"
            }, status: :unprocessable_entity
          end

          SessionOutcome.create!(
            user: current_user,
            session_type: "mistake_analysis",
            raw_analysis: {
              questions: questions,
              user_answers: user_answers,
              passage: passage,
              analysis: result[:data]
            }
          )

          render json: result[:data], status: :ok
        rescue ActionController::ParameterMissing => e
          render json: { error: e.message, error_code: "INVALID_REQUEST" }, status: :bad_request
        end
      end
    end
  end
end
