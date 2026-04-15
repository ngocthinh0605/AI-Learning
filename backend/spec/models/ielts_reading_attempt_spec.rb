require "rails_helper"

RSpec.describe IeltsReadingAttempt, type: :model do
  subject(:attempt) { build(:ielts_reading_attempt) }

  describe "validations" do
    it { should validate_presence_of(:score) }
    it { should validate_presence_of(:total_questions) }
    it { should validate_numericality_of(:score).is_greater_than_or_equal_to(0) }
    it { should validate_numericality_of(:total_questions).is_greater_than(0) }
  end

  describe "associations" do
    it { should belong_to(:user) }
    it { should belong_to(:ielts_reading_passage) }
  end

  describe "#percentage" do
    it "calculates the correct percentage" do
      attempt.score          = 10
      attempt.total_questions = 13
      expect(attempt.percentage).to eq(76.9)
    end

    it "returns 0.0 when total_questions would be zero (edge case via update_column)" do
      attempt.save!
      attempt.update_column(:total_questions, 1)
      attempt.update_column(:score, 0)
      expect(attempt.reload.percentage).to eq(0.0)
    end
  end

  describe "#band_score" do
    it "extracts band_score from the feedback hash" do
      attempt.feedback = { "band_score" => 6.5, "tips" => "Good job." }
      expect(attempt.band_score).to eq(6.5)
    end

    it "returns nil when feedback is empty" do
      attempt.feedback = {}
      expect(attempt.band_score).to be_nil
    end
  end

  describe "#question_feedback" do
    it "returns the questions array from feedback" do
      questions = [{ "id" => 1, "is_correct" => true }]
      attempt.feedback = { "questions" => questions }
      expect(attempt.question_feedback).to eq(questions)
    end

    it "returns empty array when questions key is missing" do
      attempt.feedback = {}
      expect(attempt.question_feedback).to eq([])
    end
  end

  describe "scopes" do
    let!(:completed_attempt)   { create(:ielts_reading_attempt, completed_at: 1.hour.ago) }
    let!(:incomplete_attempt)  { create(:ielts_reading_attempt, completed_at: nil) }

    describe ".completed" do
      it "returns only attempts with a completed_at timestamp" do
        expect(IeltsReadingAttempt.completed).to include(completed_attempt)
        expect(IeltsReadingAttempt.completed).not_to include(incomplete_attempt)
      end
    end

    describe ".recent_first" do
      let!(:older_attempt) { create(:ielts_reading_attempt, created_at: 2.days.ago, completed_at: 2.days.ago) }

      it "orders attempts newest first" do
        ordered = IeltsReadingAttempt.completed.recent_first
        expect(ordered.first).to eq(completed_attempt)
        expect(ordered.last).to eq(older_attempt)
      end
    end
  end
end
