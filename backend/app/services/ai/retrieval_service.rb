# frozen_string_literal: true

module Ai
  # User question → embedding → nearest kb_chunks (cosine via neighbor).
  class RetrievalService
    # @param query_text [String]
    # @param top_k [Integer]
    # @param kinds [Array<String>, nil] filter kb_documents.kind
    # @return [Array<Hash>] { chunk:, score:, document: }
    def self.call(query_text:, top_k: 5, kinds: nil)
      vec = EmbeddingService.embed(query_text)
      return [] if vec.blank?

      scope = KbChunk.includes(:kb_document)
      scope = scope.joins(:kb_document).where(kb_documents: { kind: Array(kinds) }) if kinds.present?

      neighbors = scope.nearest_neighbors(:embedding, vec, distance: "cosine").limit(top_k)

      neighbors.map do |chunk|
        {
          chunk: chunk,
          score: chunk.try(:neighbor_distance),
          document: chunk.kb_document
        }
      end
    rescue StandardError => e
      Rails.logger.warn("[RetrievalService] #{e.class}: #{e.message}")
      []
    end
  end
end
