"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

// Import your components
import ExpensesDashboard from "@/components/expenses-tabs/expenses-table"
import VendorsTable from "@/components/expenses-tabs/vendors-table"

export default function ExpensesPage() {

  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Expenses</h1>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <ExpensesDashboard />
        </TabsContent>

        <TabsContent value="vendors">
          <VendorsTable />
        </TabsContent>
      </Tabs>
    </div>
  )
}
