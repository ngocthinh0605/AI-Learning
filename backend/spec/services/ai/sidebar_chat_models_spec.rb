require "rails_helper"

RSpec.describe Ai::SidebarChatModels do
  describe ".resolve" do
    it "returns a tag string for gemma2_9b" do
      tag = described_class.resolve("gemma2_9b")
      expect(tag).to be_a(String)
      expect(tag).not_to be_empty
    end

    it "returns a tag string for gemma4_26b" do
      tag = described_class.resolve("gemma4_26b")
      expect(tag).to be_a(String)
      expect(tag).not_to be_empty
    end

    it "defaults when key is blank" do
      expect(described_class.resolve(nil)).to eq(described_class.resolve("gemma2_9b"))
    end

    it "raises on unknown key" do
      expect { described_class.resolve("nope") }.to raise_error(ArgumentError)
    end
  end
end
