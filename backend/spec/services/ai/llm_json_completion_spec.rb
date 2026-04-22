require "rails_helper"

RSpec.describe Ai::LlmJsonCompletion do
  describe ".json_from_model" do
    it "parses plain json content" do
      parsed = described_class.json_from_model('{"a":1}')
      expect(parsed["a"]).to eq(1)
    end

    it "parses fenced json content" do
      parsed = described_class.json_from_model("```json\n{\"a\":1}\n```")
      expect(parsed["a"]).to eq(1)
    end

    it "extracts first object from mixed text" do
      parsed = described_class.json_from_model("Here is your plan: {\"summary\":{\"main_focus\":\"reading\"},\"tasks\":[],\"tips\":[]} Thanks")
      expect(parsed["summary"]["main_focus"]).to eq("reading")
    end

    it "returns nil when no json object exists" do
      expect(described_class.json_from_model("No JSON here")).to be_nil
    end
  end
end
