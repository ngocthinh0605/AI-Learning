module Api
  module V1
    class RoomsController < ApplicationController
      before_action :set_room, only: [:show, :join, :leave]

      def index
        rooms = Room.includes(:room_memberships).order(created_at: :desc)
        render json: rooms, each_serializer: RoomSerializer
      end

      def show
        ensure_member!(@room)
        messages = @room.room_messages.includes(:user).order(created_at: :asc).last(100)
        render json: {
          room: RoomSerializer.new(@room).as_json,
          messages: ActiveModelSerializers::SerializableResource.new(messages, each_serializer: RoomMessageSerializer)
        }
      end

      def create
        room = Room.create!(room_params.merge(owner: current_user))
        RoomMembership.create!(room: room, user: current_user, role: "owner")
        render json: room, serializer: RoomSerializer, status: :created
      end

      def join
        membership = RoomMembership.find_or_create_by!(room: @room, user: current_user) { |m| m.role = "member" }
        render json: { joined: true, role: membership.role }, status: :ok
      end

      def leave
        membership = RoomMembership.find_by(room: @room, user: current_user)
        return render json: { error: "Not a member" }, status: :unprocessable_entity unless membership
        return render json: { error: "Owner cannot leave room" }, status: :unprocessable_entity if membership.role == "owner"

        membership.destroy!
        render json: { left: true }, status: :ok
      end

      private

      def set_room
        @room = Room.find(params[:id])
      end

      def room_params
        params.require(:room).permit(:name, :description)
      end

      def ensure_member!(room)
        return if room.room_memberships.exists?(user_id: current_user.id)

        render json: { error: "You must join the room first" }, status: :forbidden
      end
    end
  end
end
