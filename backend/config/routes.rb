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
      namespace :pipeline do
        post "analyze_attempt", to: "mistake_analysis#create"
          post "evaluate_improvement", to: "improvement_evaluation#create"
      end

      # Conversation endpoints
      resources :conversations, only: [:index, :show, :create, :destroy] do
        resources :messages, only: [:index, :create]
      end
      resources :rooms, only: [:index, :show, :create] do
        member do
          post :join
          delete :leave
          delete "members/:user_id", to: "rooms#remove_member"
        end
        resources :messages, only: [:create, :destroy], controller: "room_messages"
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

      # Sidebar quick Q&A (streams NDJSON; model keys in Ai::SidebarChatModels)
      post "sidebar_chat", to: "sidebar_chats#create"

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
        post   "listening/passages",                  to: "listening#generate"
        post   "listening/submit",                    to: "listening#submit"
        get    "listening/attempts",                  to: "listening#attempts"
        post   "writing/grade",                       to: "writing#grade"
        get    "writing/attempts",                    to: "writing#attempts"
      end

      # User profile
      get "profile", to: "users#profile"
      patch "profile", to: "users#update_profile"

      # Learning profile (memory core), session logging, AI pipelines
      get  "learning_profile", to: "learning_profiles#show"
      get  "learning_progress", to: "learning_progress#show"
      get  "daily_learning_plan", to: "daily_learning_plan#index"
      post "daily_learning_plan", to: "daily_learning_plan#create"
      post "session_outcomes", to: "session_outcomes#create"
      post "speaking_feedback", to: "speaking_feedback#create"
      get  "speaking_attempts", to: "speaking_attempts#index"
      post "rag/retrieve", to: "rag#retrieve"
      post "rag/ingest", to: "rag#ingest"
      post "adaptive_content", to: "adaptive_contents#create"
      post "learning_insights", to: "learning_insights#create"
      post "tutor_chat", to: "tutor_chats#create"
    end
  end

  # ActionCable WebSocket endpoint
  mount ActionCable.server => "/cable"

  # Health check
  get "up", to: proc { [200, {}, ["OK"]] }
end
