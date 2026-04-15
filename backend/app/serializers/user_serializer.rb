class UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :display_name, :english_level,
             :xp_points, :streak_days, :last_practice_date, :created_at
end
