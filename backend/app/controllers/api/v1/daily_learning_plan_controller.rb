# frozen_string_literal: true

module Api
  module V1
    class DailyLearningPlanController < ApplicationController
      wrap_parameters false

      # GET /api/v1/daily_learning_plan?page=1
      def index
        page = (params[:page] || 1).to_i
        page = 1 if page <= 0
        per_page = 10

        scope = current_user.session_outcomes.where(session_type: "daily_plan").order(created_at: :desc)
        total = scope.count
        records = scope.offset((page - 1) * per_page).limit(per_page)

        attempts = records.map do |row|
          raw = row.raw_analysis.is_a?(Hash) ? row.raw_analysis : {}
          {
            id: row.id,
            created_at: row.created_at,
            daily_time_minutes: raw["daily_time_minutes"] || raw[:daily_time_minutes],
            plan: raw["plan"] || raw[:plan]
          }
        end

        render json: {
          attempts: attempts,
          meta: { total: total, page: page, per_page: per_page, total_pages: (total.to_f / per_page).ceil }
        }, status: :ok
      end

      # POST /api/v1/daily_learning_plan
      def create
        learning_profile = params.require(:learning_profile_json)
        # Reason: keep legacy clients working while upgraded pipeline rolls out.
        latest_mistake_analysis = params[:latest_mistake_analysis_json] || params.require(:recent_performance_json)
        learning_goal = params.require(:learning_goal_json)
        daily_time_minutes = params.require(:daily_time_minutes).to_i

        if daily_time_minutes <= 0
          return render json: { error: "daily_time_minutes must be positive", error_code: "INVALID_REQUEST" }, status: :bad_request
        end

        result = Ai::DailyLearningPlanService.call(
          learning_profile: learning_profile.to_unsafe_h,
          latest_mistake_analysis: latest_mistake_analysis.to_unsafe_h,
          learning_goal: learning_goal.to_unsafe_h,
          daily_time_minutes: daily_time_minutes
        )
        if result[:status] != :success
          message = result[:error].to_s.include?("Empty or invalid JSON from model") ?
            "Planner model returned an invalid format. Please retry." :
            result[:error]
          return render json: { error: message, error_code: "DAILY_PLAN_GENERATION_FAILED" }, status: :unprocessable_entity
        end

        validation = DailyLearningPlanValidator.call(plan: result[:data], daily_time_minutes: daily_time_minutes)
        unless validation[:valid]
          return render json: {
            error: validation[:errors].join("; "),
            error_code: "DAILY_PLAN_INVALID_FORMAT"
          }, status: :unprocessable_entity
        end

        SessionOutcome.create!(
          user: current_user,
          session_type: "daily_plan",
          raw_analysis: { daily_time_minutes: daily_time_minutes, plan: result[:data] }
        )

        render json: result[:data], status: :ok
      rescue ActionController::ParameterMissing => e
        render json: { error: e.message, error_code: "INVALID_REQUEST" }, status: :bad_request
      end
    end
  end
end
