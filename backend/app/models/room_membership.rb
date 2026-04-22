class RoomMembership < ApplicationRecord
  ROLES = %w[owner member].freeze

  belongs_to :room
  belongs_to :user

  validates :role, inclusion: { in: ROLES }
  validates :user_id, uniqueness: { scope: :room_id }
end
