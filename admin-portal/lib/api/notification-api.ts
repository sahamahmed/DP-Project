import { getAuthHeader } from "./auth-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ============ TYPES ============

export type NotificationType =
  | "order_created"
  | "order_status_changed"
  | "agent_request"
  | "low_stock"
  | "system";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: {
    orderId?: string;
    orderNumber?: string;
    customerName?: string;
    amount?: number;
    source?: "bot" | "agent";
    status?: string;
    customerPhone?: string;
    [key: string]: unknown;
  };
  isRead: boolean;
  createdAt: string;
}

// ============ API FUNCTIONS ============

/**
 * Get notifications for the restaurant
 */
export async function getNotifications(
  limit = 50,
  skip = 0
): Promise<Notification[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications?limit=${limit}&skip=${skip}`,
    {
      headers: {
        ...getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<{ count: number }> {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/unread-count`,
    {
      headers: {
        ...getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch unread count");
  }

  return response.json();
}

/**
 * Mark a notification as read
 */
export async function markAsRead(
  notificationId: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      headers: {
        ...getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }

  return response.json();
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/api/notifications/mark-all-read`,
    {
      method: "POST",
      headers: {
        ...getAuthHeader(),
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to mark all notifications as read");
  }

  return response.json();
}
