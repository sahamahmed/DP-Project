"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Package,
  ShoppingCart,
  MessageSquare,
  Check,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth-context";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  Notification,
  NotificationType,
} from "@/lib/api/notification-api";
import { formatDistanceToNow } from "date-fns";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

// Notification sound
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

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "order_created":
      return <ShoppingCart className="h-4 w-4 text-green-500" />;
    case "order_status_changed":
      return <Package className="h-4 w-4 text-blue-500" />;
    case "agent_request":
      return <MessageSquare className="h-4 w-4 text-orange-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
};

export function NotificationBell() {
  const { admin } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Fetch notifications when dropdown opens
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications(20);
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { count } = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, []);

  // Connect to socket for real-time notifications
  useEffect(() => {
    if (!admin?.restaurantId) return;

    const socket = io(`${SOCKET_URL}/chat`, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Notification socket connected");
      socket.emit("join:restaurant", { restaurantId: admin.restaurantId });
    });

    socket.on("notification:new", (notification: Notification) => {
      console.log("New notification:", notification);

      // Play sound
      playNotificationSound();

      // Add to list
      setNotifications((prev) => [notification, ...prev.slice(0, 19)]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [admin?.restaurantId]);

  // Fetch initial unread count
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Handle dropdown open
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      fetchNotifications();
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full p-0 text-xs flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                handleMarkAllAsRead();
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex gap-3 p-3 cursor-pointer ${
                  !notification.isRead ? "bg-muted/50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="shrink-0">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
