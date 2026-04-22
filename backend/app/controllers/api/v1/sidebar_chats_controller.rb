module Api
  module V1
    # NDJSON stream of { "token": "..." } lines, then { "done": true }.
    # Used by the layout sidebar quick Q&A (no persisted conversation).
    class SidebarChatsController < ApplicationController
      # Reason: default wrap_parameters nests JSON under :sidebar_chat, which duplicates
      # keys and logs "Unpermitted parameter: :sidebar_chat" on permit — same pattern as
      # Api::V1::Ielts::ReadingController.
      wrap_parameters false

      def create
        message = sidebar_params[:message].to_s.strip
        return render json: { error: "message is required" }, status: :bad_request if message.empty?

        ollama_model = Ai::SidebarChatModels.resolve(sidebar_params[:model])
        history = normalize_history(sidebar_params[:messages])

        response.headers["X-Accel-Buffering"] = "no"

        render body: ndjson_enumerator(message, ollama_model, history),
               content_type: "application/x-ndjson"
      rescue ArgumentError
        render json: { error: "invalid model" }, status: :bad_request
      end

      private

      def sidebar_params
        params.permit(:message, :model, messages: %i[role content])
      end

      def normalize_history(raw)
        Array(raw).last(20).filter_map do |m|
          role = (m[:role] || m["role"]).to_s
          content = (m[:content] || m["content"]).to_s.strip
          next if content.blank?
          next unless %w[user assistant].include?(role)

          { role: role, content: content }
        end
      end

      def ndjson_enumerator(message, ollama_model, history)
        Enumerator.new do |yielder|
          service = Ai::GemmaStreamingService.new(
            message,
            history,
            english_level: current_user.english_level,
            model: ollama_model,
            assistant_mode: :sidebar_qa
          )
          service.stream do |token|
            yielder << "#{JSON.generate({ token: token })}\n"
          end
          yielder << "#{JSON.generate({ done: true })}\n"
        rescue Ai::GemmaStreamingService::Error => e
          yielder << "#{JSON.generate({ error: e.message })}\n"
        end
      end
    end
  end
end
