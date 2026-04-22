# frozen_string_literal: true

module Api
  module V1
    class RagController < ApplicationController
      wrap_parameters false

      # POST /api/v1/rag/retrieve
      def retrieve
        query = params.require(:query).to_s.strip
        return render json: { error: "query is required" }, status: :bad_request if query.blank?

        top_k = (params[:top_k] || 5).to_i.clamp(1, 20)
        kinds = params[:kinds].presence

        hits = Ai::RetrievalService.call(query_text: query, top_k: top_k, kinds: kinds)

        render json: {
          context_block: Ai::RagPromptBuilder.context_block(hits),
          hits: hits.map { |h| serialize_hit(h) }
        }
      end

      # POST /api/v1/rag/ingest
      # Curated KB upload (same auth as app; restrict in production if needed).
      def ingest
        meta = params[:metadata].present? ? params[:metadata].to_unsafe_h : {}

        result = Ai::KnowledgeIngestService.call(
          kind: params.require(:kind),
          title: params[:title],
          body: params.require(:body),
          source: params[:source],
          metadata: meta
        )

        if result[:status] == :success
          render json: { id: result[:document].id, kind: result[:document].kind }, status: :created
        else
          render json: { error: result[:error] }, status: :unprocessable_entity
        end
      end

      private

      def serialize_hit(h)
        chunk = h[:chunk]
        doc = h[:document]
        {
          content: chunk.content.truncate(800),
          kind: doc.kind,
          title: doc.title,
          distance: h[:score]
        }
      end
    end
  end
end
