FactoryBot.define do
  factory :ielts_user_answer do
    association :user
    association :ielts_reading_attempt
    question_id    { 1 }
    question_type  { "mcq" }
    user_answer    { "A" }
    correct_answer { "A" }
    is_correct     { true }
    error_type     { nil }
    explanation    { nil }
    suggestion     { nil }

    trait :wrong do
      user_answer { "B" }
      is_correct  { false }
      error_type  { "paraphrase" }
      explanation { "The passage uses a synonym." }
      suggestion  { "Practice paraphrase recognition." }
    end
  end
end
