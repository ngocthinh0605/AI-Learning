Rails.application.config.action_cable.allowed_request_origins = [
  ENV.fetch("FRONTEND_ORIGIN") { "http://localhost:3000" },
  /http:\/\/localhost:\d+/
]

Rails.application.config.action_cable.url = "/cable"
