# frozen_string_literal: true

# Vector-backed chunk for RAG; embedding dimension must match EMBEDDING_DIMENSIONS (default 768).
class KbChunk < ApplicationRecord
  belongs_to :kb_document

  has_neighbors :embedding

  validates :content, presence: true
end
