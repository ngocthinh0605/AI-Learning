import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoom, fetchRoom, fetchRooms, joinRoom, sendRoomMessage } from "../../api/roomsApi";

const get = vi.fn();
const post = vi.fn();

vi.mock("../../api/client", () => ({
  default: { get, post, delete: vi.fn() },
}));

describe("roomsApi", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("fetches rooms list", async () => {
    get.mockResolvedValue({ data: [] });
    await fetchRooms();
    expect(get).toHaveBeenCalledWith("/rooms");
  });

  it("creates room", async () => {
    post.mockResolvedValue({ data: { id: "r1" } });
    const data = await createRoom({ name: "IELTS Club", description: "" });
    expect(post).toHaveBeenCalledWith("/rooms", { room: { name: "IELTS Club", description: "" } });
    expect(data.id).toBe("r1");
  });

  it("joins room and posts message", async () => {
    post.mockResolvedValueOnce({ data: { joined: true } }).mockResolvedValueOnce({ data: { id: "m1" } });
    await joinRoom("r1");
    await sendRoomMessage({ roomId: "r1", content: "Hello" });
    expect(post).toHaveBeenCalledWith("/rooms/r1/join");
    expect(post).toHaveBeenCalledWith("/rooms/r1/messages", { message: { content: "Hello" } });
  });

  it("fetches room details", async () => {
    get.mockResolvedValue({ data: { room: { id: "r1" } } });
    const data = await fetchRoom("r1");
    expect(get).toHaveBeenCalledWith("/rooms/r1");
    expect(data.room.id).toBe("r1");
  });
});
