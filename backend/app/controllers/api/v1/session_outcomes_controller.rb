# frozen_string_literal: true

module Api
  module V1
    class SessionOutcomesController < ApplicationController
      wrap_parameters false

      # POST /api/v1/session_outcomes
      # Body: { "session_type": "...", "raw_analysis": { ... } }
      def create
        raw = params.require(:raw_analysis)
        st = params.require(:session_type)

        profile = LearningProfileUpsertService.call(
          user: current_user,
          raw_analysis: raw.to_unsafe_h,
          session_type: st.to_s,
          persist_session: true
        )

        render json: profile, serializer: LearningProfileSerializer, status: :created
      end
    end
  end
end
