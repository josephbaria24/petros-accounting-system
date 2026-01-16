//components\expenses-tabs\expenses-table.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { TransactionViewEditDialog } from "./transaction-view-edit-dialog";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ManageCodesModal from "@/components/invoice/manage-codes-modal";

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
  const [selectedCode, setSelectedCode] = useState("");
  const [codes, setCodes] = useState<{id: string, code: string, name: string}[]>([]);

  const [showManageCodes, setShowManageCodes] = useState(false);


  const [showTxnDialog, setShowTxnDialog] = useState(false);
const [txnDialogMode, setTxnDialogMode] = useState<"view" | "edit">("view");
const [selectedTxn, setSelectedTxn] = useState<any | null>(null);


  const [showEditDialog, setShowEditDialog] = useState(false);
const [editType, setEditType] = useState<"Expense" | "Bill" | null>(null);
const [editingId, setEditingId] = useState<string | null>(null);

const [expenseEdit, setExpenseEdit] = useState({
  vendor_id: "",
  category: "",
  amount: 0,
  payment_method: "",
  notes: "",
  code: "" as string | "",
});

const [billEdit, setBillEdit] = useState({
  vendor_id: "",
  bill_no: "",
  bill_date: new Date().toISOString().split("T")[0],
  due_date: new Date().toISOString().split("T")[0],
  notes: "",
  code: "" as string | "",
  items: [{ id: "", description: "", amount: 0 }],
});

  const [billFormData, setBillFormData] = useState({
    supplier_id: "",
    bill_no: "",
    bill_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    terms: "Net 30",
    location: "Head Office - Puerto Princesa City",
    notes: "",
    items: [{ category: "", description: "", amount: 0 }]
  });

  
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);


  
  async function fetchData() {
    setLoading(true);
    try {

       // Fetch codes - ADD THIS
    const { data: codesData } = await supabase
      .from("codes")
      .select("id, code, name")
      .order("code");
    
    setCodes(codesData || []);

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

  const fetchCodes = async () => {
  const { data, error } = await supabase
    .from("codes")
    .select("id, code, name")
    .order("code");

  if (!error) setCodes(data || []);
};


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


const handleSaveBill = async () => {
  if (!selectedSupplier) {
     toast({
      title: "Validation Error",
      description: "Please select a supplier",
      variant: "destructive",
    });
    return;
  }

  if (!billFormData.bill_no) {
    toast({
      title: "Validation Error",
      description: "Please enter a bill number",
      variant: "destructive",
    });
    return;
  }

  try {
    // Calculate totals
    const subtotal = billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const total = subtotal; // Add tax calculation if needed

// Insert bill
const { data: bill, error: billError } = await supabase
  .from("bills")
  .insert({
    vendor_id: selectedSupplier,
    bill_no: billFormData.bill_no,
    bill_date: billFormData.bill_date,
    due_date: billFormData.due_date,
    status: "unpaid",
    subtotal: subtotal,
    tax_total: 0,
    balance_due: total,
    notes: billFormData.notes,
    code: (selectedCode && selectedCode !== "none") ? selectedCode : null
  })
  .select()
  .single();

    if (billError) throw billError;

    // Insert bill items
    const itemsToInsert = billFormData.items
      .filter(item => item.description || item.amount > 0)
      .map(item => ({
        bill_id: bill.id,
        description: item.description,
        quantity: 1,
        unit_cost: item.amount,
        tax_rate: 0
      }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from("bill_items")
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
    }

    toast({
      title: "Success",
      description: "Bill created successfully!",
    });

    setShowBillDialog(false);
    
    // Reset form
    setSelectedSupplier("");
    setSelectedCode("");
    setBillFormData({
      supplier_id: "",
      bill_no: "",
      bill_date: new Date().toISOString().split("T")[0],
      due_date: new Date().toISOString().split("T")[0],
      terms: "Net 30",
      location: "Head Office - Puerto Princesa City",
      notes: "",
      items: [{ category: "", description: "", amount: 0 }]
    });
    
    // Refresh data
    fetchData();
  } catch (error) {
    console.error("Error saving bill:", error);
     toast({
      title: "Error",
      description: "Failed to save bill. Please try again.",
      variant: "destructive",
    });
  }
};

const handleAddBillItem = () => {
  setBillFormData({
    ...billFormData,
    items: [...billFormData.items, { category: "", description: "", amount: 0 }]
  });
};

const handleRemoveBillItem = (index: number) => {
  setBillFormData({
    ...billFormData,
    items: billFormData.items.filter((_, i) => i !== index)
  });
};

const handleBillItemChange = (index: number, field: string, value: any) => {
  const updatedItems = [...billFormData.items];
  updatedItems[index] = { ...updatedItems[index], [field]: value };
  setBillFormData({ ...billFormData, items: updatedItems });
};



const handleDeleteTransaction = async (transaction: any) => {
  try {
    const isBill = transaction.type === "Bill";
    const isExpense = transaction.type === "Expense";

    if (!isBill && !isExpense) {
      toast({
        title: "Cannot delete",
        description: `Unsupported transaction type: ${transaction.type}`,
        variant: "destructive",
      });
      return;
    }

    // Optional confirm (simple browser confirm)
    const ok = window.confirm(
      `Delete this ${transaction.type}? This action cannot be undone.`
    );
    if (!ok) return;

    if (isBill) {
      // 1) delete bill_items first (prevents FK constraint error)
      const { error: itemsError } = await supabase
        .from("bill_items")
        .delete()
        .eq("bill_id", transaction.id);

      if (itemsError) throw itemsError;

      // 2) delete bill
      const { error: billError } = await supabase
        .from("bills")
        .delete()
        .eq("id", transaction.id);

      if (billError) throw billError;
    }

    if (isExpense) {
      const { error: expenseError } = await supabase
        .from("expenses")
        .delete()
        .eq("id", transaction.id);

      if (expenseError) throw expenseError;
    }

    toast({
      title: "Deleted",
      description: `${transaction.type} was deleted successfully.`,
    });

    // refresh list
    await fetchData();
  } catch (err: any) {
    console.error("Delete failed:", err);
    toast({
      title: "Delete failed",
      description: err?.message ?? "Failed to delete. Please try again.",
      variant: "destructive",
    });
  }
};

const openEditDialog = async (transaction: any) => {
  setEditingId(transaction.id);
  setEditType(transaction.type);
  setShowEditDialog(true);

  if (transaction.type === "Expense") {
    setExpenseEdit({
      vendor_id: transaction.vendor_id ?? "",
      category: transaction.category ?? "",
      amount: Number(transaction.amount ?? 0),
      payment_method: transaction.payment_method ?? "",
      notes: transaction.notes ?? "",
      code: transaction.code ?? "",
    });
    return;
  }

  if (transaction.type === "Bill") {
    // preload bill header
    setBillEdit((prev) => ({
      ...prev,
      vendor_id: transaction.vendor_id ?? "",
      bill_no: transaction.bill_no ?? "",
      bill_date: transaction.bill_date ?? new Date().toISOString().split("T")[0],
      due_date: transaction.due_date ?? new Date().toISOString().split("T")[0],
      notes: transaction.notes ?? "",
      code: transaction.code ?? "",
      items: [],
    }));

    // fetch bill items
    const { data: items, error } = await supabase
      .from("bill_items")
      .select("id, description, unit_cost")
      .eq("bill_id", transaction.id)
      .order("id");

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setBillEdit((prev) => ({
      ...prev,
      items: (items ?? []).map((it) => ({
        id: it.id,
        description: it.description ?? "",
        amount: Number(it.unit_cost ?? 0),
      })),
    }));
  }
};


const handleSaveEdit = async () => {
  try {
    if (!editingId || !editType) return;

    if (editType === "Expense") {
      const { error } = await supabase
        .from("expenses")
        .update({
          vendor_id: expenseEdit.vendor_id || null,
          category: expenseEdit.category || null,
          amount: expenseEdit.amount,
          payment_method: expenseEdit.payment_method || null,
          notes: expenseEdit.notes || null,
          code: expenseEdit.code || null,
        })
        .eq("id", editingId);

      if (error) throw error;
    }

    if (editType === "Bill") {
      const subtotal = billEdit.items.reduce(
        (sum, it) => sum + (Number(it.amount) || 0),
        0
      );

      // update bill header
      const { error: billError } = await supabase
        .from("bills")
        .update({
          vendor_id: billEdit.vendor_id || null,
          bill_no: billEdit.bill_no,
          bill_date: billEdit.bill_date,
          due_date: billEdit.due_date || null,
          notes: billEdit.notes || null,
          code: billEdit.code || null,
          subtotal,
          tax_total: 0,
          balance_due: subtotal,
        })
        .eq("id", editingId);

      if (billError) throw billError;

      // simplest + reliable: replace bill items
      const { error: delItemsError } = await supabase
        .from("bill_items")
        .delete()
        .eq("bill_id", editingId);

      if (delItemsError) throw delItemsError;

      const itemsToInsert = billEdit.items
        .filter((i) => i.description || (i.amount ?? 0) > 0)
        .map((i) => ({
          bill_id: editingId,
          description: i.description,
          quantity: 1,
          unit_cost: Number(i.amount) || 0,
          tax_rate: 0,
        }));

      if (itemsToInsert.length) {
        const { error: insError } = await supabase
          .from("bill_items")
          .insert(itemsToInsert);

        if (insError) throw insError;
      }
    }

    toast({ title: "Saved", description: "Changes updated successfully." });
    setShowEditDialog(false);
    setEditingId(null);
    setEditType(null);
    await fetchData();
  } catch (err: any) {
    console.error(err);
    toast({
      title: "Save failed",
      description: err?.message ?? "Please try again.",
      variant: "destructive",
    });
  }
};


const addBillEditLine = () => {
  setBillEdit((prev) => ({
    ...prev,
    items: [...prev.items, { id: "", description: "", amount: 0 }],
  }));
};

const removeBillEditLine = (index: number) => {
  setBillEdit((prev) => ({
    ...prev,
    items: prev.items.filter((_, i) => i !== index),
  }));
};


const openView = (t: any) => {
  setSelectedTxn(t);
  setTxnDialogMode("view");
  setShowTxnDialog(true);
};

const openEdit = (t: any) => {
  setSelectedTxn(t);
  setTxnDialogMode("edit");
  setShowTxnDialog(true);
};



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
            {/* <Button variant="outline" size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              Give feedback
            </Button> */}
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
          {/* <Button variant="ghost" size="icon">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button> */}
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
        <td className="p-3">{transaction.category}</td>
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
              <Button variant="ghost" size="sm" className="text-green-600">
                View/Edit
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => openView(transaction)}>View</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEdit(transaction)}>Edit</DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => handleDeleteTransaction(transaction)}
              >
                Delete
              </DropdownMenuItem>


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






