# frozen_string_literal: true

class LearningProfileSerializer < ActiveModel::Serializer
  attributes :id, :ielts_band_estimate, :band_confidence,
             :speaking_fluency, :speaking_grammar, :speaking_pronunciation,
             :last_session_at, :profile_version, :metadata

  attribute :vocabulary_weaknesses do
    object.vocabulary_weaknesses.order(severity_score: :desc).limit(30).map do |v|
      { lemma: v.lemma_or_concept, topic: v.topic_tag, miss_count: v.miss_count, severity: v.severity_score }
    end
  end

  attribute :grammar_mistakes do
    object.grammar_mistakes.order(occurrence_count: :desc).limit(30).map do |g|
      {
        category: g.category,
        subcategory: g.subcategory,
        occurrence_count: g.occurrence_count,
        example_snippet: g.example_snippet
      }
    end
  end

  attribute :reading_weaknesses do
    object.learning_profile_reading_weaknesses.order(error_rate: :desc).limit(20).map do |r|
      {
        question_type: r.question_type,
        error_rate: r.error_rate.to_f,
        attempts: r.attempts
      }
    end
  end
end
