class IeltsWeaknessProfileSerializer < ActiveModel::Serializer
  attributes :id, :weakness_by_type, :error_type_counts,
             :recommended_difficulty, :total_attempts,
             :weakest_type, :ranked_weaknesses, :last_updated_at
end
