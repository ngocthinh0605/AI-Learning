require "rails_helper"

RSpec.describe "Api::V1::Rooms", type: :request do
  let(:user) { create(:user) }
  let(:headers) { auth_headers_for(user) }

  describe "POST /api/v1/rooms" do
    it "creates room and owner membership" do
      post "/api/v1/rooms", headers: headers, params: { room: { name: "IELTS Club" } }, as: :json
      expect(response).to have_http_status(:created)
      room = Room.last
      expect(room.name).to eq("IELTS Club")
      expect(room.room_memberships.find_by(user_id: user.id)&.role).to eq("owner")
    end
  end

  describe "POST /api/v1/rooms/:id/join" do
    it "joins a room as member" do
      room = create(:room)
      post "/api/v1/rooms/#{room.id}/join", headers: headers
      expect(response).to have_http_status(:ok)
      expect(room.room_memberships.find_by(user_id: user.id)).to be_present
    end
  end

  describe "DELETE /api/v1/rooms/:id/members/:user_id" do
    it "allows owner to remove member" do
      room = create(:room, owner: user)
      create(:room_membership, room: room, user: user, role: "owner")
      member = create(:user)
      create(:room_membership, room: room, user: member, role: "member")

      delete "/api/v1/rooms/#{room.id}/members/#{member.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(room.room_memberships.find_by(user_id: member.id)).to be_nil
    end

    it "blocks non-owner from removing members" do
      room = create(:room)
      create(:room_membership, room: room, user: user, role: "member")
      member = create(:user)
      create(:room_membership, room: room, user: member, role: "member")
      delete "/api/v1/rooms/#{room.id}/members/#{member.id}", headers: headers
      expect(response).to have_http_status(:forbidden)
      expect(JSON.parse(response.body)["error_code"]).to eq("owner_required")
    end
  end

  describe "DELETE /api/v1/rooms/:id/leave" do
    it "prevents owner leaving room" do
      room = create(:room, owner: user)
      create(:room_membership, room: room, user: user, role: "owner")
      delete "/api/v1/rooms/#{room.id}/leave", headers: headers
      expect(response).to have_http_status(:forbidden)
      expect(JSON.parse(response.body)["error_code"]).to eq("owner_cannot_leave")
    end

    it "returns forbidden for non-members trying to leave" do
      room = create(:room)
      delete "/api/v1/rooms/#{room.id}/leave", headers: headers
      expect(response).to have_http_status(:forbidden)
      expect(JSON.parse(response.body)["error_code"]).to eq("room_membership_required")
    end
  end

  describe "POST /api/v1/rooms/:room_id/messages" do
    it "requires membership before posting" do
      room = create(:room)
      post "/api/v1/rooms/#{room.id}/messages", headers: headers, params: { message: { content: "Hello" } }, as: :json
      expect(response).to have_http_status(:forbidden)
    end

    it "posts message when joined" do
      room = create(:room)
      create(:room_membership, room: room, user: user)
      expect(ActionCable.server).to receive(:broadcast).with("room_#{room.id}", hash_including(type: "room_message"))
      post "/api/v1/rooms/#{room.id}/messages", headers: headers, params: { message: { content: "Hello" } }, as: :json
      expect(response).to have_http_status(:created)
      expect(room.room_messages.count).to eq(1)
    end

    it "rejects empty content" do
      room = create(:room)
      create(:room_membership, room: room, user: user)
      post "/api/v1/rooms/#{room.id}/messages", headers: headers, params: { message: { content: " " } }, as: :json
      expect(response).to have_http_status(:bad_request)
      expect(JSON.parse(response.body)["error_code"]).to eq("invalid_message")
    end
  end

  describe "DELETE /api/v1/rooms/:room_id/messages/:id" do
    it "allows owner to delete a room message" do
      room = create(:room, owner: user)
      create(:room_membership, room: room, user: user, role: "owner")
      msg = create(:room_message, room: room)
      delete "/api/v1/rooms/#{room.id}/messages/#{msg.id}", headers: headers
      expect(response).to have_http_status(:ok)
      expect(RoomMessage.find_by(id: msg.id)).to be_nil
    end

    it "forbids member from deleting room message" do
      room = create(:room)
      create(:room_membership, room: room, user: user, role: "member")
      msg = create(:room_message, room: room)
      delete "/api/v1/rooms/#{room.id}/messages/#{msg.id}", headers: headers
      expect(response).to have_http_status(:forbidden)
      expect(JSON.parse(response.body)["error_code"]).to eq("owner_required")
    end
  end
end
