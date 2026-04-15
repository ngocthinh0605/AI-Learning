import { createConsumer } from "@rails/actioncable";

const CABLE_URL = import.meta.env.VITE_CABLE_URL || "ws://localhost:3001/cable";

let consumer = null;

/**
 * Returns a singleton ActionCable consumer with the JWT token attached.
 * Re-creates the consumer if the token has changed (e.g. after re-login).
 * Kept separate from UI logic per architecture rules.
 */
export function getConsumer() {
  const token = localStorage.getItem("auth_token");
  const url = token ? `${CABLE_URL}?token=${token}` : CABLE_URL;

  if (!consumer) {
    consumer = createConsumer(url);
  }

  return consumer;
}

/**
 * Tears down the consumer — call on logout so the WebSocket is closed cleanly.
 */
export function disconnectConsumer() {
  consumer?.disconnect();
  consumer = null;
}

/**
 * Subscribes to ConversationChannel for a given conversation ID.
 *
 * @param {string} conversationId
 * @param {object} handlers - { onSubscribed, onToken, onUserMessage, onStreamStart, onStreamEnd, onError }
 * @returns {object} subscription — call subscription.unsubscribe() to clean up
 */
export function subscribeToConversation(conversationId, handlers = {}) {
  const cable = getConsumer();

  return cable.subscriptions.create(
    { channel: "ConversationChannel", conversation_id: conversationId },
    {
      connected() {
        handlers.onSubscribed?.();
      },

      disconnected() {
        handlers.onDisconnected?.();
      },

      received(data) {
        console.debug("[Cable] received:", data.type, data);
          switch (data.type) {
          case "subscribed":
            handlers.onSubscribed?.(data);
            break;
          case "user_message_saved":
            handlers.onUserMessage?.(data);
            break;
          case "user_message_received":
            handlers.onUserMessageReceived?.(data);
            break;
          case "processing_audio":
            handlers.onProcessingAudio?.(data);
            break;
          case "transcript_empty":
            handlers.onTranscriptEmpty?.(data);
            break;
          case "transcript_ready":
            handlers.onTranscript?.(data);
            break;
          case "stream_start":
            handlers.onStreamStart?.(data);
            break;
          case "stream_token":
            handlers.onToken?.(data.token);
            break;
          case "stream_end":
            handlers.onStreamEnd?.(data);
            break;
          case "stream_error":
            handlers.onError?.(data.error);
            break;
          default:
            break;
        }
      },

      // Sends a text message through the WebSocket channel
      sendMessage(text) {
        this.perform("receive", { message: text });
      },

      // Sends a base64 audio chunk from the real-time mic to the backend
      sendAudioChunk(base64) {
        this.perform("receive_audio", { audio_chunk: base64 });
      },

      // Signals end of speech so backend assembles chunks and runs Whisper
      // Reason: ActionCable reserves the "action" key for routing — using it
      // as a payload field causes the message to be routed to a non-existent
      // method instead of receive_audio. Use "signal" instead.
      endOfSpeech() {
        this.perform("receive_audio", { signal: "end_of_speech" });
      },
    }
  );
}
