class IeltsUserAnswerSerializer < ActiveModel::Serializer
  attributes :id, :question_id, :question_type, :user_answer, :correct_answer,
             :is_correct, :time_spent_seconds, :error_type, :explanation,
             :suggestion, :created_at
end
