module Api
  module V1
    class UsersController < ApplicationController
      def profile
        render json: current_user, serializer: UserSerializer
      end

      def update_profile
        current_user.update!(profile_params)
        render json: current_user, serializer: UserSerializer
      end

      private

      def profile_params
        params.require(:user).permit(:display_name, :english_level)
      end
    end
  end
end
