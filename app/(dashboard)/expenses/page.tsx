"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Import your components
import ExpensesDashboard from "@/components/expenses-tabs/expenses-table"

import SuppliersTable from "@/components/expenses-tabs/suppliers-table"
import BillsTable from "@/components/expenses-tabs/bills-table"
import PurchaseOrdersTable from "@/components/expenses-tabs/purchase-table"


export default function ExpensesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tabFromURL = searchParams.get("tab") || "expenses"
  const [activeTab, setActiveTab] = useState(tabFromURL)

  // Sync tab with URL changes
  useEffect(() => {
    setActiveTab(tabFromURL)
  }, [tabFromURL])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    router.push(`/expenses?tab=${value}`, { scroll: false })
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Expenses</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="purchase-orders">Purchase orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <ExpensesDashboard />
        </TabsContent>

        <TabsContent value="bills">
          <BillsTable />
        </TabsContent>

        <TabsContent value="purchase-orders">
          <PurchaseOrdersTable />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}