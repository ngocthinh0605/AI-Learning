# frozen_string_literal: true

module Ai
  # Generates a strict JSON daily plan from learner data.
  class DailyLearningPlanService
    SYSTEM = <<~PROMPT.freeze
      You are an AI Learning Planner with cross-skill intelligence.

      Your job is to create a daily plan that improves the user's weaknesses across multiple skills.

      INPUT:
      - Weaknesses
      - Cognitive biases
      - Learning goal
      - Time constraint
      - Cross-skill mapping recommendations

      OBJECTIVE:
      - Map each weakness to multiple skill areas
      - Create a balanced plan across skills
      - Prioritize the most impactful skill

      RULES:
      - At least 2 different task types (for example reading + vocab)
      - Do NOT assign only one skill
      - Limit total tasks to <= 3
      - Total duration must not exceed daily_time_minutes
      - Put the highest-impact task first based on weights

      Allowed task types:
      reading_training, vocab_training, inference_training, paraphrase_training,
      speaking_practice, listening_practice, writing_reasoning, writing_micro_task

      OUTPUT (STRICT JSON):
      {
        "summary": {
          "main_focus": "...",
          "reason": "..."
        },
        "tasks": [
          {
            "type": "reading_training",
            "focus": "matching_heading",
            "duration_minutes": 10,
            "reason": "low accuracy + keyword bias"
          }
        ]
      }

      Focus on thinking-pattern weaknesses, not only raw correctness.
    PROMPT

    def self.call(learning_profile:, latest_mistake_analysis:, learning_goal:, daily_time_minutes:)
      mapping = CrossSkillMappingService.call(latest_mistake_analysis: latest_mistake_analysis)

      user_prompt = <<~PROMPT
        INPUT
        Learning profile:
        #{JSON.generate(learning_profile)}

        Latest mistake analysis:
        #{JSON.generate(latest_mistake_analysis)}

        Learning Goal:
        #{JSON.generate(learning_goal)}

        Cross-skill mapping recommendations:
        #{JSON.generate(mapping)}

        Time available:
        #{daily_time_minutes} minutes

        Generate the DAILY LEARNING PLAN now.
        Ensure the final tasks use at least 2 different task types.
      PROMPT

      LlmJsonCompletion.call(system_prompt: SYSTEM, user_prompt: user_prompt)
    end
  end
end
