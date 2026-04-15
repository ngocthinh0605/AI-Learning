class ConversationChannel < ApplicationCable::Channel
  # Rate limit: max 30 conversation turns per minute per connection.
  # Audio chunks are NOT counted — only complete turns (text send / end_of_speech).
  RATE_LIMIT_MAX  = 30
  RATE_LIMIT_SECS = 60

  # Client subscribes with: { channel: "ConversationChannel", conversation_id: "uuid" }
  def subscribed
    conversation = find_conversation(params[:conversation_id])

    if conversation
      @conversation      = conversation
      @rate_count        = 0
      @rate_window_start = Time.current
      @audio_chunks      = []

      stream_from conversation_stream_name
      Rails.logger.info("[CC#subscribed] user=#{current_user.id} conv=#{conversation.id} stream=#{conversation_stream_name}")
      transmit({ type: "subscribed", conversation_id: conversation.id })
    else
      Rails.logger.warn("[CC#subscribed] conversation not found for id=#{params[:conversation_id]}")
      reject
    end
  end

  def unsubscribed
    stop_all_streams
    @audio_chunks = []
  end

  # ─── Text Message ─────────────────────────────────────────────────────────
  # Data format: { "message" => "Hello, can we practice?" }
  def receive(data)
    return unless @conversation
    return unless rate_limit_ok?

    user_text = data["message"].to_s.strip
    return if user_text.empty?

    broadcast_event("user_message_received", { content: user_text })

    user_message = @conversation.messages.create!(role: "user", content: user_text)
    broadcast_event("user_message_saved", MessageSerializer.new(user_message).as_json)

    # Capture instance variables before entering thread (not safe to access inside)
    conversation = @conversation
    user         = current_user
    stream_name  = conversation_stream_name

    Thread.new { stream_ai_response_for(user_text, conversation, user, stream_name) }
  end

  # ─── Audio Message ────────────────────────────────────────────────────────
  # Receives base64 audio chunks from the real-time speaking button.
  # Data format:
  #   { "audio_chunk" => "<base64>" }        – during speech
  #   { "action" => "end_of_speech" }        – when user stops speaking
  def receive_audio(data)
    unless @conversation
      Rails.logger.error("[CC#receive_audio] called but @conversation is nil! user=#{current_user&.id}")
      return
    end

    if data["signal"] == "end_of_speech"
      # Reason: ActionCable reserves "action" for method routing — the frontend
      # sends { signal: "end_of_speech" } to avoid that collision.
      Rails.logger.info("[CC#receive_audio] end_of_speech received — chunks buffered=#{@audio_chunks.size}")
      return unless rate_limit_ok?
      process_audio_turn
    elsif data["audio_chunk"]
      @audio_chunks << data["audio_chunk"]
      @audio_chunks = @audio_chunks.last(1200) if @audio_chunks.size > 1200
      Rails.logger.debug("[CC#receive_audio] chunk ##{@audio_chunks.size} buffered") if (@audio_chunks.size % 10).zero?
    else
      Rails.logger.warn("[CC#receive_audio] unknown data keys: #{data.keys.inspect}")
    end
  end

  private

  # ─── Audio Processing ─────────────────────────────────────────────────────

  def process_audio_turn
    if @audio_chunks.empty?
      Rails.logger.warn("[CC#process_audio_turn] called with 0 chunks — ignoring")
      return
    end

    # Reason: brief sleep lets any last in-flight WebSocket frames sent just
    # before end_of_speech arrive and be appended before we snapshot the buffer.
    sleep 0.15

    chunks        = @audio_chunks.dup
    @audio_chunks = []

    # Capture references before entering the thread — instance variables and
    # ActionCable connection objects are NOT automatically shared across threads.
    conversation = @conversation
    user         = current_user
    stream_name  = conversation_stream_name

    Rails.logger.info("[CC#process_audio_turn] spawning thread — chunks=#{chunks.size} user=#{user.id} conv=#{conversation.id}")

    Thread.new do
      # Reason: unhandled exceptions in Ruby threads are silently swallowed.
      # This rescue ensures ALL errors are logged and surfaced to the client.
      Rails.logger.info("[CC#process_audio_turn/thread] started — broadcasting processing_audio")
      broadcast_to(stream_name, { type: "processing_audio" })

      Rails.logger.info("[CC#process_audio_turn/thread] calling transcribe_audio_data")
      transcription = transcribe_audio_data(chunks, stream_name)

      if transcription.nil?
        Rails.logger.warn("[CC#process_audio_turn/thread] transcription returned nil — aborting")
        next
      end

      # Reason: Whisper can return an empty string when it detects audio but no
      # recognizable speech (silence, background noise, too short a clip, etc.).
      # Saving an empty message would fail DB validation and confuse the UI.
      if transcription[:text].blank?
        Rails.logger.warn("[CC#process_audio_turn/thread] empty transcript — nothing to process")
        broadcast_to(stream_name, { type: "transcript_empty" })
        next
      end

      Rails.logger.info("[CC#process_audio_turn/thread] transcript='#{transcription[:text]}'")

      broadcast_to(stream_name, {
        type:       "transcript_ready",
        text:       transcription[:text],
        confidence: transcription[:confidence]
      })

      broadcast_to(stream_name, {
        type:    "user_message_received",
        content: transcription[:text]
      })

      user_message = conversation.messages.create!(
        role:                "user",
        content:             transcription[:text],
        pronunciation_score: transcription[:confidence]
      )
      broadcast_to(stream_name, {
        type: "user_message_saved",
        **MessageSerializer.new(user_message).as_json
      })

      Rails.logger.info("[CC#process_audio_turn/thread] calling stream_ai_response_for")
      stream_ai_response_for(transcription[:text], conversation, user, stream_name)
      Rails.logger.info("[CC#process_audio_turn/thread] stream_ai_response_for complete")

    rescue => e
      Rails.logger.error("[CC#process_audio_turn/thread] UNCAUGHT #{e.class}: #{e.message}\n#{e.backtrace.first(8).join("\n")}")
      broadcast_to(stream_name, { type: "stream_error", error: "Audio processing failed: #{e.message}" })
    end
  end

  # Reason: using a plain tempfile (not Tempfile.create with block) so the file
  # stays on disk until HTTParty finishes uploading it to Whisper.
  # Tempfile.create with a block deletes the file the moment the block exits,
  # which races with HTTParty's multipart read on slow machines.
  def transcribe_audio_data(base64_chunks, stream_name)
    audio_data = base64_chunks.map { |chunk| Base64.decode64(chunk) }.join

    Rails.logger.info("[ConversationChannel] Assembled #{base64_chunks.size} chunks → #{audio_data.bytesize} bytes")

    # Reason: WebM files must start with the EBML magic bytes 0x1A45DFA3.
    # If the first chunk was dropped or arrived out of order the whole file is invalid.
    unless audio_data.byteslice(0, 4) == "\x1A\x45\xDF\xA3".b
      Rails.logger.error("[ConversationChannel] Audio missing EBML header — first bytes: #{audio_data.byteslice(0, 8).bytes.map { |b| '0x%02X' % b }.join(' ')}")
      broadcast_to(stream_name, { type: "stream_error", error: "Audio recording was incomplete. Please try again." })
      return nil
    end

    tmpfile = Tempfile.new(["audio", ".webm"])
    tmpfile.binmode
    tmpfile.write(audio_data)
    tmpfile.rewind

    result = Ai::WhisperService.new.transcribe(tmpfile)
    result
  rescue Ai::WhisperService::Error => e
    Rails.logger.error("[ConversationChannel#transcribe] #{e.message}")
    broadcast_to(stream_name, { type: "stream_error", error: "Transcription failed: #{e.message}" })
    nil
  ensure
    tmpfile&.close
    tmpfile&.unlink
  end

  # Extracted version of stream_ai_response that takes explicit params
  # instead of relying on instance variables, safe to call from a thread.
  def stream_ai_response_for(user_text, conversation, user, stream_name)
    Rails.logger.info("[CC#stream_ai_response_for] text='#{user_text.truncate(80)}' user=#{user.id}")
    history = conversation.recent_messages(10).map { |m| { role: m.role, content: m.content } }

    broadcast_to(stream_name, { type: "stream_start", assistant_message_id: SecureRandom.uuid })
    Rails.logger.info("[CC#stream_ai_response_for] stream_start broadcast sent")

    full_response = ""

    Ai::GemmaStreamingService.new(
      user_text,
      history,
      english_level: user.english_level
    ).stream do |token|
      full_response += token
      broadcast_to(stream_name, { type: "stream_token", token: token })
    end

    parsed = Ai::GemmaService.parse_response(full_response)

    assistant_message = conversation.messages.create!(
      role:             "assistant",
      content:          parsed[:reply],
      transcript_error: parsed[:correction]
    )

    user.update_streak!
    user.add_xp!(5)

    broadcast_to(stream_name, {
      type:                  "stream_end",
      assistant_message:     MessageSerializer.new(assistant_message).as_json,
      correction:            parsed[:correction],
      vocabulary_suggestion: parsed[:vocabulary]
    })

    save_vocabulary_for(parsed[:vocabulary], user) if parsed[:vocabulary]

  rescue Ai::GemmaStreamingService::Error => e
    broadcast_to(stream_name, { type: "stream_error", error: "AI unavailable: #{e.message}" })
  rescue => e
    Rails.logger.error("[ConversationChannel#stream_ai_response_for] #{e.class}: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    broadcast_to(stream_name, { type: "stream_error", error: "An unexpected error occurred." })
  end

  # ─── Helpers ──────────────────────────────────────────────────────────────

  def find_conversation(conversation_id)
    current_user.conversations.find_by(id: conversation_id)
  end

  def conversation_stream_name
    "conversation_#{@conversation.id}"
  end

  # Used from the main channel fiber — has access to instance variables
  def broadcast_event(type, payload = {})
    broadcast_to(conversation_stream_name, { type: type }.merge(payload))
  end

  # Thread-safe broadcast — takes explicit stream_name, no instance variable access
  def broadcast_to(stream_name, payload)
    ActionCable.server.broadcast(stream_name, payload)
  end

  def save_vocabulary(vocab)
    save_vocabulary_for(vocab, current_user)
  end

  def save_vocabulary_for(vocab, user)
    return unless vocab&.dig(:word).present?

    user.vocabulary_words.find_or_initialize_by(word: vocab[:word].downcase).tap do |vw|
      vw.definition       = vocab[:definition]
      vw.context_sentence = vocab[:context_sentence]
      vw.save
    end
  end

  # Reason: prevent abuse — each subscription tracks its own sliding window.
  # Returns false and broadcasts an error if the limit is exceeded.
  def rate_limit_ok?
    now = Time.current

    if now - @rate_window_start > RATE_LIMIT_SECS
      @rate_count        = 0
      @rate_window_start = now
    end

    @rate_count += 1

    if @rate_count > RATE_LIMIT_MAX
      broadcast_event("stream_error", { error: "Too many messages. Please slow down." })
      return false
    end

    true
  end
end
