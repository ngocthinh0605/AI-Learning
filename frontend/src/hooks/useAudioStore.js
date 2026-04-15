import { useRef, useCallback } from "react";

/**
 * In-memory store mapping message IDs to their recorded audio blob URLs.
 *
 * Why browser-only (no backend):
 *   - Audio blobs are ephemeral per-session — no need to persist them.
 *   - Avoids storing large audio files on the server.
 *   - Privacy: voice recordings never leave the device.
 *
 * Usage:
 *   const store = useAudioStore();
 *   store.save("msg-123", audioBlob);   // call when recording ends
 *   const url = store.get("msg-123");   // call in MessageBubble to play
 *   store.revoke("msg-123");            // call on unmount to free memory
 */
export function useAudioStore() {
  // Map of messageId → object URL (created via URL.createObjectURL)
  const urlMapRef = useRef(new Map());

  /**
   * Store a Blob for the given message ID.
   * Revokes any previous URL for that ID first to avoid memory leaks.
   */
  const save = useCallback((messageId, blob) => {
    if (!blob || !messageId) return;

    // Free the previous URL if one exists
    const existing = urlMapRef.current.get(messageId);
    if (existing) URL.revokeObjectURL(existing);

    const url = URL.createObjectURL(blob);
    urlMapRef.current.set(messageId, url);
  }, []);

  /** Get the object URL for a message ID, or null if not found. */
  const get = useCallback((messageId) => {
    return urlMapRef.current.get(messageId) ?? null;
  }, []);

  /** Remove and revoke a URL (free memory). */
  const revoke = useCallback((messageId) => {
    const url = urlMapRef.current.get(messageId);
    if (url) {
      URL.revokeObjectURL(url);
      urlMapRef.current.delete(messageId);
    }
  }, []);

  /** Revoke all stored URLs — call on conversation unmount. */
  const revokeAll = useCallback(() => {
    urlMapRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlMapRef.current.clear();
  }, []);

  return { save, get, revoke, revokeAll };
}
