# frozen_string_literal: true

module Ai
  # Chunks a KB document, embeds each chunk, and persists rows (RAG ingest).
  class KnowledgeIngestService
    MAX_CHUNK = 1_500

    # @return [Hash] { status: :success, document: KbDocument } or { status: :error, error: String }
    def self.call(kind:, title:, body:, source: nil, metadata: {})
      return { status: :error, error: "body is blank" } if body.to_s.strip.blank?

      doc = nil
      ActiveRecord::Base.transaction do
        doc = KbDocument.create!(
          kind: kind,
          title: title,
          body: body,
          source: source,
          metadata: metadata
        )

        chunks = chunk_text(body.to_s)
        chunks.each_with_index do |content, idx|
          vec = EmbeddingService.embed(content)
          raise StandardError, "Embedding failed for chunk #{idx}" unless vec
          raise StandardError, "dimension mismatch" if vec.size != EmbeddingService::DIMENSIONS

          doc.kb_chunks.create!(
            chunk_index: idx,
            content: content,
            embedding: vec,
            metadata: { "title" => title, "kind" => kind }
          )
        end
      end

      { status: :success, document: doc }
    rescue ActiveRecord::RecordInvalid => e
      { status: :error, error: e.record.errors.full_messages.join(", ") }
    rescue StandardError => e
      { status: :error, error: e.message }
    end

    def self.chunk_text(text)
      parts = text.split(/\n{2,}/).map(&:strip).reject(&:blank?)
      parts = [text] if parts.empty?

      parts.flat_map do |p|
        p.length <= MAX_CHUNK ? [p] : p.scan(/.{1,#{MAX_CHUNK}}/m)
      end
    end
    private_class_method :chunk_text
  end
end
