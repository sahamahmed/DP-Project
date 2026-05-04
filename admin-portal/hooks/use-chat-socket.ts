"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type {
  NewMessagePayload,
  ConversationUpdatePayload,
  StatusChangePayload,
} from "@/lib/types/chat";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

// Notification sound for new messages
const playNotificationSound = () => {
  try {
    const audio = new Audio("/notifi.mp3");
    audio.volume = 0.5;
    audio.play().catch((err) => {
      console.log("Could not play notification sound:", err);
    });
  } catch (err) {
    console.log("Audio not supported:", err);
  }
};

interface UseChatSocketOptions {
  restaurantId: string;
  onNewMessage?: (payload: NewMessagePayload) => void;
  onConversationUpdate?: (payload: ConversationUpdatePayload) => void;
  onConversationTakenOver?: (payload: StatusChangePayload) => void;
  onConversationClosed?: (payload: StatusChangePayload) => void;
  onReconnect?: () => void; // Called on reconnect to trigger data refresh
}

export function useChatSocket({
  restaurantId,
  onNewMessage,
  onConversationUpdate,
  onConversationTakenOver,
  onConversationClosed,
  onReconnect,
}: UseChatSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const hasConnectedOnce = useRef(false);

  useEffect(() => {
    if (!restaurantId) return;

    // Connect to the /chat namespace
    const socket = io(`${SOCKET_URL}/chat`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);

      // Join the restaurant room
      socket.emit("join:restaurant", { restaurantId }, (response: any) => {
        console.log("Joined restaurant room:", response);
      });

      // On reconnect (not first connect), refresh data from MongoDB
      if (hasConnectedOnce.current) {
        console.log("Socket reconnected - triggering data refresh");
        onReconnect?.();
      }
      hasConnectedOnce.current = true;
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    // Listen for new messages
    socket.on("message:new", (payload: NewMessagePayload) => {
      console.log("New message received:", payload);
      onNewMessage?.(payload);
    });

    // Listen for conversation updates
    socket.on("conversation:update", (payload: ConversationUpdatePayload) => {
      // Play notification sound only when customer requests to talk to agent
      if (payload.status === "agent") {
        playNotificationSound();
      }

      onConversationUpdate?.(payload);
    });

    // Listen for takeover events
    socket.on("conversation:taken-over", (payload: StatusChangePayload) => {
      console.log("Conversation taken over:", payload);
      onConversationTakenOver?.(payload);
    });

    // Listen for close events
    socket.on("conversation:closed", (payload: StatusChangePayload) => {
      console.log("Conversation closed:", payload);
      onConversationClosed?.(payload);
    });

    return () => {
      if (socket.connected) {
        socket.emit("leave:restaurant", { restaurantId });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    restaurantId,
    onNewMessage,
    onConversationUpdate,
    onConversationTakenOver,
    onConversationClosed,
    onReconnect,
  ]);

  // Emit takeover event
  const takeOver = useCallback(
    (conversationId: string, customerPhone: string) => {
      if (!socketRef.current?.connected) return;

      socketRef.current.emit(
        "conversation:takeover",
        { conversationId, customerPhone, restaurantId },
        (response: any) => {
          console.log("Takeover response:", response);
        }
      );
    },
    [restaurantId]
  );

  // Emit close/return to bot event
  const closeConversation = useCallback(
    (conversationId: string, customerPhone: string) => {
      if (!socketRef.current?.connected) return;

      socketRef.current.emit(
        "conversation:close",
        { conversationId, customerPhone, restaurantId },
        (response: any) => {
          console.log("Close response:", response);
        }
      );
    },
    [restaurantId]
  );

  // Send message via socket
  const sendMessage = useCallback(
    (conversationId: string, customerPhone: string, text: string) => {
      if (!socketRef.current?.connected) return;

      socketRef.current.emit(
        "message:send",
        { conversationId, customerPhone, restaurantId, text },
        (response: any) => {
          console.log("Send message response:", response);
        }
      );
    },
    [restaurantId]
  );

  return {
    isConnected,
    takeOver,
    closeConversation,
    sendMessage,
    socket: socketRef.current,
  };
}
