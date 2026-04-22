class RoomChannel < ApplicationCable::Channel
  def subscribed
    room = Room.find_by(id: params[:room_id])
    reject and return unless room
    reject and return unless room.room_memberships.exists?(user_id: current_user.id)

    stream_from "room_#{room.id}"
  end
end
