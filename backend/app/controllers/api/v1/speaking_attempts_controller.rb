# frozen_string_literal: true

module Api
  module V1
    class SpeakingAttemptsController < ApplicationController
      # GET /api/v1/speaking_attempts?page=1&per_page=10&part=part1
      def index
        page = params[:page].to_i
        page = 1 if page <= 0
        per_page = params[:per_page].to_i
        per_page = 10 if per_page <= 0
        per_page = 50 if per_page > 50

        scope = current_user
          .session_outcomes
          .where(session_type: "speaking")
        scope = scope.where("raw_analysis ->> 'part' = ?", params[:part].to_s) if params[:part].present?

        total = scope.count
        offset = (page - 1) * per_page

        attempts = scope
          .order(created_at: :desc)
          .offset(offset)
          .limit(per_page)
          .map { |row| serialize_attempt(row) }

        render json: {
          attempts: attempts,
          meta: {
            page: page,
            per_page: per_page,
            total: total,
            total_pages: (total.to_f / per_page).ceil
          }
        }, status: :ok
      end

      private

      def serialize_attempt(row)
        raw = row.raw_analysis.is_a?(Hash) ? row.raw_analysis : {}
        feedback = raw["feedback"].is_a?(Hash) ? raw["feedback"] : raw

        {
          id: row.id,
          part: raw["part"],
          prompt: raw["prompt"],
          sentence: raw["input_sentence"] || raw.dig("input", "transcript"),
          result: feedback,
          created_at: row.created_at
        }
      end
    end
  end
end
