require "rails_helper"

RSpec.describe IeltsReadingPassage, type: :model do
  subject(:passage) { build(:ielts_reading_passage) }

  describe "validations" do
    it { should validate_presence_of(:title) }
    it { should validate_presence_of(:body) }
    it { should validate_inclusion_of(:difficulty).in_array(IeltsReadingPassage::DIFFICULTIES) }
    it { should validate_inclusion_of(:passage_type).in_array(IeltsReadingPassage::PASSAGE_TYPES) }

    it "is invalid without questions" do
      passage.questions = []
      expect(passage).not_to be_valid
    end

    it "is valid with all required attributes" do
      expect(passage).to be_valid
    end
  end

  describe "associations" do
    it { should belong_to(:user) }
    it { should have_many(:ielts_reading_attempts).dependent(:destroy) }
  end

  describe "#question_count" do
    it "returns the number of questions in the jsonb array" do
      passage.questions = [{ "id" => 1 }, { "id" => 2 }, { "id" => 3 }]
      expect(passage.question_count).to eq(3)
    end

    it "returns 0 when questions array is empty" do
      passage.questions = [{ "id" => 1 }]
      passage.save!
      passage.update_column(:questions, [])
      expect(passage.reload.question_count).to eq(0)
    end
  end
end
