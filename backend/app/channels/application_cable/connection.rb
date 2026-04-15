module ApplicationCable
  # Authenticates WebSocket connections using the same JWT that the REST API uses.
  # The client sends the token either as a query param (?token=...) or
  # in the X-Auth-Token header so it works in all browser environments.
  class Connection < ActionCable::Connection::Base
    identified_by :current_user

    def connect
      self.current_user = find_verified_user
    end

    private

    def find_verified_user
      token = extract_token
      reject_unauthorized_connection unless token

      payload = decode_jwt(token)
      reject_unauthorized_connection unless payload

      user = User.find_by(id: payload["sub"])
      reject_unauthorized_connection unless user

      # Reason: check the denylist so logged-out tokens can't open WebSockets
      reject_unauthorized_connection if token_revoked?(payload)

      user
    rescue JWT::DecodeError, JWT::ExpiredSignature
      reject_unauthorized_connection
    end

    def extract_token
      request.params[:token] ||
        request.headers["X-Auth-Token"] ||
        request.headers["Authorization"]&.sub(/^Bearer\s+/, "")
    end

    def decode_jwt(token)
      secret = ENV.fetch("DEVISE_JWT_SECRET_KEY")
      decoded = JWT.decode(token, secret, true, algorithm: "HS256")
      decoded.first
    end

    def token_revoked?(payload)
      jti = payload["jti"]
      return false unless jti

      JwtDenylist.exists?(jti: jti)
    end
  end
end
