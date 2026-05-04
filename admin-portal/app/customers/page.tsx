import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { CustomersList } from "@/components/customers/customers-list"

export default function CustomersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Customers</h2>
          <p className="text-muted-foreground">View and manage your customer base</p>
        </div>
        <CustomersList />
      </div>
    </DashboardLayout>
  )
}
