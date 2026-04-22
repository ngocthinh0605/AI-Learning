import React, { useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { fetchRoom, fetchRooms, joinRoom, sendRoomMessage, createRoom } from "../api/roomsApi";
import { subscribeToRoom } from "../api/cableApi";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roomName, setRoomName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === selectedRoomId) || null, [rooms, selectedRoomId]);

  useEffect(() => {
    fetchRooms()
      .then((data) => {
        setRooms(data);
        if (data[0]) setSelectedRoomId(data[0].id);
      })
      .catch(() => setError("Failed to load rooms"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    fetchRoom(selectedRoomId)
      .then((data) => setMessages(data.messages || []))
      .catch(() => setError("Join room before opening messages"));

    const sub = subscribeToRoom(selectedRoomId, {
      onRoomMessage: (msg) => setMessages((prev) => [...prev, msg]),
    });
    return () => sub?.unsubscribe?.();
  }, [selectedRoomId]);

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!roomName.trim()) return;
    try {
      const created = await createRoom({ name: roomName.trim(), description: "" });
      setRooms((prev) => [created, ...prev]);
      setRoomName("");
    } catch {
      setError("Failed to create room");
    }
  }

  async function handleJoin(roomId) {
    try {
      await joinRoom(roomId);
      const data = await fetchRoom(roomId);
      setSelectedRoomId(roomId);
      setMessages(data.messages || []);
      setError("");
    } catch {
      setError("Failed to join room");
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!selectedRoomId || !messageText.trim()) return;
    try {
      const msg = await sendRoomMessage({ roomId: selectedRoomId, content: messageText.trim() });
      setMessages((prev) => [...prev, msg]);
      setMessageText("");
    } catch {
      setError("Failed to send room message");
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-4">Multiplayer Rooms</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <form onSubmit={handleCreateRoom} className="mb-4 flex gap-2">
            <input className="input-field flex-1" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Create room name" />
            <button className="btn-primary" aria-label="Create room"><Plus size={14} /></button>
          </form>
          {loading ? (
            <p className="text-sm text-gray-500">Loading rooms...</p>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <button key={room.id} onClick={() => handleJoin(room.id)} className={`w-full text-left rounded-lg border p-3 ${selectedRoomId === room.id ? "border-accent-500/60" : "border-gray-800"}`}>
                  <p className="text-sm text-white">{room.name}</p>
                  <p className="text-xs text-gray-500">{room.member_count} members</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 card flex flex-col min-h-[520px]">
          <div className="border-b border-gray-800 pb-3 mb-3">
            <p className="text-sm text-gray-400">Room</p>
            <p className="text-white font-semibold">{selectedRoom?.name || "Select a room"}</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="rounded-lg bg-gray-800/50 p-3">
                <p className="text-xs text-gray-400">{m.display_name || m.user_id}</p>
                <p className="text-sm text-gray-100">{m.content}</p>
              </div>
            ))}
            {messages.length === 0 && <p className="text-sm text-gray-500">No messages yet.</p>}
          </div>
          <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
            <input className="input-field flex-1" value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Send message to room..." />
            <button className="btn-primary flex items-center gap-1"><MessageCircle size={14} />Send</button>
          </form>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
