require "rails_helper"

RSpec.describe User, type: :model do
  subject(:user) { build(:user) }

  # --- Validations ---
  describe "validations" do
    it { should validate_presence_of(:email) }
    it { should validate_uniqueness_of(:email).case_insensitive }
    it { should validate_inclusion_of(:english_level).in_array(User::ENGLISH_LEVELS) }

    it "is valid with valid attributes" do
      expect(user).to be_valid
    end

    it "is invalid with an unknown english_level" do
      user.english_level = "X9"
      expect(user).not_to be_valid
    end
  end

  # --- Associations ---
  describe "associations" do
    it { should have_many(:conversations).dependent(:destroy) }
    it { should have_many(:vocabulary_words).dependent(:destroy) }
  end

  # --- update_streak! ---
  describe "#update_streak!" do
    context "when the user practiced yesterday" do
      it "increments the streak by 1" do
        user.save!
        user.update!(streak_days: 3, last_practice_date: Date.yesterday)
        expect { user.update_streak! }.to change { user.reload.streak_days }.from(3).to(4)
      end
    end

    context "when the user skipped a day" do
      it "resets the streak to 1" do
        user.save!
        user.update!(streak_days: 5, last_practice_date: Date.today - 3)
        expect { user.update_streak! }.to change { user.reload.streak_days }.to(1)
      end
    end

    context "when the user already practiced today" do
      it "does not change the streak" do
        user.save!
        user.update!(streak_days: 2, last_practice_date: Date.today)
        expect { user.update_streak! }.not_to change { user.reload.streak_days }
      end
    end
  end

  # --- add_xp! ---
  describe "#add_xp!" do
    it "adds the given amount to xp_points" do
      user.save!
      expect { user.add_xp!(50) }.to change { user.reload.xp_points }.from(0).to(50)
    end
  end
end
