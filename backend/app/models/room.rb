class Room < ApplicationRecord
  belongs_to :owner, class_name: "User"
  has_many :room_memberships, dependent: :destroy
  has_many :members, through: :room_memberships, source: :user
  has_many :room_messages, dependent: :destroy

  validates :name, presence: true
end
