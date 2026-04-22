module Ai
  # Streams Gemma responses token by token using Ollama's stream: true mode.
  # Yields each text chunk to a block as it arrives from the HTTP connection.
  #
  # Usage:
  #   Ai::GemmaStreamingService.new(text, history, english_level: "B1").stream do |token|
  #     ActionCable.server.broadcast(stream_name, { token: token })
  #   end
  #
  # Optional +model:+ overrides the default Ollama tag (e.g. sidebar quick-chat).
  # Optional +assistant_mode:+ :sidebar_qa uses a shorter system prompt for Q&A.
  class GemmaStreamingService
    OLLAMA_BASE_URL = ENV.fetch("OLLAMA_BASE_URL") { "http://localhost:11434" }
    MODEL = ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }

    def initialize(user_message, history = [], english_level: "B1", model: nil, assistant_mode: :tutor)
      @user_message = user_message
      @conversation_history = history
      @english_level = english_level
      @ollama_model = model
      @assistant_mode = assistant_mode
    end

    # Opens a persistent HTTP connection to Ollama and yields tokens as they arrive.
    # Raises GemmaStreamingService::Error on connection or parse failure.
    def stream(&block)
      uri = URI.parse("#{OLLAMA_BASE_URL}/api/chat")

      Net::HTTP.start(uri.host, uri.port, read_timeout: 120) do |http|
        request = Net::HTTP::Post.new(uri.path, "Content-Type" => "application/json")
        request.body = build_payload.to_json

        http.request(request) do |response|
          raise Error, "Ollama returned #{response.code}" unless response.is_a?(Net::HTTPSuccess)

          # Reason: Ollama with stream:true sends one JSON object per line (NDJSON).
          # We read the body in chunks and split on newlines to parse each object.
          buffer = ""
          response.read_body do |chunk|
            buffer += chunk
            while (line = buffer.slice!(/\A.*\n/))
              token = parse_token(line.strip)
              block.call(token) if token && !token.empty?
            end
          end
        end
      end
    rescue Errno::ECONNREFUSED, SocketError => e
      raise Error, "Ollama connection failed: #{e.message}"
    rescue => e
      raise Error, "Streaming error: #{e.message}"
    end

    class Error < StandardError; end

    private

    def build_payload
      messages = [{ role: "system", content: system_prompt }]
      messages += @conversation_history.map { |m| { role: m[:role], content: m[:content] } }
      messages << { role: "user", content: @user_message }

      # stream: true — Ollama sends one JSON line per token instead of waiting for full response
      { model: (@ollama_model.presence || MODEL), messages: messages, stream: true }
    end

    # Each streamed line is a JSON object like:
    # {"model":"gemma2:9b","message":{"role":"assistant","content":"Hello"},"done":false}
    def parse_token(line)
      return nil if line.empty?

      data = JSON.parse(line)
      data.dig("message", "content")
    rescue JSON::ParserError
      nil
    end

    def system_prompt
      return sidebar_qa_prompt if @assistant_mode == :sidebar_qa

      <<~PROMPT.strip
        You are a professional English Language Tutor named "Aria". Your goals are to:
        1. Hold natural, engaging conversations in English.
        2. Match your vocabulary and complexity to the student's level (#{@english_level}).
        3. If the student makes a significant grammatical error, correct them
           inline using the format [Correction: ...], then continue naturally.
        4. Introduce 1-2 new vocabulary words per conversation when appropriate.
        5. Be encouraging, patient, and culturally sensitive.

        After your main response, append only when relevant:
        [CORRECTION]: <brief correction note>
        [VOCABULARY]: <word> | <definition> | <example sentence>
      PROMPT
    end

    def sidebar_qa_prompt
      <<~PROMPT.strip
        You are a concise English-learning assistant. Answer the student's questions clearly.
        Adapt explanations to CEFR level #{@english_level}. Prefer short paragraphs unless they ask for detail.
      PROMPT
    end
  end
end
