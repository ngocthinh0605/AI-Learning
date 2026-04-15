module Api
  module V1
    # Handles the combined transcription + AI response pipeline for voice input.
    # Separated from MessagesController to keep audio processing logic isolated.
    class AiController < ApplicationController
      # POST /api/v1/ai/transcribe_and_respond
      # Accepts a multipart audio file, transcribes it with Whisper,
      # then sends the transcript to Gemma, and saves both messages.
      def transcribe_and_respond
        conversation = current_user.conversations.find(params[:conversation_id])
        audio_file = params.require(:audio)

        transcript_result = transcribe_audio(audio_file)
        user_text = transcript_result[:text]

        # Build history before creating the user message to avoid duplication
        history = conversation.recent_messages(10).map { |m| { role: m.role, content: m.content } }

        # Call the service — returns { status:, raw: } or { status:, error: }
        ai_result = Ai::GemmaService.new(user_text, history, english_level: current_user.english_level).call

        return render json: { error: ai_result[:error] }, status: :service_unavailable unless ai_result[:status] == :success

        parsed = Ai::GemmaService.parse_response(ai_result[:raw])

        user_message = conversation.messages.create!(
          role: "user",
          content: user_text,
          pronunciation_score: transcript_result[:confidence]
        )

        assistant_message = save_assistant_response(conversation, parsed)

        save_vocabulary_suggestion(parsed[:vocabulary]) if parsed[:vocabulary]

        current_user.update_streak!
        current_user.add_xp!(10) # Voice practice earns more XP than text

        render json: {
          transcript:          user_text,
          pronunciation_score: transcript_result[:confidence],
          user_message:        MessageSerializer.new(user_message).as_json,
          assistant_message:   MessageSerializer.new(assistant_message).as_json,
          vocabulary_suggestion: parsed[:vocabulary],
          correction:          parsed[:correction]
        }, status: :created
      rescue Ai::WhisperService::Error => e
        render json: { error: "Transcription failed: #{e.message}" }, status: :service_unavailable
      end

      private

      def transcribe_audio(audio_file)
        Ai::WhisperService.new.transcribe(audio_file)
      end

      def save_assistant_response(conversation, ai_response)
        conversation.messages.create!(
          role: "assistant",
          content: ai_response[:reply],
          transcript_error: ai_response[:correction]
        )
      end

      # Saves vocabulary suggestion if user hasn't already saved this word
      def save_vocabulary_suggestion(vocab)
        return unless vocab && vocab[:word].present?

        current_user.vocabulary_words.find_or_initialize_by(
          word: vocab[:word].downcase
        ).tap do |vw|
          vw.definition = vocab[:definition]
          vw.context_sentence = vocab[:context_sentence]
          vw.save
        end
      end
    end
  end
end
