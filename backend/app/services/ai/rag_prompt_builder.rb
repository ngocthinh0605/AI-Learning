# frozen_string_literal: true

module Ai
  # Formats retrieval hits into a single context block for LLM injection.
  class RagPromptBuilder
    def self.context_block(chunks_with_docs)
      Array(chunks_with_docs).map do |item|
        chunk = item[:chunk] || item["chunk"]
        doc = item[:document] || item["document"]
        next unless chunk && doc

        "[#{doc.kind}] #{doc.title}\n#{chunk.content}"
      end.compact.join("\n---\n")
    end
  end
end
