class User < ApplicationRecord
  devise :database_authenticatable,
         :registerable,
         :recoverable,
         :validatable,
         :jwt_authenticatable,
         jwt_revocation_strategy: JwtDenylist

  has_many :conversations, dependent: :destroy
  has_many :vocabulary_words, dependent: :destroy
  has_many :ielts_reading_passages,  dependent: :destroy
  has_many :ielts_reading_attempts,  dependent: :destroy
  has_many :ielts_user_answers,      dependent: :destroy
  has_one  :ielts_weakness_profile,  dependent: :destroy

  ENGLISH_LEVELS = %w[A1 A2 B1 B2 C1 C2].freeze

  validates :english_level, inclusion: { in: ENGLISH_LEVELS }
  validates :xp_points, numericality: { greater_than_or_equal_to: 0 }
  validates :streak_days, numericality: { greater_than_or_equal_to: 0 }

  # Updates the daily streak based on practice dates.
  # Streak resets to 1 if the user skipped a day.
  def update_streak!
    today = Date.today
    return if last_practice_date == today

    if last_practice_date == today - 1
      increment!(:streak_days)
    else
      update!(streak_days: 1)
    end

    update!(last_practice_date: today)
  end

  def add_xp!(amount)
    increment!(:xp_points, amount)
  end
end
