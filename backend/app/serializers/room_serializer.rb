class RoomSerializer < ActiveModel::Serializer
  attributes :id, :name, :description, :owner_id, :member_count, :created_at

  def member_count
    object.room_memberships.size
  end
end
