"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Filter,
  ChevronDown,
  MessageSquare,
  Settings,
  Printer,
  ExternalLink,
  X,
  Clipboard,
  Trash2Icon,
} from "lucide-react";

type Expense = {
  id: string;
  vendor_id: string | null;
  category: string | null;
  amount: number;
  payment_method: string | null;
  notes: string | null;
  created_at: string | null;
  supplier?: {
    name: string;
  };
};

type Bill = {
  id: string;
  vendor_id: string | null;
  bill_no: string;
  bill_date: string | null;
  due_date: string | null;
  status: string;
  total_amount: number | null;
  created_at: string | null;
  supplier?: {
    name: string;
  };
};

type Supplier = {
  id: string;
  name: string;
};

export default function ExpensesDashboard() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [dateFilter, setDateFilter] = useState("last-12-months");
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch expenses with supplier data
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .order("created_at", { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch bills with supplier data
      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .order("bill_date", { ascending: false });

      if (billsError) throw billsError;

      // Fetch suppliers
      const { data: suppliersData, error: suppliersError } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (suppliersError) throw suppliersError;

      setExpenses(expensesData || []);
      setBills(billsData || []);
      setSuppliers(suppliersData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTransactions = () => {
    let transactions: any[] = [];

    if (filterType === "all" || filterType === "expense") {
      transactions = [
        ...transactions,
        ...expenses.map((e) => ({
          ...e,
          type: "Expense",
          date: e.created_at,
          payee: e.supplier?.name || "Unknown",
          category: e.category || "--Split--",
          totalBeforeSalesTax: e.amount,
          salesTax: 0,
          total: e.amount,
          no: e.id.slice(0, 8),
        })),
      ];
    }

    if (filterType === "all" || filterType === "bill") {
      transactions = [
        ...transactions,
        ...bills.map((b) => ({
          ...b,
          type: "Bill",
          date: b.bill_date,
          payee: b.supplier?.name || "Unknown",
          category: "Bills",
          totalBeforeSalesTax: b.total_amount || 0,
          salesTax: 0,
          total: b.total_amount || 0,
          no: b.bill_no,
        })),
      ];
    }

    return transactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const transactions = filteredTransactions();

  return (
    <div className="flex flex-col">
      <div className="mb-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All transactions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All transactions</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="bill">Bill</SelectItem>
                <SelectItem value="bill-payment">Bill payment</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="purchase-order">Purchase order</SelectItem>
                <SelectItem value="recently-paid">Recently paid</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>

            <Button variant="outline" size="sm">
              Dates: Last 12 months
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              Give feedback
            </Button>
            <Button variant="outline" size="sm">
              Pay bills
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  New transaction
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowBillDialog(true)}>
                  Bill
                </DropdownMenuItem>
                <DropdownMenuItem>Expense</DropdownMenuItem>
                <DropdownMenuItem>Cheque</DropdownMenuItem>
                <DropdownMenuItem>Purchase order</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <Button variant="ghost" size="icon">
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-card border-b">
                <tr>
                  <th className="text-left p-3 font-medium w-10">
                    <Checkbox />
                  </th>
                  <th className="text-left p-3 font-medium">DATE</th>
                  <th className="text-left p-3 font-medium">TYPE</th>
                  <th className="text-left p-3 font-medium">NO.</th>
                  <th className="text-left p-3 font-medium">PAYEE</th>
                  <th className="text-left p-3 font-medium">CATEGORY</th>
                  <th className="text-right p-3 font-medium">
                    TOTAL BEFORE SALES TAX
                  </th>
                  <th className="text-right p-3 font-medium">SALES TAX</th>
                  <th className="text-right p-3 font-medium">TOTAL</th>
                  <th className="text-left p-3 font-medium">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-muted-foreground">
                      No transactions found. Click "New transaction" to add one.
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-secondary">
                      <td className="p-3">
                        <Checkbox />
                      </td>
                      <td className="p-3">
                        {new Date(transaction.date).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="p-3">{transaction.type}</td>
                      <td className="p-3">{transaction.no}</td>
                      <td className="p-3">{transaction.payee}</td>
                      <td className="p-3">
                        <Select defaultValue={transaction.category}>
                          <SelectTrigger className="w-[180px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={transaction.category}>
                              {transaction.category}
                            </SelectItem>
                            <SelectItem value="Utilities">Utilities</SelectItem>
                            <SelectItem value="Employee Sal">
                              Employee Sal
                            </SelectItem>
                            <SelectItem value="delivery Fee">
                              delivery Fee
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-right">
                        PHP{transaction.totalBeforeSalesTax.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        PHP{transaction.salesTax.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        PHP{transaction.total.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                            >
                              View/Edit
                              <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>View</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Dialog - Large Modal */}
      <Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
        <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] max-h-[90vh] p-0" showCloseButton={false}>
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <DialogTitle className="text-2xl">Bill</DialogTitle>
              <div className="flex items-center gap-2">
                <div className="text-right mr-8">
                  <div className="text-sm text-muted-foreground">BALANCE DUE</div>
                  <div className="text-3xl font-bold">PHP0.00</div>
                </div>
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBillDialog(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Supplier */}
                <div>
                  <Label>Supplier</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Form Fields Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-1">
                    <Label>Mailing address</Label>
                    <Textarea className="min-h-[100px]" />
                  </div>
                  <div>
                    <Label>Terms</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="net-30">Net 30</SelectItem>
                        <SelectItem value="net-60">Net 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bill date</Label>
                    <Input type="date" defaultValue="2025-11-21" />
                  </div>
                  <div>
                    <Label>Due date</Label>
                    <Input type="date" defaultValue="2025-11-21" />
                  </div>
                  <div>
                    <Label>Bill no.</Label>
                    <Input />
                  </div>
                </div>

                {/* Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Location</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Head Office - Puerto Princess C" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="head-office">
                          Head Office - Puerto Princess C
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label>Tags(?)</Label>
                  <Input placeholder="Start typing to add a tag" />
                </div>

                {/* Category Details */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Category details</h3>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left p-3 font-medium w-10">#</th>
                            <th className="text-left p-3 font-medium min-w-[150px]">
                              CATEGORY
                            </th>
                            <th className="text-left p-3 font-medium min-w-[200px]">
                              DESCRIPTION
                            </th>
                            <th className="text-right p-3 font-medium min-w-[120px]">
                              AMOUNT (PHP)
                            </th>
                            <th className="text-center p-3 font-medium">BILLABLE</th>
                            <th className="text-left p-3 font-medium min-w-[150px]">
                              CUSTOMER
                            </th>
                            <th className="text-left p-3 font-medium min-w-[150px]">
                              CLASS
                            </th>
                            <th className="w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b">
                            <td className="p-3">1</td>
                            <td className="p-3">
                              <Input className="h-8" />
                            </td>
                            <td className="p-3">
                              <Input className="h-8" />
                            </td>
                            <td className="p-3">
                              <Input className="h-8 text-right" />
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox />
                            </td>
                            <td className="p-3">
                              <Input className="h-8" />
                            </td>
                            <td className="p-3">
                              <Input className="h-8" />
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                >
                                  <Clipboard className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td className="p-3">2</td>
                            <td className="p-3">
                              <Input className="h-8" />
                            </td>
                            <td className="p-3">
                              <Input className="h-8" />
                            </td>
                            <td className="p-3">
                              <Input className="h-8 text-right" />
                            </td>
                            <td className="p-3 text-center">
                              <Checkbox />
                            </td>
                            <td className="p-3">
                              <Input className="h-8" />
                            </td>
                            <td className="p-3">
                              <Input className="h-8" />
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                >
                                  <Clipboard className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                >
                                  <Trash2Icon className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm">
                      Add lines
                    </Button>
                    <Button variant="outline" size="sm">
                      Clear all lines
                    </Button>
                  </div>
                </div>

                {/* Item Details */}
                <details>
                  <summary className="font-semibold cursor-pointer">
                    Item details
                  </summary>
                </details>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold">PHP0.00</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>PHP0.00</span>
                    </div>
                  </div>
                </div>

                {/* Memo and Attachments */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Memo</Label>
                    <Textarea />
                  </div>
                  <div>
                    <Label>Attachments</Label>
                    <div className="border-2 border-dashed rounded-lg p-8 text-center">
                      <Button variant="link" className="text-blue-600">
                        Add attachment
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Max file size: 20 MB
                      </p>
                      <Button variant="link" className="text-blue-600 text-xs">
                        Show existing
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-6 border-t bg-white">
              <Button variant="outline" onClick={() => setShowBillDialog(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">Print</Button>
                <Button variant="outline">Make recurring</Button>
                <Button className="bg-green-600 hover:bg-green-700">Save</Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-green-600 hover:bg-green-700">
                      Save and new
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Save and new</DropdownMenuItem>
                    <DropdownMenuItem>Save and close</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}