"use client";

import type React from "react";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Chat, ChatStatus } from "@/lib/types/chat";
import {
  Search,
  Bot,
  UserRound,
  CheckCircle2,
  Wifi,
  WifiOff,
  AlertCircle,
  MessageCircle,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/date-utils";

type FilterMode = "agent" | "all";

interface ChatListProps {
  chats: Chat[];
  selectedChat: Chat | null;
  onSelectChat: (chat: Chat) => void;
  isConnected?: boolean;
}

const statusConfig: Record<
  ChatStatus,
  { icon: React.ElementType; label: string; color: string; urgent?: boolean }
> = {
  bot: { icon: Bot, label: "Bot", color: "bg-primary/20 text-primary" },
  agent: {
    icon: AlertCircle,
    label: "Needs Attention",
    color: "bg-destructive/20 text-destructive animate-pulse",
    urgent: true,
  },
  closed: {
    icon: CheckCircle2,
    label: "Closed",
    color: "bg-muted text-muted-foreground",
  },
};

export function ChatList({
  chats,
  selectedChat,
  onSelectChat,
  isConnected,
}: ChatListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("agent");

  const filteredChats = chats.filter((chat) => {
    // First apply search filter
    const matchesSearch =
      (chat.customerName?.toLowerCase() || "").includes(
        searchQuery.toLowerCase()
      ) || chat.customerPhone.includes(searchQuery);

    if (!matchesSearch) return false;

    // Then apply status filter
    if (filterMode === "agent") {
      return chat.status === "agent";
    }

    return true; // "all" mode shows everything
  });

  const sortedChats = [...filteredChats].sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  // Count agent chats for badge
  const agentChatCount = chats.filter((chat) => chat.status === "agent").length;

  return (
    <div className="flex w-80 flex-col border-r border-border">
      <div className="border-b border-border p-4">
        {/* Filter Tabs */}
        <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
          <Button
            variant={filterMode === "agent" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterMode("agent")}
            className={cn(
              "flex-1 gap-1.5 text-xs",
              filterMode === "agent" && "shadow-sm"
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Needs Attention</span>
            {agentChatCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-1 h-5 min-w-5 px-1.5 text-xs"
              >
                {agentChatCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={filterMode === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterMode("all")}
            className={cn(
              "flex-1 gap-1.5 text-xs",
              filterMode === "all" && "shadow-sm"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>All Chats</span>
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* Connection status indicator */}
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          {isConnected ? (
            <>
              <Wifi className="h-3 w-3 text-success" />
              <span className="text-success">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Connecting...</span>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {filterMode === "agent" ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-success mb-2" />
                <p className="font-medium text-foreground">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No chats need your attention right now
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No chats found</p>
            )}
          </div>
        ) : (
          sortedChats.map((chat) => {
            const statusInfo = statusConfig[chat.status];
            const StatusIcon = statusInfo.icon;
            const isSelected = selectedChat?.id === chat.id;

            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat)}
                className={cn(
                  "w-full border-b border-border p-4 text-left transition-colors hover:bg-accent",
                  isSelected && "bg-accent",
                  statusInfo.urgent &&
                    "border-l-4 border-l-destructive bg-destructive/5"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {chat.customerName || chat.customerPhone}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {chat.customerPhone}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(chat.lastMessageAt))}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {chat.lastMessage}
                </p>
                <div className="mt-2">
                  <Badge
                    variant="secondary"
                    className={cn("gap-1 text-xs", statusInfo.color)}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
