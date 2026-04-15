class VocabularyWord < ApplicationRecord
  belongs_to :user

  WORD_TYPES = %w[noun verb adjective adverb pronoun preposition conjunction interjection phrase].freeze

  validates :word,          presence: true, uniqueness: { scope: :user_id, case_sensitive: false }
  validates :mastery_level, inclusion: { in: 1..5 }
  validates :word_type,     inclusion: { in: WORD_TYPES }, allow_blank: true

  # ─── SM-2 Spaced Repetition ─────────────────────────────────────────────────
  #
  # quality: integer 0-5 rating of how well the user recalled the word
  #   0 = complete blackout
  #   1 = incorrect, but recognised when shown
  #   2 = incorrect, but easy to recall after seeing
  #   3 = correct with significant difficulty
  #   4 = correct with minor hesitation
  #   5 = perfect, instant recall
  #
  # Interval formula:
  #   After 1st success:  1 day
  #   After 2nd success:  6 days
  #   Subsequent:         previous_interval × ease_factor  (rounded, min 1)
  #
  # Ease factor formula (SuperMemo 2):
  #   EF = EF + (0.1 - (5 - q) × (0.08 + (5 - q) × 0.02))
  #   EF is clamped to a minimum of 1.3
  #
  # Reason: using SM-2 rather than fixed intervals because it adapts per word —
  # easy words grow their review gap quickly while hard words stay frequent.

  def mark_reviewed!(quality:)
    q = quality.to_i.clamp(0, 5)

    self.review_count    += 1
    self.last_reviewed_at = Time.current

    if q >= 3
      # Successful recall — advance mastery and extend the interval
      self.consecutive_correct += 1

      new_interval = case consecutive_correct
                     when 1 then 1
                     when 2 then 6
                     else
                       # Compute days since last review as the previous interval
                       prev_days = last_reviewed_at ? ((Time.current - last_reviewed_at) / 1.day).round : 1
                       [(prev_days * ease_factor).round, 1].max
                     end

      self.mastery_level  = [mastery_level + 1, 5].min
    else
      # Failed recall — reset streak and schedule for tomorrow
      self.consecutive_correct = 0
      new_interval             = 1
      self.mastery_level       = [mastery_level - 1, 1].max
    end

    # Adjust ease factor (clamped to minimum 1.3)
    self.ease_factor = [
      1.3,
      ease_factor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
    ].max

    self.next_review_at = new_interval.days.from_now
    save!
  end

  # Legacy binary helper — keeps VocabCard's Hard / Got it working unchanged
  def mark_reviewed_binary!(success:)
    mark_reviewed!(quality: success ? 4 : 1)
  end

  # ─── Scopes ──────────────────────────────────────────────────────────────────
  scope :due_for_review, -> { where("next_review_at <= ?", Time.current).or(where(next_review_at: nil)) }
  scope :by_word_type,   ->(type) { where(word_type: type) }
  # Most urgent first: overdue words before newer ones
  scope :review_order,   -> { order(Arel.sql("next_review_at ASC NULLS FIRST")) }
end
