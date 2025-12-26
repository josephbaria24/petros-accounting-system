"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CreditCard, Filter } from "lucide-react";
import { CalendarDateRangePicker } from "@/components/date-range-picker";

const dummyBills = [
  { id: 1, billNo: "B-001", vendor: "Globe Telecom", category: "Telecom", dueDate: "2025-11-30", status: "Unpaid", amount: 3500.00 },
  { id: 2, billNo: "B-002", vendor: "PLDT", category: "Telecom", dueDate: "2025-11-28", status: "Paid", amount: 2890.50 },
  { id: 3, billNo: "B-003", vendor: "Amazon Web Services", category: "Cloud Services", dueDate: "2025-11-25", status: "Unpaid", amount: 10500.00 },
  { id: 4, billNo: "B-004", vendor: "Palawan Electric Co.", category: "Utilities", dueDate: "2025-11-22", status: "Overdue", amount: 4600.75 },
  { id: 5, billNo: "B-005", vendor: "Zoom Video", category: "Subscriptions", dueDate: "2025-12-01", status: "Unpaid", amount: 1200.00 },
  { id: 6, billNo: "B-006", vendor: "Smart Communications", category: "Telecom", dueDate: "2025-11-18", status: "Paid", amount: 3100.00 },
  { id: 7, billNo: "B-007", vendor: "Google Workspace", category: "Cloud Services", dueDate: "2025-11-20", status: "Unpaid", amount: 9800.00 },
  { id: 8, billNo: "B-008", vendor: "Jollibee Corp.", category: "Food", dueDate: "2025-11-15", status: "Paid", amount: 1500.75 },
  { id: 9, billNo: "B-009", vendor: "Lazada PH", category: "E-commerce", dueDate: "2025-11-19", status: "Unpaid", amount: 2390.00 },
  { id: 10, billNo: "B-010", vendor: "Shopee PH", category: "E-commerce", dueDate: "2025-11-14", status: "Overdue", amount: 2100.00 },
  { id: 11, billNo: "B-011", vendor: "Microsoft 365", category: "Software", dueDate: "2025-11-21", status: "Unpaid", amount: 6200.00 },
  { id: 12, billNo: "B-012", vendor: "Slack Technologies", category: "Software", dueDate: "2025-11-16", status: "Paid", amount: 2200.00 },
  { id: 13, billNo: "B-013", vendor: "Notion Labs", category: "Subscriptions", dueDate: "2025-12-03", status: "Unpaid", amount: 890.00 },
  { id: 14, billNo: "B-014", vendor: "Adobe Inc.", category: "Software", dueDate: "2025-11-27", status: "Paid", amount: 3400.00 },
  { id: 15, billNo: "B-015", vendor: "GrabTaxi", category: "Transportation", dueDate: "2025-11-26", status: "Overdue", amount: 970.00 },
  { id: 16, billNo: "B-016", vendor: "PayPal", category: "Financial Services", dueDate: "2025-12-02", status: "Unpaid", amount: 4300.00 },
  { id: 17, billNo: "B-017", vendor: "Maya Business", category: "Financial Services", dueDate: "2025-12-01", status: "Paid", amount: 2800.00 },
  { id: 18, billNo: "B-018", vendor: "GCash", category: "Financial Services", dueDate: "2025-11-24", status: "Unpaid", amount: 1500.00 },
  { id: 19, billNo: "B-019", vendor: "BPI", category: "Bank Fees", dueDate: "2025-11-23", status: "Overdue", amount: 1200.00 },
  { id: 20, billNo: "B-020", vendor: "McDonald's", category: "Food", dueDate: "2025-11-29", status: "Unpaid", amount: 990.50 },
];

export default function BillsDashboard() {
  const [bills, setBills] = useState(dummyBills);
  const totalBills = bills.reduce((acc, b) => acc + b.amount, 0);

  return (
    <div className="flex flex-col min-h-screen p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Bills</h2>
        <div className="flex gap-2">
          <CalendarDateRangePicker />
          <Button variant="default" onClick={() => {
  const newId = bills.length + 1;
  const newBill = {
    id: newId,
    billNo: `B-${String(newId).padStart(3, '0')}`,
    vendor: "New Vendor",
    category: "Miscellaneous",
    dueDate: new Date().toISOString().split('T')[0],
    status: "Unpaid",
    amount: 0.0,
  };
  setBills([...bills, newBill]);
}}>
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
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Bill No.</th>
                    <th>Vendor</th>
                    <th>Category</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className="border-b hover:bg-muted/50">
                      <td className="py-2">{bill.billNo}</td>
                      <td>{bill.vendor}</td>
                      <td>{bill.category}</td>
                      <td>{bill.dueDate}</td>
                      <td>{bill.status}</td>
                      <td className="text-right">₱{bill.amount.toFixed(2)}</td>
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
