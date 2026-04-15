module Api
  module V1
    class VocabularyWordsController < ApplicationController
      before_action :set_word, only: [:show, :update, :destroy, :enrich]

      def index
        words = current_user.vocabulary_words.order(created_at: :desc)
        words = words.due_for_review                   if params[:due_for_review] == "true"
        words = words.by_word_type(params[:word_type]) if params[:word_type].present?
        render json: words, each_serializer: VocabularyWordSerializer
      end

      # Returns a review-ordered batch of due words for a study session.
      # Capped at `limit` (default 20) so the session feels manageable.
      def session
        words = current_user.vocabulary_words
                             .due_for_review
                             .review_order
                             .limit(params.fetch(:limit, 20).to_i.clamp(1, 50))
        render json: {
          words:     words,
          due_total: current_user.vocabulary_words.due_for_review.count
        }, each_serializer: VocabularyWordSerializer
      end

      def show
        render json: @word, serializer: VocabularyWordSerializer
      end

      def create
        word = current_user.vocabulary_words.create!(word_params)
        render json: word, serializer: VocabularyWordSerializer, status: :created
      end

      def update
        if params[:quality].present?
          # SM-2 quality rating (0-5) from the flip-card review session
          @word.mark_reviewed!(quality: params[:quality].to_i)
        elsif params[:review_result].present?
          # Legacy binary support — keeps VocabCard Hard/Got it working
          @word.mark_reviewed_binary!(success: params[:review_result] == "success")
        else
          @word.update!(word_params)
        end
        render json: @word, serializer: VocabularyWordSerializer
      end

      def destroy
        @word.destroy!
        render json: { message: "Word removed from vocabulary" }, status: :ok
      end

      # Calls the local Gemma model to generate word_type, pronunciation (IPA),
      # and a fresh example sentence for the vocabulary word.
      # Also persists word_type onto the record so the badge survives page reloads.
      def enrich
        result = Ai::VocabEnrichService.new(
          @word.word,
          english_level: current_user.english_level
        ).call

        if result[:status] == :success
          if result[:word_type].present? && VocabularyWord::WORD_TYPES.include?(result[:word_type])
            @word.update_column(:word_type, result[:word_type])
          end

          render json: {
            word_type:        result[:word_type],
            pronunciation:    result[:pronunciation],
            example_sentence: result[:example_sentence]
          }
        else
          render json: { error: result[:error] }, status: :service_unavailable
        end
      end

      private

      def set_word
        @word = current_user.vocabulary_words.find(params[:id])
      end

      def word_params
        params.require(:vocabulary_word).permit(:word, :word_type, :definition, :context_sentence, :mastery_level)
      end
    end
  end
end
