class MessageSerializer < ActiveModel::Serializer
  attributes :id, :role, :content, :transcript_error, :pronunciation_score, :created_at
end
