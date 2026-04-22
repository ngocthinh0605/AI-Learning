require "rails_helper"

RSpec.describe DailyLearningPlanValidator do
  let(:valid_plan) do
    {
      "summary" => { "main_focus" => "inference", "reason" => "keyword bias and inference misses" },
      "tasks" => [
        { "type" => "inference_training", "focus" => "not given", "duration_minutes" => 15, "reason" => "inference failure pattern" },
        { "type" => "reading_training", "focus" => "matching heading", "duration_minutes" => 9, "reason" => "keyword matching bias persists" },
        { "type" => "vocab_training", "focus" => "academic words", "duration_minutes" => 6, "reason" => "surface vocabulary support" }
      ]
    }
  end

  it "accepts valid plan" do
    result = described_class.call(plan: valid_plan, daily_time_minutes: 30)
    expect(result[:valid]).to eq(true)
  end

  it "rejects plans with too many tasks" do
    plan = valid_plan.merge("tasks" => valid_plan["tasks"] + [valid_plan["tasks"].first])
    result = described_class.call(plan: plan, daily_time_minutes: 60)
    expect(result[:valid]).to eq(false)
  end

  it "rejects plans with unsupported task type" do
    plan = Marshal.load(Marshal.dump(valid_plan))
    plan["tasks"][0]["type"] = "grammar_training"
    result = described_class.call(plan: plan, daily_time_minutes: 30)
    expect(result[:valid]).to eq(false)
  end

  it "rejects plans that use only one task type" do
    plan = Marshal.load(Marshal.dump(valid_plan))
    plan["tasks"].each { |task| task["type"] = "reading_training" }
    result = described_class.call(plan: plan, daily_time_minutes: 30)
    expect(result[:valid]).to eq(false)
  end

  it "rejects plans with legacy tips key for strict schema" do
    plan = Marshal.load(Marshal.dump(valid_plan))
    plan["tips"] = ["extra not allowed"]
    result = described_class.call(plan: plan, daily_time_minutes: 30)
    expect(result[:valid]).to eq(false)
  end

  it "rejects summary with missing required fields" do
    plan = Marshal.load(Marshal.dump(valid_plan))
    plan["summary"].delete("reason")
    result = described_class.call(plan: plan, daily_time_minutes: 30)
    expect(result[:valid]).to eq(false)
  end

  it "rejects arbitrary extra top-level keys for strict schema" do
    plan = Marshal.load(Marshal.dump(valid_plan))
    plan["extra"] = "not allowed"
    result = described_class.call(plan: plan, daily_time_minutes: 30)
    expect(result[:valid]).to eq(false)
  end
end
