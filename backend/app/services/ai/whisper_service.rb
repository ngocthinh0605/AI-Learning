module Ai
  # Handles audio transcription via the local Whisper microservice.
  # The Whisper Python service runs on a separate port and accepts multipart audio uploads.
  class WhisperService
    WHISPER_BASE_URL = ENV.fetch("WHISPER_SERVICE_URL") { "http://localhost:8001" }

    # Transcribes an audio file (ActiveStorage blob or Tempfile).
    # Returns a hash: { text: String, confidence: Float, language: String }
    # Raises Ai::WhisperService::Error on failure.
    def transcribe(audio_file)
      response = HTTParty.post(
        "#{WHISPER_BASE_URL}/transcribe",
        multipart: true,
        body: { audio: audio_file },
        timeout: 60
      )

      raise Error, "Whisper service returned #{response.code}" unless response.success?

      parsed = JSON.parse(response.body)

      {
        text: parsed["text"]&.strip || raise(Error, "No transcript returned"),
        confidence: parsed.fetch("confidence", 1.0).to_f,
        language: parsed.fetch("language", "en")
      }
    rescue HTTParty::Error, JSON::ParserError, Errno::ECONNREFUSED => e
      raise Error, "Whisper service unavailable: #{e.message}"
    end

    class Error < StandardError; end
  end
end
