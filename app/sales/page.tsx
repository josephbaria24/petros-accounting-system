//app\sales\page.tsx
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// ⬇️ Import your components from components/sales-tabs
import SalesOverview from "@/components/sales-tabs/sales-overview"
import InvoicesTable from "@/components/sales-tabs/invoice-table"
import PaymentsTable from "@/components/sales-tabs/payments-table"
import CustomersTable from "@/components/sales-tabs/customers-table"
import { useSearchParams } from "next/navigation";

export default function SalesPage() {
   const searchParams = useSearchParams();
  const tabFromURL = searchParams.get("tab") || "overview";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Sales</h1>

      <Tabs defaultValue={tabFromURL} className="w-full">

        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <SalesOverview />
        </TabsContent>

        <TabsContent value="invoices">
          <InvoicesTable />
        </TabsContent>

        <TabsContent value="payments">
          <PaymentsTable />
        </TabsContent>

        <TabsContent value="customers">
          <CustomersTable />
        </TabsContent>

      </Tabs>
    </div>
  )
}
