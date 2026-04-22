class RoomChannel < ApplicationCable::Channel
  def subscribed
    room = Room.find_by(id: params[:room_id])
    reject and return unless room
    reject and return unless room.room_memberships.exists?(user_id: current_user.id)

    @room_id = room.id
    stream_from stream_name
    broadcast_presence_delta(+1)
  end

  def unsubscribed
    broadcast_presence_delta(-1) if @room_id.present?
  end

  private

  def stream_name
    "room_#{@room_id}"
  end

  def presence_cache_key
    "room_presence_count:#{@room_id}"
  end

  def broadcast_presence_delta(delta)
    current = Rails.cache.read(presence_cache_key).to_i
    next_count = [current + delta, 0].max
    Rails.cache.write(presence_cache_key, next_count, expires_in: 2.hours)
    ActionCable.server.broadcast(stream_name, { type: "room_presence", online_count: next_count })
  end
end
