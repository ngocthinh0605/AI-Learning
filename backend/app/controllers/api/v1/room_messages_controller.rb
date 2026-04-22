module Api
  module V1
    class RoomMessagesController < ApplicationController
      before_action :set_room
      before_action :set_message, only: [:destroy]

      def create
        return render json: error_payload("room_membership_required", "Join room first"), status: :forbidden unless member?

        content = message_params[:content].to_s.strip
        return render json: error_payload("invalid_message", "content is required"), status: :bad_request if content.blank?

        message = @room.room_messages.create!(user: current_user, content: content)
        payload = RoomMessageSerializer.new(message).as_json
        ActionCable.server.broadcast("room_#{@room.id}", { type: "room_message", message: payload })
        render json: payload, status: :created
      end

      def destroy
        return if performed?
        return render json: error_payload("owner_required", "Only room owner can delete messages"), status: :forbidden unless owner?

        @message.destroy!
        ActionCable.server.broadcast("room_#{@room.id}", { type: "room_message_deleted", message_id: @message.id })
        render json: { deleted: true, message_id: @message.id }, status: :ok
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

      def set_message
        @message = @room.room_messages.find(params[:id])
      rescue ActiveRecord::RecordNotFound
        render json: error_payload("message_not_found", "Message not found"), status: :not_found
      end

      def owner?
        @room.owner_id == current_user.id
      end

      def error_payload(code, message)
        { error: message, error_code: code }
      end
    end
  end
end
