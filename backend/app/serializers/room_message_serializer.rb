class RoomMessageSerializer < ActiveModel::Serializer
  attributes :id, :room_id, :user_id, :content, :created_at, :display_name

  def display_name
    object.user.display_name
  end
end
