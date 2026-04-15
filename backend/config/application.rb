require_relative "boot"
require "rails/all"

Bundler.require(*Rails.groups)

module SpeakingAi
  class Application < Rails::Application
    config.load_defaults 7.1

    # API-only mode — no browser sessions or cookies needed
    config.api_only = true

    # Auto-load lib directory
    config.autoload_paths << Rails.root.join("lib")

    config.time_zone = "UTC"
  end
end
