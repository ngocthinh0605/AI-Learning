FactoryBot.define do
  factory :session_outcome do
    association :user
    session_type { "speaking" }
    raw_analysis { { input_sentence: "Sample sentence", feedback: {} } }
  end
end
