class IeltsReadingAttemptSerializer < ActiveModel::Serializer
  attributes :id, :score, :total_questions, :percentage, :band_score,
             :time_taken_seconds, :feedback, :answers, :completed_at, :created_at

  belongs_to :ielts_reading_passage, serializer: IeltsReadingPassageSerializer
end
