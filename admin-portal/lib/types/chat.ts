// Chat types aligned with backend schemas

export type ChatStatus = "bot" | "agent" | "closed";
export type MessageSender = "customer" | "bot" | "agent";

export interface Message {
  id: string;
  content: string;
  sender: MessageSender;
  type: string;
  timestamp: Date;
  mediaUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Chat {
  id: string;
  customerPhone: string;
  customerName?: string;
  status: ChatStatus;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  agentAssignedAt?: Date;
  closedAt?: Date;
  isSaved?: boolean;
  messages: Message[];
  agentNotes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// WebSocket event payloads
export interface NewMessagePayload {
  conversationId: string;
  customerId: string;
  customerPhone: string;
  customerName: string;
  message: {
    id: string;
    content: string;
    sender: MessageSender;
    type: string;
    timestamp: Date;
    mediaUrl?: string;
  };
}

export interface ConversationUpdatePayload {
  id: string;
  customerPhone: string;
  customerName: string;
  status: string;
  lastMessage: string;
  updatedAt: Date;
  messageFrom?: "customer" | "bot" | "agent";
}

export interface StatusChangePayload {
  conversationId: string;
  status: ChatStatus;
}
