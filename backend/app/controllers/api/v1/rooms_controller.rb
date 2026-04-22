module Api
  module V1
    class RoomsController < ApplicationController
      before_action :set_room, only: [:show, :join, :leave, :remove_member]

      def index
        rooms = Room.includes(:room_memberships).order(created_at: :desc)
        render json: rooms, each_serializer: RoomSerializer
      end

      def show
        return unless ensure_member!(@room)
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
        return render json: error_payload("room_membership_required", "Not a member"), status: :forbidden unless membership
        return render json: error_payload("owner_cannot_leave", "Owner cannot leave room"), status: :forbidden if membership.role == "owner"

        membership.destroy!
        render json: { left: true }, status: :ok
      end

      def remove_member
        return render json: error_payload("owner_required", "Only room owner can remove members"), status: :forbidden unless owner?

        membership = @room.room_memberships.find_by(user_id: params[:user_id])
        return render json: error_payload("room_membership_required", "Member not found"), status: :not_found unless membership
        return render json: error_payload("owner_cannot_remove_self", "Owner cannot remove self"), status: :unprocessable_entity if membership.role == "owner"

        membership.destroy!
        ActionCable.server.broadcast("room_#{@room.id}", { type: "room_member_removed", user_id: params[:user_id] })
        render json: { removed: true, user_id: params[:user_id] }, status: :ok
      end

      private

      def set_room
        @room = Room.find(params[:id])
      end

      def room_params
        params.require(:room).permit(:name, :description)
      end

      def ensure_member!(room)
        return true if room.room_memberships.exists?(user_id: current_user.id)

        render json: error_payload("room_membership_required", "You must join the room first"), status: :forbidden
        false
      end

      def error_payload(code, message)
        { error: message, error_code: code }
      end

      def owner?
        @room.owner_id == current_user.id
      end
    end
  end
end
