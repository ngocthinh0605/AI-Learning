module Api
  module V1
    class MessagesController < ApplicationController
      before_action :set_conversation

      def index
        messages = @conversation.messages.chronological
        render json: messages, each_serializer: MessageSerializer
      end

      # Creates a text message and triggers the AI response pipeline.
      # This endpoint is for text-only input; audio uses the ai#transcribe_and_respond endpoint.
      def create
        user_text = message_params[:content]

        # Build history before saving the new message so it isn't included twice
        history = @conversation.recent_messages(10).map { |m| { role: m.role, content: m.content } }

        # Call the service — returns { status:, raw: } or { status:, error: }
        ai_result = Ai::GemmaService.new(user_text, history, english_level: current_user.english_level).call

        if ai_result[:status] == :success
          parsed = Ai::GemmaService.parse_response(ai_result[:raw])

          user_message      = @conversation.messages.create!(role: "user", content: user_text)
          assistant_message = save_assistant_response(@conversation, parsed)

          current_user.update_streak!
          current_user.add_xp!(5)

          render json: {
            user_message:         MessageSerializer.new(user_message).as_json,
            assistant_message:    MessageSerializer.new(assistant_message).as_json,
            vocabulary_suggestion: parsed[:vocabulary]
          }, status: :created
        else
          render json: { error: ai_result[:error] }, status: :service_unavailable
        end
      end

      private

      def set_conversation
        @conversation = current_user.conversations.find(params[:conversation_id])
      end

      def message_params
        params.require(:message).permit(:content)
      end

      def save_assistant_response(conversation, ai_response)
        conversation.messages.create!(
          role: "assistant",
          content: ai_response[:reply],
          transcript_error: ai_response[:correction]
        )
      end
    end
  end
end
