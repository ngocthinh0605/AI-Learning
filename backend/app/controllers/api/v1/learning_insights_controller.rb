# frozen_string_literal: true

module Api
  module V1
    class LearningInsightsController < ApplicationController
      wrap_parameters false

      # POST /api/v1/learning_insights
      # Optional body: { "learning_data": { ... } } — defaults to aggregated DB state.
      def create
        data = if params[:learning_data].present?
          params[:learning_data].to_unsafe_h
        else
          LearningAnalyticsAggregator.for_user(current_user)
        end

        result = Ai::AnalyticsInsightService.call(learning_data: data)
        if result[:status] == :success
          render json: result[:data], status: :ok
        else
          render json: { error: result[:error] }, status: :unprocessable_entity
        end
      end
    end
  end
end
