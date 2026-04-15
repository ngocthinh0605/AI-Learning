class ConversationSerializer < ActiveModel::Serializer
  attributes :id, :title, :topic, :difficulty_level, :created_at, :message_count

  has_many :messages, if: -> { instance_options[:include_messages] }

  def message_count
    object.messages.count
  end
end
