"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CreditCard, Filter } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { createClient } from "@/lib/supabase-client";
import { Database } from "@/lib/supabase-types";

type Expense = Database["public"]["Tables"]["expenses"]["Row"];
type Vendor = Database["public"]["Tables"]["vendors"]["Row"];

type ExpenseWithVendor = Expense & { vendor: Vendor | null };

export default function ExpensesDashboard() {
  const [expenses, setExpenses] = useState<ExpenseWithVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpenses = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("expenses")
        .select("*, vendor:vendors(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching expenses:", error.message);
      } else {
        setExpenses(data as ExpenseWithVendor[]);
      }

      setLoading(false);
    };

    fetchExpenses();
  }, []);

  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

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
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
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
                        <td className="py-2">
                          {expense.created_at
                            ? new Date(expense.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>{expense.vendor?.name || "Unknown"}</td>
                        <td>{expense.category || "-"}</td>
                        <td className="text-right">₱{expense.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
