require "rails_helper"

RSpec.describe VocabularyWord, type: :model do
  subject(:word) { build(:vocabulary_word) }

  describe "validations" do
    it { should validate_presence_of(:word) }
    it { should validate_inclusion_of(:mastery_level).in_range(1..5) }

    it "is invalid with a duplicate word for the same user" do
      word.save!
      duplicate = build(:vocabulary_word, user: word.user, word: word.word)
      expect(duplicate).not_to be_valid
    end
  end

  describe "associations" do
    it { should belong_to(:user) }
  end

  describe "#mark_reviewed!" do
    context "when review was successful" do
      it "increments mastery_level by 1" do
        word.mastery_level = 2
        word.save!
        expect { word.mark_reviewed!(success: true) }.to change { word.reload.mastery_level }.from(2).to(3)
      end

      it "does not exceed mastery_level 5" do
        word.mastery_level = 5
        word.save!
        word.mark_reviewed!(success: true)
        expect(word.reload.mastery_level).to eq(5)
      end
    end

    context "when review failed" do
      it "decrements mastery_level by 1" do
        word.mastery_level = 3
        word.save!
        expect { word.mark_reviewed!(success: false) }.to change { word.reload.mastery_level }.from(3).to(2)
      end

      it "does not go below mastery_level 1" do
        word.mastery_level = 1
        word.save!
        word.mark_reviewed!(success: false)
        expect(word.reload.mastery_level).to eq(1)
      end
    end

    it "sets next_review_at based on SRS interval" do
      word.mastery_level = 1
      word.save!
      word.mark_reviewed!(success: true)
      # Level 2 interval is 3 days
      expect(word.reload.next_review_at).to be_within(1.minute).of(3.days.from_now)
    end
  end

  describe ".due_for_review" do
    it "returns words where next_review_at is in the past or nil" do
      due_word = create(:vocabulary_word, next_review_at: 1.day.ago)
      future_word = create(:vocabulary_word, next_review_at: 1.day.from_now)

      expect(VocabularyWord.due_for_review).to include(due_word)
      expect(VocabularyWord.due_for_review).not_to include(future_word)
    end
  end
end
