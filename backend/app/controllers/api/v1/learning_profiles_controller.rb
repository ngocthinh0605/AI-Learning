# frozen_string_literal: true

module Api
  module V1
    class LearningProfilesController < ApplicationController
      # GET /api/v1/learning_profile
      def show
        profile = current_user.learning_profile ||
                  LearningProfile.create!(user: current_user, metadata: {}, profile_version: 1)
        profile = LearningProfile.includes(
          :vocabulary_weaknesses,
          :grammar_mistakes,
          :learning_profile_reading_weaknesses
        ).find(profile.id)

        render json: profile, serializer: LearningProfileSerializer
      end
    end
  end
end
