# frozen_string_literal: true

module Api
  module V1
    class LearningProgressController < ApplicationController
      # GET /api/v1/learning_progress
      def show
        outcomes = current_user.session_outcomes.order(created_at: :desc).limit(200)

        skill_counts = Hash.new(0)
        trend = outcomes.first(20).map do |row|
          skill = normalize_skill(row.session_type)
          skill_counts[skill] += 1
          {
            session_type: skill,
            band: extract_band(row.raw_analysis),
            created_at: row.created_at
          }
        end

        averages = trend
          .group_by { |item| item[:session_type] }
          .transform_values do |items|
            vals = items.filter_map { |i| i[:band]&.to_f }
            vals.empty? ? nil : (vals.sum / vals.length).round(2)
          end

        render json: {
          skill_counts: skill_counts,
          average_band_by_skill: averages,
          recent_trend: trend
        }, status: :ok
      end

      private

      def normalize_skill(session_type)
        case session_type.to_s
        when "ielts_reading" then "reading"
        when "ielts_listening" then "listening"
        when "ielts_writing" then "writing"
        when "speaking" then "speaking"
        else session_type.to_s
        end
      end

      def extract_band(raw)
        return nil unless raw.is_a?(Hash)
        raw.dig("grading", "overall_band") ||
          raw.dig("feedback", "band_score") ||
          raw.dig("ielts", "estimated_band")
      end
    end
  end
end
