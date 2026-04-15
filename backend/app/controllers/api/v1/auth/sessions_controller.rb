module Api
  module V1
    module Auth
      class SessionsController < Devise::SessionsController
        respond_to :json

        private

        # Renders JWT in the Authorization header AND in the response body for the frontend
        def respond_with(resource, _opts = {})
          render json: {
            message: "Logged in successfully",
            user: user_json(resource)
          }, status: :ok
        end

        def respond_to_on_destroy
          render json: { message: "Logged out successfully" }, status: :ok
        end

        def user_json(user)
          {
            id: user.id,
            email: user.email,
            display_name: user.display_name,
            english_level: user.english_level,
            xp_points: user.xp_points,
            streak_days: user.streak_days
          }
        end
      end
    end
  end
end
