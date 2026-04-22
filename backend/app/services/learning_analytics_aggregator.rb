# frozen_string_literal: true

# Builds a large JSON blob for Ai::AnalyticsInsightService from DB state.
class LearningAnalyticsAggregator
  def self.for_user(user)
    lp = user.learning_profile
    {
      learning_profile: lp ? LearningProfileSerializer.new(lp).serializable_hash : {},
      ielts_reading_legacy: user.ielts_weakness_profile&.attributes,
      session_outcomes: user.session_outcomes.order(created_at: :desc).limit(50).map do |s|
        {
          session_type: s.session_type,
          created_at: s.created_at,
          raw_analysis: s.raw_analysis
        }
      end
    }
  end
end
