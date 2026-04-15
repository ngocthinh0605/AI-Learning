Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # Reason: allow multiple frontend dev origins via comma-separated env values.
    # Example: FRONTEND_ORIGIN=http://localhost:3000,http://localhost:5173
    configured_origins = ENV.fetch("FRONTEND_ORIGIN", "http://localhost:3000")
      .split(",")
      .map(&:strip)
      .reject(&:empty?)

    origins(*configured_origins)

    resource "*",
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      expose: ["Authorization"]
  end
end
