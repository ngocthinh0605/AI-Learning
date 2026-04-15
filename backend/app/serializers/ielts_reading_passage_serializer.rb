class IeltsReadingPassageSerializer < ActiveModel::Serializer
  attributes :id, :title, :body, :difficulty, :passage_type, :topic,
             :questions, :question_count, :created_at
end
