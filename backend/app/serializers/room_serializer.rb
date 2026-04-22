class RoomSerializer < ActiveModel::Serializer
  attributes :id, :name, :description, :owner_id, :member_count, :online_count, :created_at

  def member_count
    object.room_memberships.size
  end

  def online_count
    Rails.cache.read("room_presence_count:#{object.id}").to_i
  end
end
