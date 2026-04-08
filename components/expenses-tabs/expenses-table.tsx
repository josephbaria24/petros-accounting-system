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
  HelpCircle,
  FileText,
  Wallet,
  Upload,
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
  const [codes, setCodes] = useState<{ id: string, code: string, name: string }[]>([]);

  const [showManageCodes, setShowManageCodes] = useState(false);

  // Pay Bills dialog state
  const [showPayBills, setShowPayBills] = useState(false);
  const [payBillsAccount, setPayBillsAccount] = useState("cash-on-hand");
  const [payBillsDate, setPayBillsDate] = useState(new Date().toISOString().split("T")[0]);
  const [payBillsRef, setPayBillsRef] = useState("");
  const [payBillsSelected, setPayBillsSelected] = useState<Set<string>>(new Set());
  const [payBillsAmounts, setPayBillsAmounts] = useState<Record<string, number>>({});
  const [payBillsDateFilter, setPayBillsDateFilter] = useState("last-12-months");


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

  // Expense creation state
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    payee_id: "",
    payment_account: "cash-on-hand",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "",
    ref_no: "",
    location: "Head Office - Puerto Princesa City",
    tags: "",
    memo: "",
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
          txnStatus: "paid",
          attachments: 0,
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
          txnStatus: b.status || "unpaid",
          attachments: 0,
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

  const handleSaveExpense = async () => {
    try {
      const subtotal = expenseFormData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      const { error } = await supabase.from("expenses").insert([{
        vendor_id: expenseFormData.payee_id || null,
        category: expenseFormData.items[0]?.category || null,
        amount: subtotal,
        payment_method: expenseFormData.payment_method || null,
        notes: expenseFormData.memo || null,
        created_at: expenseFormData.payment_date,
      }]);

      if (error) throw error;

      toast({ title: "Success", description: "Expense created successfully!" });
      setShowExpenseDialog(false);

      // Reset
      setExpenseFormData({
        payee_id: "",
        payment_account: "cash-on-hand",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "",
        ref_no: "",
        location: "Head Office - Puerto Princesa City",
        tags: "",
        memo: "",
        items: [{ category: "", description: "", amount: 0 }]
      });

      fetchData();
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast({ title: "Error", description: error?.message ?? "Failed to save expense.", variant: "destructive" });
    }
  };

  const handleAddExpenseItem = () => {
    setExpenseFormData({
      ...expenseFormData,
      items: [...expenseFormData.items, { category: "", description: "", amount: 0 }]
    });
  };

  const handleRemoveExpenseItem = (index: number) => {
    setExpenseFormData({
      ...expenseFormData,
      items: expenseFormData.items.filter((_, i) => i !== index)
    });
  };

  const handleExpenseItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...expenseFormData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setExpenseFormData({ ...expenseFormData, items: updatedItems });
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
            <Button variant="outline" size="sm" onClick={() => {
              // Generate a reference number
              const ref = Math.random().toString(36).substring(2, 8).toUpperCase();
              setPayBillsRef(ref);
              setPayBillsDate(new Date().toISOString().split("T")[0]);
              setPayBillsSelected(new Set());
              // Pre-fill amounts with full balance
              const amounts: Record<string, number> = {};
              bills.filter(b => b.status !== "paid").forEach(b => {
                amounts[b.id] = b.total_amount || 0;
              });
              setPayBillsAmounts(amounts);
              setShowPayBills(true);
            }}>
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
                <DropdownMenuItem onClick={() => setShowExpenseDialog(true)}>
                  Expense
                </DropdownMenuItem>
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
                  <th className="text-left p-3 font-medium">STATUS</th>
                  <th className="text-center p-3 font-medium">ATTACHMENTS</th>
                  <th className="text-left p-3 font-medium">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-8 text-muted-foreground">
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
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transaction.txnStatus === "paid"
                          ? "bg-green-100 text-green-800"
                          : transaction.txnStatus === "overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                          }`}>
                          {transaction.txnStatus === "paid" ? "Paid" : transaction.txnStatus === "overdue" ? "Overdue" : "Unpaid"}
                        </span>
                      </td>
                      <td className="p-3 text-center text-muted-foreground">
                        {transaction.attachments}
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
          className="w-[calc(100vw-2rem)] max-w-[1100px] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold leading-tight">New Bill</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {billFormData.bill_no || "No bill number"} · {suppliers.find(s => s.id === selectedSupplier)?.name || "No supplier"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balance due</span>
                <span className="text-lg font-bold text-green-700">
                  PHP{billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowBillDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Supplier */}
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supplier</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Choose a supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t" />

            {/* Form fields */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5 col-span-2 lg:col-span-1">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mailing address</Label>
                  <Textarea className="min-h-[80px] resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill no.</Label>
                  <Input value={billFormData.bill_no} onChange={(e) => setBillFormData({ ...billFormData, bill_no: e.target.value })} placeholder="Enter bill number" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill date</Label>
                  <Input type="date" value={billFormData.bill_date} onChange={(e) => setBillFormData({ ...billFormData, bill_date: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due date</Label>
                  <Input type="date" value={billFormData.due_date} onChange={(e) => setBillFormData({ ...billFormData, due_date: e.target.value })} className="h-10" />
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms</Label>
                  <Select value={billFormData.terms} onValueChange={(value) => setBillFormData({ ...billFormData, terms: value })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                      <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</Label>
                  <Select value={billFormData.location} onValueChange={(val) => setBillFormData({ ...billFormData, location: val })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Head Office - Puerto Princesa City">Head Office - Puerto Princesa City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project / Training Code</Label>
                  <Select value={selectedCode} onValueChange={setSelectedCode}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select code (optional)" /></SelectTrigger>
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
                      <button type="button" className="w-full px-2 py-1.5 text-left text-sm hover:bg-muted rounded-sm" onClick={(e) => { e.preventDefault(); setShowManageCodes(true); }}>
                        Manage codes…
                      </button>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ── Category Details Table ── */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category details</h3>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 text-left" style={{width: 40}}>#</th>
                      <th className="px-3 py-2.5 text-left">Category</th>
                      <th className="px-3 py-2.5 text-left">Description</th>
                      <th className="px-3 py-2.5 text-right" style={{width: 120}}>Amount (PHP)</th>
                      <th className="px-3 py-2.5 text-center" style={{width: 70}}>Billable</th>
                      <th className="px-3 py-2.5 text-left" style={{width: 130}}>Customer</th>
                      <th className="px-3 py-2.5 text-left" style={{width: 110}}>Class</th>
                      <th style={{width: 40}} />
                    </tr>
                  </thead>
                  <tbody>
                    {billFormData.items.map((item, index) => (
                      <tr key={index} className="border-t group hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2"><span className="text-xs text-muted-foreground font-medium">{index + 1}</span></td>
                        <td className="px-3 py-2">
                          <Input value={item.category} onChange={(e) => handleBillItemChange(index, "category", e.target.value)} placeholder="Category" className="h-9 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input value={item.description} onChange={(e) => handleBillItemChange(index, "description", e.target.value)} placeholder="Description" className="h-9 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" value={item.amount || ""} onChange={(e) => handleBillItemChange(index, "amount", parseFloat(e.target.value) || 0)} placeholder="0.00" className="h-9 text-sm text-right" />
                        </td>
                        <td className="px-3 py-2 text-center"><Checkbox /></td>
                        <td className="px-3 py-2"><Input placeholder="Customer" className="h-9 text-sm" /></td>
                        <td className="px-3 py-2"><Input placeholder="Class" className="h-9 text-sm" /></td>
                        <td className="px-3 py-2">
                          {billFormData.items.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveBillItem(index)} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500">
                              <Trash2Icon className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-2 px-3 py-2.5 border-t bg-muted/20">
                  <Button variant="ghost" size="sm" onClick={handleAddBillItem} className="h-8 text-xs font-medium text-green-700 hover:text-green-800 hover:bg-green-50">
                    + Add line
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setBillFormData({ ...billFormData, items: [{ category: "", description: "", amount: 0 }] })} className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground">
                    Clear all
                  </Button>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end mt-4">
                <div className="w-56 space-y-1.5 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">PHP{billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t font-bold text-base">
                    <span>Total</span>
                    <span>PHP{billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 shrink-0">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setShowBillDialog(false)}>Cancel</Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-9 text-sm">Print</Button>
              <Button variant="outline" className="h-9 text-sm">Make recurring</Button>
              <Button className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveBill}>Save</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white">
                    Save and new
                    <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSaveBill}>Save and new</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSaveBill}>Save and close</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Pay Bills Dialog */}
      <Dialog open={showPayBills} onOpenChange={setShowPayBills}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[1400px] h-[90vh] p-0 overflow-hidden flex flex-col"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white shrink-0">
              <DialogTitle className="text-xl font-semibold">Pay Bills</DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowPayBills(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Gray Info Section */}
            <div className="bg-gray-50 border-b px-6 py-5 shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-6">
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment account</Label>
                    <Select value={payBillsAccount} onValueChange={setPayBillsAccount}>
                      <SelectTrigger className="w-[200px] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash-on-hand">Cash on hand</SelectItem>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="petty-cash">Petty Cash</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Balance: PHP{(() => {
                        const balances: Record<string, string> = {
                          "cash-on-hand": "0.00",
                          "checking": "0.00",
                          "savings": "0.00",
                          "petty-cash": "0.00",
                        };
                        return balances[payBillsAccount] || "0.00";
                      })()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment date</Label>
                    <Input
                      type="date"
                      value={payBillsDate}
                      onChange={(e) => setPayBillsDate(e.target.value)}
                      className="w-[180px] bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Reference number</Label>
                    <Input
                      value={payBillsRef}
                      onChange={(e) => setPayBillsRef(e.target.value)}
                      className="w-[180px] bg-white"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <Label className="text-xs text-muted-foreground">TOTAL PAYMENT AMOUNT</Label>
                  <div className="text-3xl font-bold mt-1">
                    PHP{(() => {
                      let total = 0;
                      payBillsSelected.forEach((id) => {
                        total += payBillsAmounts[id] || 0;
                      });
                      return total.toLocaleString("en-US", { minimumFractionDigits: 2 });
                    })()}
                  </div>
                </div>
              </div>

              {/* Currency */}
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <Select defaultValue="php">
                  <SelectTrigger className="w-[220px] bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="php">PHP - Philippine Peso</SelectItem>
                    <SelectItem value="usd">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-green-600 text-green-600">
                      Filters
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setPayBillsDateFilter("last-12-months")}>Last 12 months</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPayBillsDateFilter("last-30-days")}>Last 30 days</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPayBillsDateFilter("all")}>All time</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm">
                  {payBillsDateFilter === "last-12-months" ? "Last 12 months" : payBillsDateFilter === "last-30-days" ? "Last 30 days" : "All time"}
                </Button>
              </div>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {/* Bills Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              {(() => {
                const unpaidBills = bills.filter((b) => b.status !== "paid");

                if (unpaidBills.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <h3 className="text-xl font-bold mb-2">
                        Looks like you don&apos;t have any bills to pay.
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Enter a bill to schedule a payment.
                      </p>
                      <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                          setShowPayBills(false);
                          setShowBillDialog(true);
                        }}
                      >
                        Enter new bill
                      </Button>
                    </div>
                  );
                }

                return (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3 w-10">
                            <Checkbox
                              checked={unpaidBills.length > 0 && payBillsSelected.size === unpaidBills.length}
                              onCheckedChange={() => {
                                if (payBillsSelected.size === unpaidBills.length) {
                                  setPayBillsSelected(new Set());
                                } else {
                                  setPayBillsSelected(new Set(unpaidBills.map((b) => b.id)));
                                }
                              }}
                            />
                          </th>
                          <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">PAYEE</th>
                          <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">REF NO.</th>
                          <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">DUE DATE</th>
                          <th className="text-right p-3 font-medium text-xs text-muted-foreground tracking-wider">OPEN BALANCE</th>
                          <th className="text-right p-3 font-medium text-xs text-muted-foreground tracking-wider">PAYMENT</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unpaidBills.map((bill) => (
                          <tr key={bill.id} className="border-b hover:bg-secondary/50 transition-colors">
                            <td className="p-3">
                              <Checkbox
                                checked={payBillsSelected.has(bill.id)}
                                onCheckedChange={() => {
                                  const next = new Set(payBillsSelected);
                                  if (next.has(bill.id)) next.delete(bill.id);
                                  else next.add(bill.id);
                                  setPayBillsSelected(next);
                                }}
                              />
                            </td>
                            <td className="p-3 font-medium">{bill.supplier?.name || "Unknown"}</td>
                            <td className="p-3">{bill.bill_no}</td>
                            <td className="p-3">
                              {bill.due_date
                                ? new Date(bill.due_date).toLocaleDateString("en-US", {
                                  month: "2-digit",
                                  day: "2-digit",
                                  year: "numeric",
                                })
                                : "—"}
                            </td>
                            <td className="p-3 text-right">
                              PHP{(bill.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right">
                              <Input
                                type="number"
                                className="w-[140px] text-right ml-auto"
                                value={payBillsAmounts[bill.id] ?? (bill.total_amount || 0)}
                                onChange={(e) => {
                                  setPayBillsAmounts((prev) => ({
                                    ...prev,
                                    [bill.id]: parseFloat(e.target.value) || 0,
                                  }));
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-white shrink-0">
              <Button
                variant="link"
                className="text-green-600 hover:text-green-700 px-0 font-semibold"
                onClick={() => setShowPayBills(false)}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  {payBillsSelected.size} bill{payBillsSelected.size !== 1 ? "s" : ""} selected
                </div>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white px-8"
                  disabled={payBillsSelected.size === 0}
                  onClick={async () => {
                    try {
                      const selectedIds = Array.from(payBillsSelected);
                      for (const id of selectedIds) {
                        const { error } = await supabase
                          .from("bills")
                          .update({ status: "paid" })
                          .eq("id", id);
                        if (error) throw error;
                      }
                      toast({
                        title: "Bills Paid",
                        description: `${selectedIds.length} bill${selectedIds.length > 1 ? "s" : ""} marked as paid.`,
                      });
                      setShowPayBills(false);
                      setPayBillsSelected(new Set());
                      await fetchData();
                    } catch (err: any) {
                      console.error(err);
                      toast({
                        title: "Error",
                        description: err?.message ?? "Failed to pay bills.",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Pay selected bills
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-[1100px] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center text-white shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold leading-tight">New Expense</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {suppliers.find(s => s.id === expenseFormData.payee_id)?.name || "No payee"} · {expenseFormData.payment_date || "No date"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount</span>
                <span className="text-lg font-bold text-orange-700">
                  PHP{expenseFormData.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowExpenseDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto">

            {/* Payee & Payment account */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payee</Label>
                  <Select value={expenseFormData.payee_id} onValueChange={(val) => setExpenseFormData({ ...expenseFormData, payee_id: val })}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Who did you pay?" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment account</Label>
                  <Select value={expenseFormData.payment_account} onValueChange={(val) => setExpenseFormData({ ...expenseFormData, payment_account: val })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash-on-hand">Cash on hand</SelectItem>
                      <SelectItem value="checking">Checking</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="petty-cash">Petty Cash</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Balance: -PHP4,457,511.76</p>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* Details row */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment date</Label>
                  <Input type="date" value={expenseFormData.payment_date} onChange={(e) => setExpenseFormData({ ...expenseFormData, payment_date: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment method</Label>
                  <Select value={expenseFormData.payment_method} onValueChange={(val) => setExpenseFormData({ ...expenseFormData, payment_method: val })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ref no.</Label>
                  <Input value={expenseFormData.ref_no} onChange={(e) => setExpenseFormData({ ...expenseFormData, ref_no: e.target.value })} className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</Label>
                  <Select value={expenseFormData.location} onValueChange={(val) => setExpenseFormData({ ...expenseFormData, location: val })}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Head Office - Puerto Princesa City">Head Office - Puerto Princesa City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</Label>
                  <button className="text-xs text-green-600 font-semibold hover:underline">Manage tags</button>
                </div>
                <Input placeholder="Start typing to add a tag" value={expenseFormData.tags} onChange={(e) => setExpenseFormData({ ...expenseFormData, tags: e.target.value })} className="h-10" />
              </div>
            </div>

            <div className="border-t" />

            {/* ── Category Details Table ── */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category details</h3>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full table-fixed text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 text-left" style={{width: 40}}>#</th>
                      <th className="px-3 py-2.5 text-left">Category</th>
                      <th className="px-3 py-2.5 text-left">Description</th>
                      <th className="px-3 py-2.5 text-right" style={{width: 120}}>Amount (PHP)</th>
                      <th className="px-3 py-2.5 text-center" style={{width: 70}}>Billable</th>
                      <th className="px-3 py-2.5 text-left" style={{width: 130}}>Customer</th>
                      <th className="px-3 py-2.5 text-left" style={{width: 110}}>Class</th>
                      <th style={{width: 40}} />
                    </tr>
                  </thead>
                  <tbody>
                    {expenseFormData.items.map((item, index) => (
                      <tr key={index} className="border-t group hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2"><span className="text-xs text-muted-foreground font-medium">{index + 1}</span></td>
                        <td className="px-3 py-2">
                          <Input value={item.category} onChange={(e) => handleExpenseItemChange(index, "category", e.target.value)} placeholder="Category" className="h-9 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input value={item.description} onChange={(e) => handleExpenseItemChange(index, "description", e.target.value)} placeholder="Description" className="h-9 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <Input type="number" value={item.amount || ""} onChange={(e) => handleExpenseItemChange(index, "amount", parseFloat(e.target.value))} placeholder="0.00" className="h-9 text-sm text-right" />
                        </td>
                        <td className="px-3 py-2 text-center"><Checkbox /></td>
                        <td className="px-3 py-2"><Input placeholder="Customer" className="h-9 text-sm" /></td>
                        <td className="px-3 py-2"><Input placeholder="Class" className="h-9 text-sm" /></td>
                        <td className="px-3 py-2">
                          {expenseFormData.items.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveExpenseItem(index)} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500">
                              <Trash2Icon className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center gap-2 px-3 py-2.5 border-t bg-muted/20">
                  <Button variant="ghost" size="sm" onClick={handleAddExpenseItem} className="h-8 text-xs font-medium text-orange-700 hover:text-orange-800 hover:bg-orange-50">
                    + Add line
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setExpenseFormData({ ...expenseFormData, items: [] })} className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground">
                    Clear all
                  </Button>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end mt-4">
                <div className="w-56 space-y-1.5 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">PHP{expenseFormData.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t font-bold text-base">
                    <span>Total</span>
                    <span>PHP{expenseFormData.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ── Memo & Attachments ── */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Memo</Label>
                  </div>
                  <Textarea className="min-h-[100px] resize-none" value={expenseFormData.memo} onChange={(e) => setExpenseFormData({ ...expenseFormData, memo: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</Label>
                  </div>
                  <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">Drag & drop files here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 shrink-0">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setShowExpenseDialog(false)}>Cancel</Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-9 text-sm">Print</Button>
              <Button variant="outline" className="h-9 text-sm">Make recurring</Button>
              <Button className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveExpense}>Save</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white">
                    Save and close
                    <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSaveExpense}>Save and new</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSaveExpense}>Save and close</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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