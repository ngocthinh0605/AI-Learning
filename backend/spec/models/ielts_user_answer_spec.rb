require "rails_helper"

RSpec.describe IeltsUserAnswer, type: :model do
  subject(:answer) { build(:ielts_user_answer) }

  describe "validations" do
    it { should validate_presence_of(:question_id) }
    it { should validate_presence_of(:correct_answer) }
    it { should validate_inclusion_of(:question_type).in_array(IeltsUserAnswer::QUESTION_TYPES) }

    it "allows nil error_type" do
      answer.error_type = nil
      expect(answer).to be_valid
    end

    it "rejects unknown error_type" do
      answer.error_type = "unknown_type"
      expect(answer).not_to be_valid
    end
  end

  describe "associations" do
    it { should belong_to(:user) }
    it { should belong_to(:ielts_reading_attempt) }
  end

  describe "scopes" do
    let!(:correct_answer) { create(:ielts_user_answer, is_correct: true) }
    let!(:wrong_answer)   { create(:ielts_user_answer, :wrong) }

    describe ".correct" do
      it "returns only correct answers" do
        expect(IeltsUserAnswer.correct).to include(correct_answer)
        expect(IeltsUserAnswer.correct).not_to include(wrong_answer)
      end
    end

    describe ".wrong" do
      it "returns only wrong answers" do
        expect(IeltsUserAnswer.wrong).to include(wrong_answer)
        expect(IeltsUserAnswer.wrong).not_to include(correct_answer)
      end
    end

    describe ".by_type" do
      it "filters by question_type" do
        mcq = create(:ielts_user_answer, question_type: "mcq")
        tfng = create(:ielts_user_answer, question_type: "true_false_not_given")
        expect(IeltsUserAnswer.by_type("mcq")).to include(mcq)
        expect(IeltsUserAnswer.by_type("mcq")).not_to include(tfng)
      end
    end
  end
end
