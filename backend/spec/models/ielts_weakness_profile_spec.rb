require "rails_helper"

RSpec.describe IeltsWeaknessProfile, type: :model do
  subject(:profile) { build(:ielts_weakness_profile) }

  describe "validations" do
    it { should validate_inclusion_of(:recommended_difficulty).in_array(IeltsWeaknessProfile::DIFFICULTIES) }
  end

  describe "associations" do
    it { should belong_to(:user) }
  end

  describe "#weakest_type" do
    it "returns the question type with the lowest correct rate" do
      profile.weakness_by_type = {
        "mcq"                  => { "rate" => 0.8 },
        "true_false_not_given" => { "rate" => 0.4 },
        "fill_blank"           => { "rate" => 0.6 }
      }
      expect(profile.weakest_type).to eq("true_false_not_given")
    end

    it "returns nil when weakness_by_type is empty" do
      profile.weakness_by_type = {}
      expect(profile.weakest_type).to be_nil
    end
  end

  describe "#ranked_weaknesses" do
    it "returns types sorted from weakest to strongest" do
      profile.weakness_by_type = {
        "mcq"       => { "rate" => 0.9, "attempts" => 4 },
        "fill_blank" => { "rate" => 0.3, "attempts" => 4 }
      }
      ranked = profile.ranked_weaknesses
      expect(ranked.first[:type]).to eq("fill_blank")
      expect(ranked.last[:type]).to eq("mcq")
    end
  end

  describe ".upsert_for_user!" do
    let(:user)    { create(:user) }
    let(:passage) { create(:ielts_reading_passage, user: user) }
    let(:attempt) { create(:ielts_reading_attempt, user: user,
                           ielts_reading_passage: passage, completed_at: Time.current) }

    before do
      create(:ielts_user_answer, user: user, ielts_reading_attempt: attempt,
             question_type: "mcq", is_correct: true)
      create(:ielts_user_answer, user: user, ielts_reading_attempt: attempt,
             question_type: "mcq", is_correct: false, error_type: "paraphrase")
    end

    it "creates a profile when none exists" do
      expect { IeltsWeaknessProfile.upsert_for_user!(user) }
        .to change(IeltsWeaknessProfile, :count).by(1)
    end

    it "updates an existing profile" do
      IeltsWeaknessProfile.upsert_for_user!(user)
      expect { IeltsWeaknessProfile.upsert_for_user!(user) }
        .not_to change(IeltsWeaknessProfile, :count)
    end

    it "calculates correct rate for mcq" do
      profile = IeltsWeaknessProfile.upsert_for_user!(user)
      expect(profile.weakness_by_type["mcq"]["rate"]).to eq(0.5)
    end

    it "counts error types" do
      profile = IeltsWeaknessProfile.upsert_for_user!(user)
      expect(profile.error_type_counts["paraphrase"]).to eq(1)
    end
  end
end
