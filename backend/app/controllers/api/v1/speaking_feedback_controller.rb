# frozen_string_literal: true

module Api
  module V1
    class SpeakingFeedbackController < ApplicationController
      wrap_parameters false

      # POST /api/v1/speaking_feedback
      # Params: sentence, update_profile (optional boolean), part (optional), prompt (optional)
      def create
        sentence = params.require(:sentence).to_s.strip
        if sentence.blank?
          return render json: { error: "sentence is required" }, status: :bad_request
        end

        result = Ai::SpeakingFeedbackService.call(sentence)
        return render json: { error: result[:error] }, status: :unprocessable_entity if result[:status] != :success

        # Reason: attempt history should persist even when profile updates are disabled.
        SessionOutcome.create!(
          user: current_user,
          session_type: "speaking",
          raw_analysis: {
            input_sentence: sentence,
            part: params[:part].to_s.presence,
            prompt: params[:prompt].to_s.presence,
            feedback: result[:data]
          }.compact
        )

        if ActiveModel::Type::Boolean.new.cast(params[:update_profile])
          LearningProfileUpsertService.call(
            user: current_user,
            raw_analysis: Ai::SpeakingFeedbackService.to_profile_raw(result[:data]),
            session_type: "speaking",
            persist_session: false
          )
        end

        render json: result[:data], status: :ok
      end
    end
  end
end
