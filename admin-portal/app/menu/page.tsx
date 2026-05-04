import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { MenuList } from "@/components/menu/menu-list"

export default function MenuPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Menu Management</h2>
          <p className="text-muted-foreground">Add, edit, and manage your menu items</p>
        </div>
        <MenuList />
      </div>
    </DashboardLayout>
  )
}
