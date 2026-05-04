import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ChatsPanel } from "@/components/chats/chats-panel"

export default function ChatsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Chats</h2>
          <p className="text-muted-foreground">Manage customer conversations and agent handoffs</p>
        </div>
        <ChatsPanel />
      </div>
    </DashboardLayout>
  )
}
