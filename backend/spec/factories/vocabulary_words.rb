FactoryBot.define do
  factory :vocabulary_word do
    association :user
    word { Faker::Lorem.unique.word }
    definition { Faker::Lorem.sentence }
    context_sentence { Faker::Lorem.sentence }
    mastery_level { 1 }
  end
end
