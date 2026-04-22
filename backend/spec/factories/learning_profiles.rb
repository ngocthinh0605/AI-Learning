# frozen_string_literal: true

FactoryBot.define do
  factory :learning_profile do
    association :user
    profile_version { 1 }
    metadata { {} }
  end
end
