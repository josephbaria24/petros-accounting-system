//app\(dashboard)\expenses\page.tsx

"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useSearchParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

// Import your components
import ExpensesDashboard from "@/components/expenses-tabs/expenses-table"

import SuppliersTable from "@/components/expenses-tabs/suppliers-table"
import BillsTable from "@/components/expenses-tabs/bills-table"
import ChartOfAccountsPage from "@/app/(dashboard)/accounts/page"

const EXPENSE_TABS = new Set(["expenses", "bills", "suppliers", "chart-of-accounts"])

export default function ExpensesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const rawTab = searchParams.get("tab") || "expenses"
  const tabFromURL = EXPENSE_TABS.has(rawTab) ? rawTab : "expenses"
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
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:px-8 lg:py-6 2xl:max-w-[1536px]">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Expenses</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Expenses</h1>
        <p className="text-sm text-muted-foreground">Track spend, bills, and suppliers.</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-2 h-10 w-full justify-start gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
          <TabsTrigger value="expenses" className="rounded-lg px-3">
            Expenses
          </TabsTrigger>
          <TabsTrigger value="bills" className="rounded-lg px-3">
            Bills
          </TabsTrigger>
          {/* <TabsTrigger value="purchase-orders">Purchase orders</TabsTrigger> */}
          <TabsTrigger value="suppliers" className="rounded-lg px-3">
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="chart-of-accounts" className="rounded-lg px-3">
            Chart of accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="mt-4">
          <ExpensesDashboard />
        </TabsContent>

        <TabsContent value="bills" className="mt-4">
          <BillsTable />
        </TabsContent>
{/* 
        <TabsContent value="purchase-orders">
          <PurchaseOrdersTable />
        </TabsContent> */}

        <TabsContent value="suppliers" className="mt-4">
          <SuppliersTable />
        </TabsContent>

        <TabsContent value="chart-of-accounts" className="mt-4 -mx-4 sm:-mx-6 lg:-mx-8">
          <ChartOfAccountsPage />
        </TabsContent>
      </Tabs>
    </div>
  )
}