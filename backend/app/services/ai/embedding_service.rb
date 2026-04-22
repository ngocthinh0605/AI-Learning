# frozen_string_literal: true

module Ai
  # Calls Ollama /api/embeddings for local embedding vectors (pgvector-compatible).
  class EmbeddingService
    include HTTParty

    base_uri ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }

    MODEL = ENV.fetch("OLLAMA_EMBEDDING_MODEL") { "nomic-embed-text" }
    DIMENSIONS = ENV.fetch("OLLAMA_EMBEDDING_DIMENSIONS", "768").to_i

    # @param text [String]
    # @return [Array<Float>, nil]
    def self.embed(text)
      response = post(
        "/api/embeddings",
        body: { model: MODEL, prompt: text.to_s }.to_json,
        headers: { "Content-Type" => "application/json" },
        timeout: 60
      )
      return nil unless response.success?

      embedding = response.parsed_response["embedding"]
      return nil unless embedding.is_a?(Array)

      embedding.map(&:to_f)
    rescue StandardError
      nil
    end
  end
end
