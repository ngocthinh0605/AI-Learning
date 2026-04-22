import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RoomsPage from "../../pages/RoomsPage";

const fetchRooms = vi.fn();
const createRoom = vi.fn();
const joinRoom = vi.fn();
const fetchRoom = vi.fn();
const sendRoomMessage = vi.fn();

vi.mock("../../api/roomsApi", () => ({
  fetchRooms: (...args) => fetchRooms(...args),
  createRoom: (...args) => createRoom(...args),
  joinRoom: (...args) => joinRoom(...args),
  fetchRoom: (...args) => fetchRoom(...args),
  sendRoomMessage: (...args) => sendRoomMessage(...args),
}));

vi.mock("../../api/cableApi", () => ({
  subscribeToRoom: () => ({ unsubscribe: vi.fn() }),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/rooms"]}>
      <Routes>
        <Route path="/rooms" element={<RoomsPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RoomsPage", () => {
  beforeEach(() => {
    fetchRooms.mockReset();
    createRoom.mockReset();
    joinRoom.mockReset();
    fetchRoom.mockReset();
    sendRoomMessage.mockReset();
    fetchRooms.mockResolvedValue([{ id: "r1", name: "IELTS Club", member_count: 1 }]);
    fetchRoom.mockResolvedValue({ messages: [] });
  });

  it("loads rooms and allows creating one", async () => {
    createRoom.mockResolvedValue({ id: "r2", name: "Room 2", member_count: 1 });
    renderPage();
    await waitFor(() => expect(screen.getByText("IELTS Club")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/create room name/i), { target: { value: "Room 2" } });
    fireEvent.click(screen.getByRole("button", { name: /create room/i }));
    await waitFor(() => expect(createRoom).toHaveBeenCalled());
  });

  it("joins room and sends message", async () => {
    joinRoom.mockResolvedValue({ joined: true });
    sendRoomMessage.mockResolvedValue({ id: "m1", content: "Hello", display_name: "Tom" });
    renderPage();
    await waitFor(() => expect(screen.getByText("IELTS Club")).toBeInTheDocument());
    fireEvent.click(screen.getByText("IELTS Club"));
    fireEvent.change(screen.getByPlaceholderText(/send message to room/i), { target: { value: "Hello" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));
    await waitFor(() => expect(sendRoomMessage).toHaveBeenCalled());
  });
});
