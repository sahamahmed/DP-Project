import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back! Here's what's happening today.</p>
        </div>
        <DashboardStats />
      </div>
    </DashboardLayout>
  )
}
