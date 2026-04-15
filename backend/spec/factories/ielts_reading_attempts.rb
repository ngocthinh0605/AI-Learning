FactoryBot.define do
  factory :ielts_reading_attempt do
    association :user
    association :ielts_reading_passage
    answers            { { "1" => "C", "2" => "FALSE" } }
    score              { 1 }
    total_questions    { 2 }
    time_taken_seconds { 300 }
    feedback do
      {
        "band_score" => 5.5,
        "tips"       => "Keep practising.",
        "questions"  => [
          { "id" => 1, "is_correct" => true,  "explanation" => "Correct!" },
          { "id" => 2, "is_correct" => false, "explanation" => "The correct answer was FALSE." }
        ]
      }
    end
    completed_at { Time.current }
  end
end
