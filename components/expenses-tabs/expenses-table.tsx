"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CreditCard, Filter } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/date-range-picker";

const dummyExpenses = [
  { id: 1, category: "Utilities", vendor: "Palawan Electric Co.", date: "2025-10-03", amount: 2500.0 },
  { id: 2, category: "Office Supplies", vendor: "National Bookstore", date: "2025-10-04", amount: 1450.5 },
  { id: 3, category: "Travel", vendor: "Cebu Pacific", date: "2025-10-07", amount: 7200.0 },
  { id: 4, category: "Software", vendor: "Adobe Inc.", date: "2025-10-12", amount: 1900.0 },
  { id: 5, category: "Telecom", vendor: "Globe Telecom", date: "2025-10-15", amount: 3600.0 },
  { id: 6, category: "Cloud Services", vendor: "Amazon Web Services", date: "2025-10-20", amount: 9800.0 },
  { id: 7, category: "Food", vendor: "McDonald's", date: "2025-10-21", amount: 500.75 },
  { id: 8, category: "E-commerce", vendor: "Lazada PH", date: "2025-10-23", amount: 2100.0 },
  { id: 9, category: "Subscriptions", vendor: "Netflix", date: "2025-10-25", amount: 550.0 },
  { id: 10, category: "Transportation", vendor: "GrabTaxi", date: "2025-10-27", amount: 430.0 },
  { id: 11, category: "Software", vendor: "Microsoft 365", date: "2025-10-28", amount: 6200.0 },
  { id: 12, category: "Utilities", vendor: "Palawan Electric Co.", date: "2025-11-01", amount: 2700.0 },
  { id: 13, category: "Office Supplies", vendor: "National Bookstore", date: "2025-11-03", amount: 1890.0 },
  { id: 14, category: "Travel", vendor: "AirAsia", date: "2025-11-05", amount: 8500.0 },
  { id: 15, category: "Software", vendor: "Slack Technologies", date: "2025-11-06", amount: 2200.0 },
  { id: 16, category: "Telecom", vendor: "Smart Communications", date: "2025-11-08", amount: 3900.0 },
  { id: 17, category: "E-commerce", vendor: "Shopee PH", date: "2025-11-10", amount: 1750.0 },
  { id: 18, category: "Cloud Services", vendor: "Google Workspace", date: "2025-11-12", amount: 8600.0 },
  { id: 19, category: "Food", vendor: "Jollibee", date: "2025-11-13", amount: 780.25 },
  { id: 20, category: "Transportation", vendor: "GrabTaxi", date: "2025-11-15", amount: 490.0 },
];

export default function ExpensesDashboard() {
  const [expenses] = useState(dummyExpenses);

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="flex flex-col min-h-screen p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Expenses</h2>
        <div className="flex gap-2">
          <CalendarDateRangePicker />
          <Button variant="default">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">
            <FileText className="mr-2 h-4 w-4" /> List View
          </TabsTrigger>
          <TabsTrigger value="summary">
            <CreditCard className="mr-2 h-4 w-4" /> Summary
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>All Expenses</CardTitle>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Date</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-muted/50">
                      <td className="py-2">{expense.date}</td>
                      <td>{expense.vendor}</td>
                      <td>{expense.category}</td>
                      <td className="text-right">₱{expense.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">₱{totalExpenses.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Number of Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{expenses.length}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}