module Ai
  # Maps UI model keys to Ollama image tags (configurable via ENV).
  class SidebarChatModels
    DEFAULT_KEY = "gemma2_9b"
    ALLOWED_KEYS = %w[gemma2_9b gemma4_26b].freeze

    def self.resolve(key)
      k = key.to_s.presence || DEFAULT_KEY
      raise ArgumentError, "invalid model" unless ALLOWED_KEYS.include?(k)

      case k
      when "gemma2_9b" then ENV.fetch("OLLAMA_MODEL") { "gemma2:9b" }
      when "gemma4_26b" then ENV.fetch("OLLAMA_MODEL_LARGE") { "gemma4:26b" }
      end
    end
  end
end
