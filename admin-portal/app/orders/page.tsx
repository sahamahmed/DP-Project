import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { OrdersList } from "@/components/orders/orders-list"

export default function OrdersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Orders</h2>
          <p className="text-muted-foreground">Manage and track all incoming orders</p>
        </div>
        <OrdersList />
      </div>
    </DashboardLayout>
  )
}
