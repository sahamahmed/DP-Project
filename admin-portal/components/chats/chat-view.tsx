"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Chat, ChatStatus } from "@/lib/types/chat";
import {
  Send,
  Bot,
  UserRound,
  User,
  Phone,
  StickyNote,
  Loader2,
  ShoppingCart,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { formatTime } from "@/lib/date-utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CreateOrderDialog } from "./create-order-dialog";

interface ChatViewProps {
  chat: Chat | null;
  onStatusChange: (chatId: string, status: ChatStatus) => void;
  onSendMessage: (chatId: string, content: string) => void;
  onUpdateNotes: (chatId: string, notes: string) => void;
  onToggleSaved?: (chatId: string, isSaved: boolean) => void;
  isLoadingMessages?: boolean;
}

export function ChatView({
  chat,
  onStatusChange,
  onSendMessage,
  onUpdateNotes,
  onToggleSaved,
  isLoadingMessages,
}: ChatViewProps) {
  const [messageInput, setMessageInput] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showCreateOrder, setShowCreateOrder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chat) {
      setNotes(chat.agentNotes || "");
    }
  }, [chat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  if (!chat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">Select a chat</p>
          <p className="text-sm text-muted-foreground">
            Choose a conversation from the list to view messages
          </p>
        </div>
      </div>
    );
  }

  const handleSend = () => {
    if (messageInput.trim() && chat.status === "agent") {
      onSendMessage(chat.id, messageInput.trim());
      setMessageInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveNotes = () => {
    onUpdateNotes(chat.id, notes);
    setShowNotes(false);
  };

  const handleReturnToBot = () => {
    onStatusChange(chat.id, "bot");
    setShowReturnDialog(false);
  };

  const isAgentMode = chat.status === "agent";

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-medium text-foreground">
              {chat.customerName || chat.customerPhone}
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3 w-3" />
              {chat.customerPhone}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleSaved?.(chat.id, !chat.isSaved)}
            className={cn(
              "gap-1.5 bg-transparent",
              chat.isSaved && "border-primary text-primary hover:text-primary"
            )}
            title={
              chat.isSaved
                ? "Chat is saved (won't be auto-deleted)"
                : "Save chat to prevent auto-deletion"
            }
          >
            {chat.isSaved ? (
              <BookmarkCheck className="h-3.5 w-3.5" />
            ) : (
              <Bookmark className="h-3.5 w-3.5" />
            )}
            {chat.isSaved ? "Saved" : "Save"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            className="gap-1.5 bg-transparent"
          >
            <StickyNote className="h-3.5 w-3.5" />
            Notes
          </Button>
          {isAgentMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReturnDialog(true)}
              className="bg-transparent"
            >
              Return to Bot
            </Button>
          )}
          {chat.status === "bot" && (
            <Button size="sm" onClick={() => onStatusChange(chat.id, "agent")}>
              Take Over
            </Button>
          )}
        </div>
      </div>

      {/* Agent Mode Banner */}
      {isAgentMode && (
        <div className="flex items-center justify-between gap-2 bg-success/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">
              Agent Mode Active
            </span>
            <span className="text-sm text-success/80">
              You are now handling this conversation
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateOrder(true)}
            className="gap-1.5 bg-white/50 hover:bg-white border-success/30 text-success hover:text-success"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Create Order
          </Button>
        </div>
      )}

      {/* Notes Panel */}
      {showNotes && (
        <div className="border-b border-border bg-muted/30 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Internal Notes
              </span>
              <span className="text-xs text-muted-foreground">
                Not visible to customer
              </span>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this conversation..."
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotes(false)}
                className="bg-transparent"
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveNotes}>
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading messages...
              </p>
            </div>
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chat.messages.map((message) => {
              const isCustomer = message.sender === "customer";
              const isBot = message.sender === "bot";

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    !isCustomer && "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      isCustomer
                        ? "bg-muted"
                        : isBot
                        ? "bg-primary/20"
                        : "bg-success/20"
                    )}
                  >
                    {isCustomer ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : isBot ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <UserRound className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-2",
                      isCustomer
                        ? "rounded-bl-sm bg-muted"
                        : "rounded-br-sm bg-primary text-primary-foreground"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        isCustomer
                          ? "text-muted-foreground"
                          : "text-primary-foreground/70"
                      )}
                    >
                      {formatTime(new Date(message.timestamp))}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        {chat.status === "closed" ? (
          <div className="flex items-center justify-center py-2">
            <Badge variant="secondary">This chat has been closed</Badge>
          </div>
        ) : !isAgentMode ? (
          <div className="flex items-center justify-center py-2">
            <Badge variant="secondary">Take over to send messages</Badge>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!messageInput.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Return to Bot Dialog */}
      <AlertDialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Return to Bot</AlertDialogTitle>
            <AlertDialogDescription>
              The bot will continue handling this conversation. You can take
              over again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReturnToBot}>
              Return to Bot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Order Dialog */}
      <CreateOrderDialog
        open={showCreateOrder}
        onOpenChange={setShowCreateOrder}
        customerName={chat.customerName || ""}
        customerPhone={chat.customerPhone}
      />
    </div>
  );
}
