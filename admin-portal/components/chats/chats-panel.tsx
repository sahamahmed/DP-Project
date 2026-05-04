"use client";

import { useState, useEffect, useCallback } from "react";
import { ChatList } from "./chat-list";
import { ChatView } from "./chat-view";
import { useChatSocket } from "@/hooks/use-chat-socket";
import {
  getConversations,
  getMessages,
  sendAgentMessage,
  updateConversationStatus,
  toggleConversationSaved,
  getRestaurantIdForSocket,
} from "@/lib/api/chat-api";
import type { Chat, Message, ChatStatus } from "@/lib/types/chat";
import { Loader2 } from "lucide-react";

export function ChatsPanel() {
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const restaurantId = getRestaurantIdForSocket();

  // Handle new messages from WebSocket
  const handleNewMessage = useCallback((payload: any) => {
    const newMessage: Message = {
      id: payload.message.id,
      content: payload.message.content,
      sender: payload.message.sender,
      type: payload.message.type,
      timestamp: new Date(payload.message.timestamp),
    };

    // Update chat list
    setChatList((prev) =>
      prev.map((chat) =>
        chat.id === payload.conversationId
          ? {
              ...chat,
              lastMessage: payload.message.content,
              lastMessageAt: new Date(),
              messages: [...chat.messages, newMessage],
            }
          : chat
      )
    );

    // Update selected chat using functional update to avoid stale closure
    setSelectedChat((prev) => {
      if (prev && prev.id === payload.conversationId) {
        return {
          ...prev,
          lastMessage: payload.message.content,
          messages: [...prev.messages, newMessage],
        };
      }
      return prev;
    });
  }, []);

  // Handle conversation updates
  const handleConversationUpdate = useCallback((payload: any) => {
    const isNewAgentRequest = payload.status === "agent";

    setChatList((prev) => {
      const exists = prev.find((chat) => chat.id === payload.id);
      if (exists) {
        return prev.map((chat) =>
          chat.id === payload.id
            ? {
                ...chat,
                lastMessage: payload.lastMessage,
                lastMessageAt: new Date(payload.updatedAt),
                status: payload.status as ChatStatus,
                customerName: payload.customerName || chat.customerName,
              }
            : chat
        );
      } else {
        // New conversation
        return [
          {
            id: payload.id,
            customerPhone: payload.customerPhone,
            customerName: payload.customerName || payload.customerPhone,
            status: payload.status as ChatStatus,
            lastMessage: payload.lastMessage,
            lastMessageAt: new Date(payload.updatedAt),
            messageCount: 1,
            messages: [],
          },
          ...prev,
        ];
      }
    });

    // When a conversation becomes "agent" status, fetch full message history
    // This ensures agents can see the entire conversation before the handoff
    if (isNewAgentRequest) {
      getMessages(payload.id).then((messages) => {
        setChatList((prev) =>
          prev.map((chat) =>
            chat.id === payload.id ? { ...chat, messages } : chat
          )
        );

        // Also update selected chat if it's the same conversation
        setSelectedChat((prev) => {
          if (prev && prev.id === payload.id) {
            return { ...prev, messages };
          }
          return prev;
        });
      });
    }
  }, []);

  // Handle status change events
  const handleStatusChange = useCallback((payload: any) => {
    setChatList((prev) =>
      prev.map((chat) =>
        chat.id === payload.conversationId
          ? { ...chat, status: payload.status as ChatStatus }
          : chat
      )
    );

    // Use functional update to avoid stale closure
    setSelectedChat((prev) => {
      if (prev && prev.id === payload.conversationId) {
        return { ...prev, status: payload.status as ChatStatus };
      }
      return prev;
    });
  }, []);

  // Refresh data from MongoDB (called on mount and reconnect)
  const refreshData = useCallback(async () => {
    console.log("Refreshing data from MongoDB...");
    const conversations = await getConversations();
    setChatList(conversations);

    // If a chat is selected, refresh its messages too
    setSelectedChat((prev) => {
      if (prev) {
        const updatedChat = conversations.find((c) => c.id === prev.id);
        if (updatedChat) {
          // Fetch fresh messages for selected chat
          getMessages(prev.id).then((messages) => {
            setSelectedChat((current) =>
              current && current.id === prev.id
                ? { ...current, messages }
                : current
            );
          });
          return { ...prev, ...updatedChat };
        }
      }
      return prev;
    });
  }, []);

  // Initialize WebSocket
  const { isConnected } = useChatSocket({
    restaurantId,
    onNewMessage: handleNewMessage,
    onConversationUpdate: handleConversationUpdate,
    onConversationTakenOver: handleStatusChange,
    onConversationClosed: handleStatusChange,
    onReconnect: refreshData,
  });

  // Fetch conversations on mount
  useEffect(() => {
    async function loadConversations() {
      setIsLoading(true);
      await refreshData();
      setIsLoading(false);
    }
    loadConversations();
  }, [refreshData]);

  // Fetch messages when selecting a chat
  const handleSelectChat = async (chat: Chat) => {
    setSelectedChat(chat);

    // If messages not loaded, fetch them
    if (chat.messages.length === 0) {
      setIsLoadingMessages(true);
      const messages = await getMessages(chat.id);

      const updatedChat = { ...chat, messages };
      setSelectedChat(updatedChat);

      // Also update in the list
      setChatList((prev) =>
        prev.map((c) => (c.id === chat.id ? updatedChat : c))
      );
      setIsLoadingMessages(false);
    }
  };

  // Handle status change (takeover, return to bot, close)
  const handleChatStatusChange = async (chatId: string, status: ChatStatus) => {
    const chat = chatList.find((c) => c.id === chatId);
    if (!chat) return;

    const success = await updateConversationStatus(
      chatId,
      chat.customerPhone,
      status
    );

    if (success) {
      setChatList((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, status } : c))
      );
      if (selectedChat?.id === chatId) {
        setSelectedChat((prev) => (prev ? { ...prev, status } : null));
      }
    }
  };

  // Handle sending message
  const handleSendMessage = async (chatId: string, content: string) => {
    const chat = chatList.find((c) => c.id === chatId);
    if (!chat) return;

    const message = await sendAgentMessage(chatId, chat.customerPhone, content);

    if (message) {
      // Optimistic update - message will also come via WebSocket
      const updatedMessages = [...(selectedChat?.messages || []), message];

      setChatList((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, lastMessage: content, messages: updatedMessages }
            : c
        )
      );

      if (selectedChat?.id === chatId) {
        setSelectedChat((prev) =>
          prev
            ? { ...prev, lastMessage: content, messages: updatedMessages }
            : null
        );
      }
    }
  };

  // Notes are local only for now (could add API later)
  const handleUpdateNotes = (chatId: string, notes: string) => {
    setChatList((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, agentNotes: notes } : c))
    );
    if (selectedChat?.id === chatId) {
      setSelectedChat((prev) => (prev ? { ...prev, agentNotes: notes } : null));
    }
  };

  // Handle toggling saved status
  const handleToggleSaved = async (chatId: string, isSaved: boolean) => {
    const success = await toggleConversationSaved(chatId, isSaved);

    if (success) {
      setChatList((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, isSaved } : c))
      );
      if (selectedChat?.id === chatId) {
        setSelectedChat((prev) => (prev ? { ...prev, isSaved } : null));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center rounded-lg border border-border bg-card">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4 overflow-hidden rounded-lg border border-border bg-card">
      <ChatList
        chats={chatList}
        selectedChat={selectedChat}
        onSelectChat={handleSelectChat}
        isConnected={isConnected}
      />
      <ChatView
        chat={selectedChat}
        onStatusChange={handleChatStatusChange}
        onSendMessage={handleSendMessage}
        onUpdateNotes={handleUpdateNotes}
        onToggleSaved={handleToggleSaved}
        isLoadingMessages={isLoadingMessages}
      />
    </div>
  );
}
