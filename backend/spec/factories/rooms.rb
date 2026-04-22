FactoryBot.define do
  factory :room do
    sequence(:name) { |n| "Room #{n}" }
    description { "Practice together" }
    association :owner, factory: :user
  end
end
