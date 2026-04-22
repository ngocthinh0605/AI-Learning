# frozen_string_literal: true

module Api
  module V1
    class AdaptiveContentsController < ApplicationController
      wrap_parameters false

      # POST /api/v1/adaptive_content
      def create
        result = Ai::AdaptiveContentGeneratorService.call(
          band: params[:band],
          question_types: params[:question_types] || params[:weak_question_types],
          topics: params[:topics] || params[:weak_vocabulary_topics]
        )

        if result[:status] == :success
          render json: result[:data], status: :ok
        else
          render json: { error: result[:error] }, status: :unprocessable_entity
        end
      end
    end
  end
end
