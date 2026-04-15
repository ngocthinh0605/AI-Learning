module Api
  module V1
    class ConversationsController < ApplicationController
      before_action :set_conversation, only: [:show, :destroy]

      def index
        conversations = current_user.conversations.order(created_at: :desc)
        render json: conversations, each_serializer: ConversationSerializer
      end

      def show
        render json: @conversation, serializer: ConversationSerializer, include_messages: true
      end

      def create
        conversation = current_user.conversations.create!(conversation_params)
        render json: conversation, serializer: ConversationSerializer, status: :created
      end

      def destroy
        @conversation.destroy!
        render json: { message: "Conversation deleted" }, status: :ok
      end

      private

      def set_conversation
        @conversation = current_user.conversations.find(params[:id])
      end

      def conversation_params
        params.require(:conversation).permit(:title, :topic, :difficulty_level)
      end
    end
  end
end
