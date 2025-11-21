"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CreditCard, Filter } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/date-range-picker";
import { createClient } from "@/lib/supabase-client";
import type { Database } from "@/lib/supabase-types";

type Bill = Database["public"]["Tables"]["bills"]["Row"];

export default function BillsDashboard() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    const supabase = createClient();
    const { data, error } = await supabase.from("bills").select("*");

    if (error) {
      console.error("Error fetching bills:", error.message);
    } else {
      setBills(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const totalBills = bills.reduce((acc, bill) => acc + (bill.total_amount || 0), 0);

  return (
    <div className="flex flex-col min-h-screen p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Bills</h2>
        <div className="flex gap-2">
          <CalendarDateRangePicker />
          <Button variant="default">
            <Plus className="mr-2 h-4 w-4" />
            Add Bill
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
              <CardTitle>All Bills</CardTitle>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2">Bill No.</th>
                      <th>Vendor ID</th>
                      <th>Status</th>
                      <th>Due Date</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((bill) => (
                      <tr key={bill.id} className="border-b hover:bg-muted/50">
                        <td className="py-2">{bill.bill_no}</td>
                        <td>{bill.vendor_id}</td>
                        <td>{bill.status}</td>
                        <td>{bill.due_date || "N/A"}</td>
                        <td className="text-right">₱{(bill.total_amount || 0).toFixed(2)}</td>
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
                <CardTitle>Total Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">₱{totalBills.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Number of Bills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{bills.length}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
