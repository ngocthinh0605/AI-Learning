FactoryBot.define do
  factory :ielts_reading_passage do
    association :user
    title        { "The Impact of Urbanisation on Biodiversity" }
    body         { "A" * 700 }
    difficulty   { "band_6" }
    passage_type { "academic" }
    topic        { "urbanisation" }
    questions do
      [
        {
          "id" => 1, "type" => "mcq",
          "question" => "What is the main topic?",
          "options" => ["A. Cities", "B. Nature", "C. Both", "D. Neither"],
          "answer" => "C"
        },
        {
          "id" => 2, "type" => "true_false_not_given",
          "statement" => "Urbanisation always harms wildlife.",
          "answer" => "FALSE"
        }
      ]
    end
  end
end
