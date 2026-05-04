import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SettingsPanel } from "@/components/settings/settings-panel"

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
          <p className="text-muted-foreground">Manage your restaurant profile and preferences</p>
        </div>
        <SettingsPanel />
      </div>
    </DashboardLayout>
  )
}
