FactoryBot.define do
  factory :message do
    association :conversation
    role { "user" }
    content { Faker::Lorem.sentence }
  end
end
