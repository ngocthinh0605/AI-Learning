module AuthHelpers
  # Returns a JWT Authorization header for the given user
  def auth_headers_for(user)
    post "/api/v1/auth/login", params: { user: { email: user.email, password: user.password } }, as: :json
    token = response.headers["Authorization"]
    { "Authorization" => token }
  end
end

RSpec.configure do |config|
  config.include AuthHelpers, type: :request
end
