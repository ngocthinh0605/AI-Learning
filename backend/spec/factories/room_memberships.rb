FactoryBot.define do
  factory :room_membership do
    association :room
    association :user
    role { "member" }
  end
end
