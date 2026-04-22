module Api
  module V1
    class RoomMessagesController < ApplicationController
      before_action :set_room

      def create
        return render json: { error: "Join room first" }, status: :forbidden unless member?

        message = @room.room_messages.create!(user: current_user, content: message_params[:content].to_s.strip)
        payload = RoomMessageSerializer.new(message).as_json
        ActionCable.server.broadcast("room_#{@room.id}", { type: "room_message", message: payload })
        render json: payload, status: :created
      end

      private

      def set_room
        @room = Room.find(params[:room_id])
      end

      def member?
        @room.room_memberships.exists?(user_id: current_user.id)
      end

      def message_params
        params.require(:message).permit(:content)
      end
    end
  end
end
