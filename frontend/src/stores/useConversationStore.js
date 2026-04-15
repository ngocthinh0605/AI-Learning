import { create } from "zustand";
import {
  fetchConversations,
  fetchConversation,
  createConversation,
  deleteConversation,
  sendTextMessage,
  sendAudioMessage,
} from "../api/conversationsApi";

/**
 * Global conversation store — replaces ConversationContext.
 *
 * Exposes:
 *   conversations        - list of the user's conversations
 *   activeConversation   - the currently open conversation object
 *   messages             - messages for the active conversation
 *   loading              - true while a list/detail fetch is in progress
 *   sending              - true while a message send is in progress
 *   error                - last error string, or null
 *
 *   loadConversations()  - fetch the full conversation list
 *   loadConversation(id) - fetch one conversation + its messages
 *   startConversation()  - create a new conversation
 *   removeConversation() - delete a conversation by id
 *   sendText()           - send a text message and append both sides
 *   sendAudio()          - send an audio blob and append both sides
 */
export const useConversationStore = create((set) => ({
  conversations:      [],
  activeConversation: null,
  messages:           [],
  loading:            false,
  sending:            false,
  error:              null,

  loadConversations: async () => {
    set({ loading: true });
    try {
      const data = await fetchConversations();
      set({ conversations: data });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  loadConversation: async (id) => {
    set({ loading: true });
    try {
      const data = await fetchConversation(id);
      set({
        activeConversation: data,
        messages: data.messages || [],
      });
    } catch (err) {
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  startConversation: async (params) => {
    const conversation = await createConversation(params);
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    }));
    return conversation;
  },

  removeConversation: async (id) => {
    await deleteConversation(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversation:
        state.activeConversation?.id === id ? null : state.activeConversation,
    }));
  },

  sendText: async ({ conversationId, content }) => {
    set({ sending: true });
    try {
      const result = await sendTextMessage({ conversationId, content });
      set((state) => ({
        messages: [...state.messages, result.user_message, result.assistant_message],
      }));
      return result;
    } finally {
      set({ sending: false });
    }
  },

  sendAudio: async ({ conversationId, audioBlob }) => {
    set({ sending: true });
    try {
      const result = await sendAudioMessage({ conversationId, audioBlob });
      set((state) => ({
        messages: [...state.messages, result.user_message, result.assistant_message],
      }));
      return result;
    } finally {
      set({ sending: false });
    }
  },
}));
