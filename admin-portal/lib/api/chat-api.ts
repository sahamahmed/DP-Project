import type { Chat, Message } from "@/lib/types/chat";
import { getAuthHeader, getStoredAdmin } from "./auth-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Get restaurant ID from auth context or fallback to env
const getRestaurantId = () => {
  const admin = getStoredAdmin();
  if (admin?.restaurantId) {
    return admin.restaurantId;
  }
  return process.env.NEXT_PUBLIC_RESTAURANT_ID || "683d95a0fc6e20c922cc8c07";
};

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return { error: error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Network error" };
  }
}

// Export for use in socket connection
export { getRestaurantId };

// Fetch all conversations for the restaurant
export async function getConversations(status?: string): Promise<Chat[]> {
  const restaurantId = getRestaurantId();
  const query = status ? `?status=${status}` : "";
  const { data, error } = await fetchApi<any[]>(
    `/api/restaurants/${restaurantId}/chats${query}`
  );

  if (error || !data) {
    console.error("Failed to fetch conversations:", error);
    return [];
  }

  // Transform API response to Chat type
  return data.map((conv) => ({
    id: conv.id,
    customerPhone: conv.customerPhone,
    customerName: conv.customerName || conv.customerPhone,
    status: conv.status,
    lastMessage: conv.lastMessage || "",
    lastMessageAt: new Date(conv.lastMessageAt),
    messageCount: conv.messageCount || 0,
    agentAssignedAt: conv.agentAssignedAt
      ? new Date(conv.agentAssignedAt)
      : undefined,
    closedAt: conv.closedAt ? new Date(conv.closedAt) : undefined,
    isSaved: conv.isSaved || false,
    messages: [],
    createdAt: conv.createdAt ? new Date(conv.createdAt) : undefined,
    updatedAt: conv.updatedAt
      ? new Date(conv.updatedAt)
      : new Date(conv.lastMessageAt),
  }));
}

// Fetch messages for a conversation
export async function getMessages(
  conversationId: string,
  limit?: number
): Promise<Message[]> {
  const restaurantId = getRestaurantId();
  const query = limit ? `?limit=${limit}` : "";
  const { data, error } = await fetchApi<any[]>(
    `/api/restaurants/${restaurantId}/chats/${conversationId}/messages${query}`
  );

  if (error || !data) {
    console.error("Failed to fetch messages:", error);
    return [];
  }

  return data.map((msg) => ({
    id: msg.id,
    content: msg.content,
    sender: msg.sender,
    type: msg.type,
    timestamp: new Date(msg.timestamp),
    mediaUrl: msg.mediaUrl,
    location: msg.location,
  }));
}

// Send a message as agent
export async function sendAgentMessage(
  conversationId: string,
  customerPhone: string,
  text: string
): Promise<Message | null> {
  const restaurantId = getRestaurantId();
  const { data, error } = await fetchApi<any>(
    `/api/restaurants/${restaurantId}/chats/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ text, customerPhone }),
    }
  );

  if (error || !data) {
    console.error("Failed to send message:", error);
    return null;
  }

  return {
    id: data.id,
    content: data.content,
    sender: data.sender,
    type: data.type,
    timestamp: new Date(data.timestamp),
  };
}

// Update conversation status (takeover, return to bot, close)
export async function updateConversationStatus(
  conversationId: string,
  customerPhone: string,
  status: "agent" | "bot" | "closed"
): Promise<boolean> {
  const restaurantId = getRestaurantId();
  const { data, error } = await fetchApi(
    `/api/restaurants/${restaurantId}/chats/${conversationId}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status, customerPhone }),
    }
  );

  if (error) {
    console.error("Failed to update status:", error);
    return false;
  }

  return true;
}

export function getRestaurantIdForSocket(): string {
  return getRestaurantId();
}

// Toggle saved status for a conversation
export async function toggleConversationSaved(
  conversationId: string,
  isSaved: boolean
): Promise<boolean> {
  const restaurantId = getRestaurantId();
  const { data, error } = await fetchApi(
    `/api/restaurants/${restaurantId}/chats/${conversationId}/saved`,
    {
      method: "PATCH",
      body: JSON.stringify({ isSaved }),
    }
  );

  if (error) {
    console.error("Failed to toggle saved status:", error);
    return false;
  }

  return true;
}
