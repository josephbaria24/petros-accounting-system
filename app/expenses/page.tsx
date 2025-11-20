"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase-client";
import { useEffect, useState } from "react";




type Expense = {
  id: string;
  vendor: string;
  category: string;
  amount: number;
  date: string;
  status?: string;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState("this-month");

  useEffect(() => {
    const fetchExpenses = async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("expenses")
        .select(`
          id,
          category,
          amount,
          created_at,
          vendors (name)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching expenses:", error.message);
        return;
      }

      const mapped = (data || []).map((exp: any) => ({
        id: exp.id,
        category: exp.category,
        amount: parseFloat(exp.amount),
        vendor: exp.vendors?.name || "Unknown",
        date: new Date(exp.created_at).toISOString().split("T")[0],
        status: "Paid", // You can replace this with actual status field if available
      }));

      setExpenses(mapped);
    };

    fetchExpenses();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <p className="text-muted-foreground">Track, manage, and analyze your business expenses in one place.</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full grid grid-cols-4 md:grid-cols-5 gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between gap-4 mb-4 flex-wrap">
                <Input placeholder="Search by vendor..." className="w-full md:w-64" />
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-month">This Month</SelectItem>
                    <SelectItem value="last-month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>{exp.date}</TableCell>
                      <TableCell>{exp.vendor}</TableCell>
                      <TableCell>{exp.category}</TableCell>
                      <TableCell className="text-right">${exp.amount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{exp.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts">
          <Card>
            <CardHeader><CardTitle>Upload Receipts</CardTitle></CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">Attach scanned receipts for recordkeeping.</p>
              <div className="border border-dashed rounded-lg p-6">
                <p className="text-sm">Drag and drop your receipt here or click to browse.</p>
                <Button className="mt-4">Upload Receipt</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader><CardTitle>Vendors</CardTitle></CardHeader>
            <CardContent>
              {/* Optional: Load vendor stats here */}
              <p className="text-muted-foreground">Coming soon: vendor-specific analytics</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader><CardTitle>Expense Categories</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">This will show categories and spending percentages</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader><CardTitle>Smart Insights</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">You can generate automated insights here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
