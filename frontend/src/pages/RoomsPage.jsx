import React, { useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { fetchRoom, fetchRooms, joinRoom, sendRoomMessage, createRoom, deleteRoomMessage, removeRoomMember } from "../api/roomsApi";
import { subscribeToRoom } from "../api/cableApi";
import { useAuthStore } from "../stores/useAuthStore";

export default function RoomsPage() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [selectedRoomMeta, setSelectedRoomMeta] = useState(null);
  const [roomName, setRoomName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRooms() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchRooms();
      setRooms(data);
      if (data[0]) setSelectedRoomId(data[0].id);
    } catch {
      setError("Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }

  const selectedRoom = useMemo(() => rooms.find((r) => r.id === selectedRoomId) || null, [rooms, selectedRoomId]);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    setMessagesLoading(true);
    fetchRoom(selectedRoomId)
      .then((data) => {
        setMessages(data.messages || []);
        setSelectedRoomMeta(data.room || null);
      })
      .catch(() => setError("Join room before opening messages"))
      .finally(() => setMessagesLoading(false));

    const sub = subscribeToRoom(selectedRoomId, {
      onRoomMessage: (msg) => setMessages((prev) => upsertMessage(prev, msg)),
      onRoomPresence: (count) => {
        setRooms((prev) => prev.map((r) => (r.id === selectedRoomId ? { ...r, online_count: count } : r)));
        setSelectedRoomMeta((prev) => (prev ? { ...prev, online_count: count } : prev));
      },
      onRoomMessageDeleted: (messageId) => {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      },
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
      setSelectedRoomMeta(data.room || null);
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
      setMessages((prev) => upsertMessage(prev, msg));
      setMessageText("");
    } catch {
      setError("Failed to send room message");
    }
  }

  async function handleDeleteMessage(messageId) {
    if (!selectedRoomId) return;
    try {
      await deleteRoomMessage({ roomId: selectedRoomId, messageId });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch {
      setError("Failed to delete message");
    }
  }

  async function handleRemoveMember(userId) {
    if (!selectedRoomId) return;
    try {
      await removeRoomMember({ roomId: selectedRoomId, userId });
    } catch {
      setError("Failed to remove member");
    }
  }

  const isOwner = selectedRoomMeta?.owner_id === user?.id;

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
              {rooms.length === 0 && <p className="text-sm text-gray-500">No rooms available yet.</p>}
              {rooms.map((room) => (
                <button key={room.id} onClick={() => handleJoin(room.id)} className={`w-full text-left rounded-lg border p-3 ${selectedRoomId === room.id ? "border-accent-500/60" : "border-gray-800"}`}>
                  <p className="text-sm text-white">{room.name}</p>
                  <p className="text-xs text-gray-500">{room.member_count} members</p>
                </button>
              ))}
            </div>
          )}
          {!loading && (
            <button onClick={loadRooms} className="btn-ghost text-xs mt-3">Retry rooms</button>
          )}
        </div>

        <div className="lg:col-span-2 card flex flex-col min-h-[520px]">
          <div className="border-b border-gray-800 pb-3 mb-3">
            <p className="text-sm text-gray-400">Room</p>
            <p className="text-white font-semibold">{selectedRoom?.name || "Select a room"}</p>
            <p className="text-xs text-gray-500">Online: {selectedRoomMeta?.online_count ?? selectedRoom?.online_count ?? 0}</p>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {messagesLoading && <p className="text-sm text-gray-500">Loading messages...</p>}
            {messages.map((m) => (
              <div key={m.id} className="rounded-lg bg-gray-800/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">{m.display_name || m.user_id}</p>
                  {isOwner && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDeleteMessage(m.id)} className="text-[10px] text-gray-500 hover:text-red-300">Delete</button>
                      <button onClick={() => handleRemoveMember(m.user_id)} className="text-[10px] text-gray-500 hover:text-orange-300">Remove user</button>
                    </div>
                  )}
                </div>
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

function upsertMessage(prev, incoming) {
  const exists = prev.some((m) => m.id === incoming.id);
  return exists ? prev : [...prev, incoming];
}
