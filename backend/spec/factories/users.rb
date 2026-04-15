FactoryBot.define do
  factory :user do
    email { Faker::Internet.unique.email }
    password { "password123" }
    password_confirmation { "password123" }
    display_name { Faker::Name.first_name }
    english_level { "B1" }
    xp_points { 0 }
    streak_days { 0 }
  end
end
