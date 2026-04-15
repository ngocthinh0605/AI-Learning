import { describe, it, expect } from "vitest";
import { fetchConversations, createConversation, sendTextMessage } from "../../api/conversationsApi";

describe("conversationsApi", () => {
  describe("fetchConversations", () => {
    it("returns a list of conversations", async () => {
      const data = await fetchConversations();
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("title");
    });
  });

  describe("createConversation", () => {
    it("creates and returns a new conversation", async () => {
      const convo = await createConversation({ title: "Test Convo", topic: "Business" });
      expect(convo).toHaveProperty("id");
      expect(convo.title).toBe("Test Convo");
    });
  });

  describe("sendTextMessage", () => {
    it("returns user and assistant messages", async () => {
      const result = await sendTextMessage({ conversationId: "c1", content: "Hello" });
      expect(result.user_message.role).toBe("user");
      expect(result.assistant_message.role).toBe("assistant");
    });

    it("returns null vocabulary_suggestion when no word was suggested", async () => {
      const result = await sendTextMessage({ conversationId: "c1", content: "Hi" });
      expect(result.vocabulary_suggestion).toBeNull();
    });
  });
});
