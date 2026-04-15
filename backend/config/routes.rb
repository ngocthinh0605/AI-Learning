Rails.application.routes.draw do
  # Devise routes with JWT — uses :json format exclusively
  devise_for :users,
    path: "api/v1/auth",
    path_names: {
      sign_in:  "login",
      sign_out: "logout",
      registration: "register"
    },
    controllers: {
      sessions:      "api/v1/auth/sessions",
      registrations: "api/v1/auth/registrations"
    },
    defaults: { format: :json }

  namespace :api do
    namespace :v1 do
      # Conversation endpoints
      resources :conversations, only: [:index, :show, :create, :destroy] do
        resources :messages, only: [:index, :create]
      end

      # Vocabulary endpoints
      resources :vocabulary_words, only: [:index, :show, :create, :update, :destroy] do
        collection do
          get :session  # returns a batch of due words for a review session
        end
        member do
          post :enrich  # AI-generated pronunciation + example sentence
        end
      end

      # AI pipeline endpoint (transcription + LLM response in one call)
      post "ai/transcribe_and_respond", to: "ai#transcribe_and_respond"

      # IELTS Reading endpoints
      # Reason: using flat paths inside namespace :ielts so URLs are
      # /ielts/reading/... while the controller stays at Api::V1::Ielts::ReadingController.
      namespace :ielts do
        post   "reading/passages",                    to: "reading#generate"
        post   "reading/passages/:id/submit",         to: "reading#submit"
        get    "reading/attempts",                    to: "reading#attempts"
        get    "reading/attempts/:id",                to: "reading#attempt"
        get    "reading/attempts/:id/review",         to: "reading#review"
        get    "reading/weakness",                    to: "reading#weakness"
        get    "reading/training",                    to: "reading#training_exercises"
      end

      # User profile
      get "profile", to: "users#profile"
      patch "profile", to: "users#update_profile"
    end
  end

  # ActionCable WebSocket endpoint
  mount ActionCable.server => "/cable"

  # Health check
  get "up", to: proc { [200, {}, ["OK"]] }
end
