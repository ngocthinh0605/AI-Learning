# frozen_string_literal: true

# Merges one session's `raw_analysis` JSON into learning_profiles and child weakness tables.
class LearningProfileUpsertService
  EMA_ALPHA = 0.3

  # @param user [User]
  # @param raw_analysis [Hash]
  # @param session_type [String] e.g. "speaking", "ielts_reading", "mock_test"
  # @param persist_session [Boolean] when true, creates SessionOutcome
  # @return [LearningProfile]
  def self.call(user:, raw_analysis:, session_type:, persist_session: true)
    hash = raw_analysis.is_a?(Hash) ? raw_analysis : raw_analysis.to_unsafe_h
    new(user: user, raw_analysis: hash.deep_stringify_keys, session_type: session_type,
        persist_session: persist_session).call
  end

  def initialize(user:, raw_analysis:, session_type:, persist_session:)
    @user = user
    @raw = raw_analysis
    @session_type = session_type
    @persist_session = persist_session
  end

  def call
    profile = nil
    ActiveRecord::Base.transaction do
      if @persist_session
        SessionOutcome.create!(
          user: @user,
          session_type: @session_type,
          raw_analysis: @raw,
          band_delta_hint: @raw.dig("ielts", "band_delta_hint")
        )
      end

      profile = LearningProfile.find_or_initialize_by(user_id: @user.id)
      profile.last_session_at = Time.current

      merge_vocabulary!(profile)
      merge_grammar!(profile)
      merge_reading!(profile)
      merge_speaking!(profile)
      merge_band!(profile)

      profile.profile_version = profile.profile_version.to_i + 1
      profile.save!
    end
    profile
  end

  private

  def merge_vocabulary!(profile)
    items = Array(@raw.dig("vocabulary", "weak_lemmas"))
    items.each do |item|
      lemma = item["lemma"].to_s.downcase.strip
      next if lemma.blank?

      topic = item["topic"].to_s.presence
      row = profile.vocabulary_weaknesses.find_or_initialize_by(lemma_or_concept: lemma)
      row.topic_tag = topic if topic
      row.miss_count = row.miss_count.to_i + 1
      row.last_seen_at = Time.current
      row.severity_score = Math.log(2 + row.miss_count)
      row.save!
    end
  end

  def merge_grammar!(profile)
    Array(@raw["grammar"]).each do |g|
      cat = g["category"].to_s.strip
      next if cat.blank?

      sub = g["subcategory"].to_s.strip
      frag = g["user_fragment"].presence || g["correction"].presence
      weight = g["count_weight"].to_i
      weight = 1 if weight < 1

      row = profile.grammar_mistakes.find_or_initialize_by(category: cat, subcategory: sub)
      row.occurrence_count = row.occurrence_count.to_i + weight
      row.example_snippet = frag.to_s.truncate(500) if frag
      row.last_seen_at = Time.current
      row.save!
    end
  end

  def merge_reading!(profile)
    weak = Array(@raw.dig("reading", "weak_question_types")).map(&:to_s).uniq
    ielts = @raw.dig("ielts", "band_components", "reading_question_types")
    weak.each do |qtype|
      row = profile.learning_profile_reading_weaknesses.find_or_initialize_by(question_type: qtype)
      proxy = ielts&.dig(qtype, "score_proxy")
      err = proxy.present? ? (1.0 - [proxy.to_f / 9.0, 1.0].min) : 0.5
      row.attempts = row.attempts.to_i + 1
      row.error_rate = ema(row.error_rate.to_f, err)
      row.last_updated_at = Time.current
      row.save!
    end

    # Reason: also fold explicit per-type stats when present.
    Array(@raw.dig("reading", "per_type_stats")).each do |s|
      qtype = s["question_type"].to_s
      next if qtype.blank?

      row = profile.learning_profile_reading_weaknesses.find_or_initialize_by(question_type: qtype)
      wrong = s["wrong"].to_f
      total = s["total"].to_f
      err = total.positive? ? (wrong / total) : 0.0
      row.attempts = row.attempts.to_i + total.to_i
      row.error_rate = ema(row.error_rate.to_f, err)
      row.last_updated_at = Time.current
      row.save!
    end
  end

  def merge_speaking!(profile)
    sp = @raw["speaking"]
    return unless sp.is_a?(Hash)

    %w[fluency grammar pronunciation].each do |key|
      next unless sp.key?(key)

      val = sp[key].to_f
      next if val <= 0

      attr = case key
             when "fluency" then :speaking_fluency
             when "grammar" then :speaking_grammar
             when "pronunciation" then :speaking_pronunciation
             end
      old = profile.send(attr).to_f
      profile.send("#{attr}=", old.positive? ? ema(old, val) : val)
    end
  end

  def merge_band!(profile)
    direct = @raw.dig("ielts", "estimated_band")
    if direct.present?
      b = direct.to_f
      profile.ielts_band_estimate = profile.ielts_band_estimate.present? ? ema(profile.ielts_band_estimate.to_f, b) : b
    end

    # Reason: derive a rough band from speaking means if nothing else set.
    if profile.ielts_band_estimate.blank?
      scores = [profile.speaking_fluency, profile.speaking_grammar, profile.speaking_pronunciation].compact.map(&:to_f)
      profile.ielts_band_estimate = (scores.sum / scores.size).round(1) if scores.size >= 2
    end

    profile.band_confidence = [0.1 + (profile.profile_version.to_i * 0.01), 0.95].min if profile.ielts_band_estimate.present?
  end

  def ema(old, new)
    old + EMA_ALPHA * (new - old)
  end
end
