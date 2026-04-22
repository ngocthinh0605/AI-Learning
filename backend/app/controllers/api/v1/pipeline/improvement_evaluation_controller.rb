# frozen_string_literal: true

module Api
  module V1
    module Pipeline
      class ImprovementEvaluationController < ApplicationController
        wrap_parameters false

        # POST /api/v1/pipeline/evaluate_improvement
        def create
          previous_attempt_data = params.require(:previous_attempt_data)
          training_session_results = params.require(:training_session_results)

          result = Ai::ImprovementEvaluationService.call(
            previous_attempt_data: previous_attempt_data,
            training_session_results: training_session_results
          )
          if result[:status] != :success
            return render json: {
              error: result[:error],
              error_code: "IMPROVEMENT_EVALUATION_GENERATION_FAILED"
            }, status: :unprocessable_entity
          end

          validation = ImprovementEvaluationValidator.call(result: result[:data])
          unless validation[:valid]
            return render json: {
              error: validation[:errors].join("; "),
              error_code: "IMPROVEMENT_EVALUATION_INVALID_FORMAT"
            }, status: :unprocessable_entity
          end

          SessionOutcome.create!(
            user: current_user,
            session_type: "improvement_evaluation",
            raw_analysis: {
              previous_attempt_data: previous_attempt_data,
              training_session_results: training_session_results,
              evaluation: result[:data]
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
