FactoryBot.define do
  factory :room_message do
    association :room
    association :user
    content { "Hello room" }
  end
end
