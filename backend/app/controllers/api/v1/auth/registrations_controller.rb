module Api
  module V1
    module Auth
      class RegistrationsController < Devise::RegistrationsController
        respond_to :json

        private

        def respond_with(resource, _opts = {})
          if resource.persisted?
            render json: {
              message: "Account created successfully",
              user: user_json(resource)
            }, status: :created
          else
            render json: { errors: resource.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def sign_up_params
          params.require(:user).permit(:email, :password, :password_confirmation, :display_name, :english_level)
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
