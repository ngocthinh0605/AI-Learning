# frozen_string_literal: true

module Api
  module V1
    class TutorChatsController < ApplicationController
      wrap_parameters false

      # POST /api/v1/tutor_chat
      # Params: message, history (optional), learning_profile (optional override JSON)
      def create
        message = params.require(:message).to_s.strip
        return render json: { error: "message is required" }, status: :bad_request if message.blank?

        history = normalize_history(params[:messages] || params[:history])

        profile_payload = if params[:learning_profile].present?
          params[:learning_profile].to_unsafe_h
        else
          lp = current_user.learning_profile ||
               LearningProfile.create!(user: current_user, metadata: {}, profile_version: 1)
          LearningProfileSerializer.new(lp).serializable_hash
        end

        result = Ai::TutorStructuredChatService.call(
          learning_profile: profile_payload,
          history: history,
          message: message
        )

        if result[:status] == :success
          render json: result[:data], status: :ok
        else
          render json: { error: result[:error] }, status: :unprocessable_entity
        end
      end

      private

      def normalize_history(raw)
        Array(raw).last(20).filter_map do |m|
          role = (m[:role] || m["role"]).to_s
          content = (m[:content] || m["content"]).to_s.strip
          next if content.blank?
          next unless %w[user assistant].include?(role)

          { "role" => role, "content" => content }
        end
      end
    end
  end
end
