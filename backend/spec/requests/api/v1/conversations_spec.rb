require "rails_helper"

RSpec.describe "Api::V1::Conversations", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "GET /api/v1/conversations" do
    context "when authenticated" do
      it "returns a list of the user's conversations" do
        create_list(:conversation, 3, user: user)
        get "/api/v1/conversations", headers: headers
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body).length).to eq(3)
      end

      it "does not return other users' conversations" do
        other_user = create(:user)
        create(:conversation, user: other_user)
        get "/api/v1/conversations", headers: headers
        expect(JSON.parse(response.body).length).to eq(0)
      end
    end

    context "when unauthenticated" do
      it "returns 401" do
        get "/api/v1/conversations"
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end

  describe "POST /api/v1/conversations" do
    it "creates a new conversation" do
      post "/api/v1/conversations",
        headers: headers,
        params: { conversation: { title: "Ordering Coffee", topic: "Travel" } },
        as: :json

      expect(response).to have_http_status(:created)
      expect(JSON.parse(response.body)["title"]).to eq("Ordering Coffee")
    end

    it "returns 422 when title is missing" do
      post "/api/v1/conversations",
        headers: headers,
        params: { conversation: { title: "" } },
        as: :json

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "DELETE /api/v1/conversations/:id" do
    it "deletes the conversation" do
      conversation = create(:conversation, user: user)
      delete "/api/v1/conversations/#{conversation.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(Conversation.find_by(id: conversation.id)).to be_nil
    end

    it "returns 404 when conversation belongs to another user" do
      other_conversation = create(:conversation)
      delete "/api/v1/conversations/#{other_conversation.id}", headers: headers
      expect(response).to have_http_status(:not_found)
    end
  end
end
