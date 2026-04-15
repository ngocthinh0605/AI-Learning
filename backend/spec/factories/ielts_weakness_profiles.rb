FactoryBot.define do
  factory :ielts_weakness_profile do
    association :user
    weakness_by_type do
      {
        "mcq"                => { "attempts" => 8, "correct" => 6, "rate" => 0.75 },
        "true_false_not_given" => { "attempts" => 8, "correct" => 4, "rate" => 0.5 }
      }
    end
    error_type_counts      { { "paraphrase" => 3, "trap" => 2 } }
    recommended_difficulty { "band_6" }
    total_attempts         { 2 }
    last_updated_at        { Time.current }
  end
end