{/* Dialogs */}

<TransactionViewEditDialog
  open={showTxnDialog}
  onOpenChange={setShowTxnDialog}
  mode={txnDialogMode}
  transaction={selectedTxn}
  suppliers={suppliers}
  codes={codes}
  onSaved={fetchData}
/>




<Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        {editType === "Bill" ? "Edit Bill" : "Edit Expense"}
      </DialogTitle>
      <DialogDescription>
        Update the details then click Save.
      </DialogDescription>
    </DialogHeader>

    {/* EXPENSE EDIT */}
    {editType === "Expense" && (
      <div className="space-y-4">
        <div>
          <Label>Supplier</Label>
          <Select
            value={expenseEdit.vendor_id}
            onValueChange={(v) => setExpenseEdit((p) => ({ ...p, vendor_id: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Category</Label>
          <Input
            value={expenseEdit.category}
            onChange={(e) =>
              setExpenseEdit((p) => ({ ...p, category: e.target.value }))
            }
          />
        </div>

        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            value={expenseEdit.amount}
            onChange={(e) =>
              setExpenseEdit((p) => ({
                ...p,
                amount: parseFloat(e.target.value) || 0,
              }))
            }
          />
        </div>

        <div>
          <Label>Payment method</Label>
          <Input
            value={expenseEdit.payment_method}
            onChange={(e) =>
              setExpenseEdit((p) => ({ ...p, payment_method: e.target.value }))
            }
          />
        </div>

        <div>
          <Label>Code</Label>
          <Select
            value={expenseEdit.code || "none"}
            onValueChange={(v) =>
              setExpenseEdit((p) => ({ ...p, code: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select code (optional)" />
            </SelectTrigger>
           <SelectContent>
                <SelectItem value="none">No code</SelectItem>

                {codes.map((code) => (
                  <SelectItem key={code.id} value={code.code}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{code.code}</span>
                      <span className="text-xs text-muted-foreground">{code.name}</span>
                    </div>
                  </SelectItem>
                ))}

                <div className="my-1 h-px bg-border" />

                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted rounded-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowManageCodes(true);
                  }}
                >
                  Manage codes…
                </button>
              </SelectContent>


          </Select>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={expenseEdit.notes}
            onChange={(e) =>
              setExpenseEdit((p) => ({ ...p, notes: e.target.value }))
            }
          />
        </div>
      </div>
    )}

    {/* BILL EDIT */}
    {editType === "Bill" && (
      <div className="space-y-4">
        <div className="w-">
          <Label>Supplier</Label>
          <Select
            value={billEdit.vendor_id}
            onValueChange={(v) => setBillEdit((p) => ({ ...p, vendor_id: v }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Bill No.</Label>
            <Input
              value={billEdit.bill_no}
              onChange={(e) =>
                setBillEdit((p) => ({ ...p, bill_no: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Code</Label>
            <Select
              value={billEdit.code || "none"}
              onValueChange={(v) =>
                setBillEdit((p) => ({ ...p, code: v === "none" ? "" : v }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select code (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No code</SelectItem>
                {codes.map((c) => (
                  <SelectItem key={c.id} value={c.code}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Bill Date</Label>
            <Input
              type="date"
              value={billEdit.bill_date}
              onChange={(e) =>
                setBillEdit((p) => ({ ...p, bill_date: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={billEdit.due_date}
              onChange={(e) =>
                setBillEdit((p) => ({ ...p, due_date: e.target.value }))
              }
            />
          </div>
        </div>

        <div>
          <Label>Items</Label>
          <div className="space-y-2">
            {billEdit.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <Input
                  className="col-span-8"
                  placeholder="Description"
                  value={it.description}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBillEdit((p) => {
                      const items = [...p.items];
                      items[idx] = { ...items[idx], description: v };
                      return { ...p, items };
                    });
                  }}
                />
                <Input
                  className="col-span-3 text-right"
                  type="number"
                  placeholder="0.00"
                  value={it.amount}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setBillEdit((p) => {
                      const items = [...p.items];
                      items[idx] = { ...items[idx], amount: v };
                      return { ...p, items };
                    });
                  }}
                />
                <Button
                  className="col-span-1"
                  variant="ghost"
                  onClick={() => removeBillEditLine(idx)}
                  disabled={billEdit.items.length === 1}
                >
                  ✕
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addBillEditLine}>
              Add line
            </Button>
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Textarea
            value={billEdit.notes}
            onChange={(e) =>
              setBillEdit((p) => ({ ...p, notes: e.target.value }))
            }
          />
        </div>

        <div className="flex justify-end font-semibold">
          Total: PHP
          {billEdit.items
            .reduce((sum, it) => sum + (Number(it.amount) || 0), 0)
            .toFixed(2)}
        </div>
      </div>
    )}

    <div className="flex justify-end gap-2 mt-4">
      <Button variant="outline" onClick={() => setShowEditDialog(false)}>
        Cancel
      </Button>
      <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveEdit}>
        Save changes
      </Button>
    </div>
  </DialogContent>
</Dialog>


<Dialog open={showBillDialog} onOpenChange={setShowBillDialog}>
  <DialogContent
    showCloseButton={false}
    className="w-[calc(100vw-2rem)] max-w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col"
  >
    <div className="flex flex-col h-full">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-6 border-b bg-white shrink-0">
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

      {/* Content - Scrollable (X + Y) */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[1200px] p-6 scale-90 origin-top-left" style={{ width: '111.11%' }}>
          <div className="space-y-6">
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
            <div className="grid grid-cols-5 gap-4">
              <div>
                <Label>Mailing address</Label>
                <Textarea className="min-h-[100px]" />
              </div>
              <div>
                <Label>Bill no.</Label>
                <Input 
                  value={billFormData.bill_no}
                  onChange={(e) => setBillFormData({ ...billFormData, bill_no: e.target.value })}
                  placeholder="Enter bill number"
                />
              </div>
              <div>
                <Label>Bill date</Label>
                <Input 
                  type="date" 
                  value={billFormData.bill_date}
                  onChange={(e) => setBillFormData({ ...billFormData, bill_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Due date</Label>
                <Input 
                  type="date" 
                  value={billFormData.due_date}
                  onChange={(e) => setBillFormData({ ...billFormData, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Terms</Label>
                <Select 
                  value={billFormData.terms}
                  onValueChange={(value) => setBillFormData({ ...billFormData, terms: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Location</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Head Office - Puerto Princesa City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="head-office">
                      Head Office - Puerto Princesa City
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Code Selection */}
            <div>
              <Label>Project/Training Code</Label>
              <Select value={selectedCode} onValueChange={setSelectedCode}>
                <SelectTrigger>
                  <SelectValue placeholder="Select code (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No code</SelectItem>

                  {codes.map((code) => (
                    <SelectItem key={code.id} value={code.code}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{code.code}</span>
                        <span className="text-xs text-muted-foreground">{code.name}</span>
                      </div>
                    </SelectItem>
                  ))}

                  <div className="my-1 h-px bg-border" />

                  <button
                    type="button"
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted rounded-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowManageCodes(true);
                    }}
                  >
                    Manage codes…
                  </button>
                </SelectContent>

              </Select>
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
                        <th className="text-left p-3 font-medium min-w-[200px]">CATEGORY</th>
                        <th className="text-left p-3 font-medium min-w-[300px]">DESCRIPTION</th>
                        <th className="text-right p-3 font-medium min-w-[150px]">AMOUNT (PHP)</th>
                        <th className="text-center p-3 font-medium min-w-[100px]">BILLABLE</th>
                        <th className="text-left p-3 font-medium min-w-[200px]">CUSTOMER</th>
                        <th className="text-left p-3 font-medium min-w-[200px]">CLASS</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {billFormData.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-3">{index + 1}</td>
                          <td className="p-3">
                            <Input
                              value={item.category}
                              onChange={(e) => handleBillItemChange(index, 'category', e.target.value)}
                              placeholder="Category"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={item.description}
                              onChange={(e) => handleBillItemChange(index, 'description', e.target.value)}
                              placeholder="Description"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={item.amount || ''}
                              onChange={(e) => handleBillItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="text-right"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <Checkbox />
                          </td>
                          <td className="p-3">
                            <Input placeholder="Customer" />
                          </td>
                          <td className="p-3">
                            <Input placeholder="Class" />
                          </td>
                          <td className="p-3">
                            {billFormData.items.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveBillItem(index)}
                              >
                                <Trash2Icon className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={handleAddBillItem}>
                  Add lines
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setBillFormData({
                    ...billFormData,
                    items: [{ category: "", description: "", amount: 0 }]
                  })}
                >
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
                  <span className="font-semibold">
                    PHP{billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>
                    PHP{billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Memo and Attachments */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Memo</Label>
                <Textarea
                  value={billFormData.notes}
                  onChange={(e) =>
                    setBillFormData({ ...billFormData, notes: e.target.value })
                  }
                  placeholder="Add notes..."
                />
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
      </div>

      {/* Footer Actions - Fixed */}
      <div className="flex items-center justify-between p-6 border-t bg-white shrink-0">
        <Button variant="outline" onClick={() => setShowBillDialog(false)}>
          Cancel
        </Button>
        <div className="flex gap-2">
          <Button variant="outline">Print</Button>
          <Button variant="outline">Make recurring</Button>
          <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={handleSaveBill}
          >
            Save
          </Button>
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


            
<ManageCodesModal
  isOpen={showManageCodes}
  onClose={() => setShowManageCodes(false)}
  onUpdated={fetchCodes}
/>
    </div>
  );
}