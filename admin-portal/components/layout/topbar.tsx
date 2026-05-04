"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "./notification-bell";

export function Topbar() {
  const { admin, logout, updateActiveStatus } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusToggle = async () => {
    setIsUpdating(true);
    try {
      await updateActiveStatus(!admin?.isActive);
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-foreground">OrderFlow</h1>
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleStatusToggle}
          disabled={isUpdating}
          className="gap-2"
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span
              className={`h-2 w-2 rounded-full ${
                admin?.isActive ? "bg-success" : "bg-muted-foreground"
              }`}
            />
          )}
          {admin?.isActive ? "Online" : "Offline"}
        </Button>

        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 pl-2 pr-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/diverse-avatars.png" />
                <AvatarFallback>
                  {admin?.name ? getInitials(admin.name) : "AD"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {admin?.name || "Admin"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{admin?.name || "Admin"}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {admin?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
