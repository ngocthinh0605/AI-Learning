module Api
  module V1
    module Ielts
      class WritingController < ApplicationController
        wrap_parameters false

        # POST /api/v1/ielts/writing/grade
        def grade
          essay = params.require(:essay).to_s.strip
          prompt = params.require(:prompt).to_s.strip
          task_type = params[:task_type].presence || "task_2"

          if essay.blank? || prompt.blank?
            return render json: { error: "essay and prompt are required" }, status: :bad_request
          end

          result = Ai::WritingGradingService.call(task_type: task_type, prompt: prompt, essay: essay)
          return render json: { error: result[:error] }, status: :unprocessable_entity if result[:status] != :success

          data = result[:data]
          unless valid_grading_shape?(data)
            return render json: { error: "AI returned malformed writing evaluation" }, status: :unprocessable_entity
          end

          attempt = {
            session_type: "ielts_writing",
            task_type: task_type,
            prompt: prompt,
            essay: essay,
            grading: data,
            completed_at: Time.current
          }

          SessionOutcome.create!(
            user: current_user,
            session_type: "ielts_writing",
            raw_analysis: attempt
          )

          render json: attempt, status: :created
        end

        # GET /api/v1/ielts/writing/attempts
        def attempts
          page = (params[:page] || 1).to_i
          page = 1 if page <= 0
          per_page = 10

          scope = current_user.session_outcomes.where(session_type: "ielts_writing").order(created_at: :desc)
          total = scope.count
          records = scope.offset((page - 1) * per_page).limit(per_page)

          render json: {
            attempts: records.map { |r| (r.raw_analysis || {}).merge("id" => r.id, "created_at" => r.created_at) },
            meta: { total: total, page: page, per_page: per_page, pages: (total.to_f / per_page).ceil }
          }
        end

        private

        def valid_grading_shape?(data)
          return false unless data.is_a?(Hash)
          return false unless data["overall_band"].present?

          criteria = data["criteria"]
          return false unless criteria.is_a?(Hash)

          required = %w[task_response coherence_cohesion lexical_resource grammar_range_accuracy]
          required.all? { |k| criteria[k].is_a?(Hash) && criteria[k]["score"].present? }
        end
      end
    end
  end
end
