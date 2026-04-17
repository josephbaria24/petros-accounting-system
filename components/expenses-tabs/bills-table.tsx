//components\expenses-tabs\bills-table.tsx

"use client";

import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase-client";
import { fetchAllPaged } from "@/lib/supabase-fetch-all";
import { TransactionViewEditDialog } from "./transaction-view-edit-dialog";
import { PaymentMethodSelect } from "./payment-method-select";
import { ExpenseCategorySelect } from "./expense-category-select";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  Filter,
  Download,
  X,
  Trash2Icon,
  FileText,
  Receipt,
} from "lucide-react";

type Bill = {
  id: string;
  vendor_id: string | null;
  bill_no: string;
  bill_date: string | null;
  due_date: string | null;
  status: string;
  total_amount: number | null;
  category?: string | null;
  notes?: string | null;
  code?: string | null;
  created_at: string | null;
  supplier?: {
    name: string;
  };
};

type Supplier = {
  id: string;
  name: string;
};

type SupplierRow = {
  id: string;
  name: string;
};

export default function BillsTable() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [codes, setCodes] = useState<{ id: string; code: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"for-review" | "unpaid" | "paid">("for-review");
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());

  // Filter panel state
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterDates, setFilterDates] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAmountType, setFilterAmountType] = useState("between");
  const [filterAmountMin, setFilterAmountMin] = useState("");
  const [filterAmountMax, setFilterAmountMax] = useState("");
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  // Applied filter snapshot (only applied on "Apply" click)
  const [appliedFilters, setAppliedFilters] = useState({
    dates: "all",
    dateFrom: "",
    dateTo: "",
    category: "",
    amountType: "between",
    amountMin: "",
    amountMax: "",
  });

  // Add bill dialog
  const [showBillDialog, setShowBillDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [selectedCode, setSelectedCode] = useState("");
  const [showManageCodes, setShowManageCodes] = useState(false);

  // View/Edit dialog
  const [showTxnDialog, setShowTxnDialog] = useState(false);
  const [txnDialogMode, setTxnDialogMode] = useState<"view" | "edit">("view");
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);

  // Pay Bills dialog
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payingSaving, setPayingSaving] = useState(false);
  const [payForm, setPayForm] = useState({
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "Bank Transfer",
    payment_account: "",
    memo: "",
  });

  const [billFormData, setBillFormData] = useState({
    supplier_id: "",
    bill_no: "",
    bill_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    terms: "Net 30",
    location: "Head Office - Puerto Princesa City",
    notes: "",
    items: [{ category: "", description: "", amount: 0 }],
  });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: codesData } = await supabase
        .from("codes")
        .select("id, code, name")
        .order("code");
      setCodes(codesData || []);

      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select(`
          *,
          supplier:suppliers(name)
        `)
        .order("bill_date", { ascending: false });

      if (billsError) throw billsError;

      const suppliersData = await fetchAllPaged<SupplierRow>((from, to) =>
        supabase.from("suppliers").select("id, name").order("name").range(from, to) as unknown as Promise<{
          data: SupplierRow[] | null;
          error: unknown;
        }>
      );

      setBills(billsData || []);
      setSuppliers(suppliersData);
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : (error as { message?: string })?.message || JSON.stringify(error);
      console.error("Error fetching data:", msg, error);
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

  // Get unique categories from bills
  const uniqueCategories = Array.from(
    new Set(bills.map((b) => b.category || "Bills").filter(Boolean))
  ).sort();

  // Apply filters
  const applyFilters = () => {
    const newApplied = {
      dates: filterDates,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      category: filterCategory,
      amountType: filterAmountType,
      amountMin: filterAmountMin,
      amountMax: filterAmountMax,
    };
    setAppliedFilters(newApplied);

    // Count active filters
    let count = 0;
    if (newApplied.dates !== "all") count++;
    if (newApplied.category) count++;
    if (newApplied.amountMin || newApplied.amountMax) count++;
    setActiveFiltersCount(count);
    setShowFilterPanel(false);
  };

  const resetFilters = () => {
    setFilterDates("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterCategory("");
    setFilterAmountType("between");
    setFilterAmountMin("");
    setFilterAmountMax("");
    const cleared = {
      dates: "all",
      dateFrom: "",
      dateTo: "",
      category: "",
      amountType: "between",
      amountMin: "",
      amountMax: "",
    };
    setAppliedFilters(cleared);
    setActiveFiltersCount(0);
  };

  // Filter bills by status + advanced filters
  const filteredBills = bills.filter((bill) => {
    // Status tab filter
    if (statusFilter === "paid" && bill.status !== "paid") return false;
    if (statusFilter === "unpaid" && bill.status !== "unpaid") return false;
    if (statusFilter === "for-review" && bill.status === "paid") return false;

    // Date filter
    if (appliedFilters.dates !== "all") {
      const billDate = bill.bill_date ? new Date(bill.bill_date) : null;
      if (!billDate) return false;
      const now = new Date();

      if (appliedFilters.dates === "today") {
        const todayStr = now.toISOString().split("T")[0];
        if (bill.bill_date !== todayStr) return false;
      } else if (appliedFilters.dates === "this-week") {
        const day = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        start.setHours(0, 0, 0, 0);
        if (billDate < start || billDate > now) return false;
      } else if (appliedFilters.dates === "this-month") {
        if (billDate.getMonth() !== now.getMonth() || billDate.getFullYear() !== now.getFullYear()) return false;
      } else if (appliedFilters.dates === "this-year") {
        if (billDate.getFullYear() !== now.getFullYear()) return false;
      } else if (appliedFilters.dates === "last-30-days") {
        const past30 = new Date(now);
        past30.setDate(now.getDate() - 30);
        if (billDate < past30) return false;
      } else if (appliedFilters.dates === "last-90-days") {
        const past90 = new Date(now);
        past90.setDate(now.getDate() - 90);
        if (billDate < past90) return false;
      } else if (appliedFilters.dates === "custom") {
        if (appliedFilters.dateFrom && billDate < new Date(appliedFilters.dateFrom)) return false;
        if (appliedFilters.dateTo) {
          const to = new Date(appliedFilters.dateTo);
          to.setHours(23, 59, 59, 999);
          if (billDate > to) return false;
        }
      }
    }

    // Category filter
    if (appliedFilters.category) {
      const billCat = bill.category || "Bills";
      if (billCat !== appliedFilters.category) return false;
    }

    // Amount filter
    const amount = bill.total_amount || 0;
    const min = appliedFilters.amountMin ? parseFloat(appliedFilters.amountMin) : null;
    const max = appliedFilters.amountMax ? parseFloat(appliedFilters.amountMax) : null;

    if (appliedFilters.amountType === "between") {
      if (min !== null && amount < min) return false;
      if (max !== null && amount > max) return false;
    } else if (appliedFilters.amountType === "greater-than") {
      if (min !== null && amount <= min) return false;
    } else if (appliedFilters.amountType === "less-than") {
      if (max !== null && amount >= max) return false;
    } else if (appliedFilters.amountType === "equal-to") {
      if (min !== null && amount !== min) return false;
    }

    return true;
  });

  const tabCounts = useMemo(
    () => ({
      forReview: bills.filter((b) => b.status !== "paid").length,
      unpaid: bills.filter((b) => b.status === "unpaid").length,
      paid: bills.filter((b) => b.status === "paid").length,
    }),
    [bills]
  );

  const formatMoney = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Select all toggle
  const toggleSelectAll = () => {
    if (selectedBills.size === filteredBills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(filteredBills.map((b) => b.id)));
    }
  };

  const toggleSelectBill = (id: string) => {
    const next = new Set(selectedBills);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBills(next);
  };

  // Bill creation
  const handleSaveBill = async () => {
    if (!selectedSupplier) {
      toast({ title: "Validation Error", description: "Please select a supplier", variant: "destructive" });
      return;
    }
    if (!billFormData.bill_no) {
      toast({ title: "Validation Error", description: "Please enter a bill number", variant: "destructive" });
      return;
    }

    try {
      const subtotal = billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0);

      const { data: bill, error: billError } = await supabase
        .from("bills")
        .insert({
          vendor_id: selectedSupplier || null,
          bill_no: billFormData.bill_no,
          bill_date: billFormData.bill_date || null,
          due_date: billFormData.due_date || null,
          status: "unpaid" as const,
          subtotal: subtotal,
          tax_total: 0,
          balance_due: subtotal,
          notes: billFormData.notes || null,
        })
        .select()
        .single();

      if (billError) {
        const errMsg = billError.message || billError.details || billError.hint || billError.code || "Unknown Supabase error";
        throw new Error(`Bills insert failed: ${errMsg}`);
      }

      const itemsToInsert = billFormData.items
        .filter(
          (item) =>
            (item.description && item.description.trim()) ||
            (item.category && item.category.trim()) ||
            (item.amount || 0) > 0,
        )
        .map((item) => ({
          bill_id: bill.id,
          category: item.category?.trim() || null,
          description: item.description?.trim() || "—",
          quantity: 1,
          unit_cost: item.amount || 0,
          tax_rate: 0,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from("bill_items").insert(itemsToInsert);
        if (itemsError) {
          const errMsg = itemsError.message || itemsError.details || itemsError.hint || itemsError.code || "Unknown Supabase error";
          throw new Error(`Bill items insert failed: ${errMsg}`);
        }
      }

      toast({ title: "Success", description: "Bill created successfully!" });
      setShowBillDialog(false);
      resetBillForm();
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error saving bill:", msg);
      toast({
        title: "Error saving bill",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const handlePayBills = async () => {
    if (selectedBills.size === 0) {
      toast({ title: "No bills selected", description: "Select at least one bill to pay.", variant: "destructive" });
      return;
    }
    setPayingSaving(true);
    try {
      const ids = Array.from(selectedBills);
      const { error } = await supabase
        .from("bills")
        .update({ status: "paid" })
        .in("id", ids);

      if (error) {
        const errMsg = error.message || error.details || error.hint || error.code || "Unknown error";
        throw new Error(errMsg);
      }

      toast({ title: "Bills paid", description: `${ids.length} bill${ids.length > 1 ? "s" : ""} marked as paid.` });
      setShowPayDialog(false);
      setSelectedBills(new Set());
      setPayForm({
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "Bank Transfer",
        payment_account: "",
        memo: "",
      });
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error paying bills:", msg);
      toast({ title: "Error paying bills", description: msg, variant: "destructive" });
    } finally {
      setPayingSaving(false);
    }
  };

  const resetBillForm = () => {
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
      items: [{ category: "", description: "", amount: 0 }],
    });
  };

  const handleAddBillItem = () => {
    setBillFormData({
      ...billFormData,
      items: [...billFormData.items, { category: "", description: "", amount: 0 }],
    });
  };

  const handleRemoveBillItem = (index: number) => {
    setBillFormData({
      ...billFormData,
      items: billFormData.items.filter((_, i) => i !== index),
    });
  };

  const handleBillItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...billFormData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setBillFormData({ ...billFormData, items: updatedItems });
  };

  // Delete
  const handleDeleteBill = async (bill: Bill) => {
    const ok = window.confirm("Delete this bill? This action cannot be undone.");
    if (!ok) return;

    try {
      const { error: itemsError } = await supabase.from("bill_items").delete().eq("bill_id", bill.id);
      if (itemsError) throw itemsError;

      const { error: billError } = await supabase.from("bills").delete().eq("id", bill.id);
      if (billError) throw billError;

      toast({ title: "Deleted", description: "Bill was deleted successfully." });
      await fetchData();
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast({ title: "Delete failed", description: err?.message ?? "Failed to delete. Please try again.", variant: "destructive" });
    }
  };

  // View/Edit dialogs
  const openView = (bill: Bill) => {
    const txn = {
      ...bill,
      type: "Bill",
      date: bill.bill_date,
      payee: bill.supplier?.name || "Unknown",
      category: "Bills",
      totalBeforeSalesTax: bill.total_amount || 0,
      salesTax: 0,
      total: bill.total_amount || 0,
      no: bill.bill_no,
    };
    setSelectedTxn(txn);
    setTxnDialogMode("view");
    setShowTxnDialog(true);
  };

  const openEdit = (bill: Bill) => {
    const txn = {
      ...bill,
      type: "Bill",
      date: bill.bill_date,
      payee: bill.supplier?.name || "Unknown",
      category: "Bills",
      totalBeforeSalesTax: bill.total_amount || 0,
      salesTax: 0,
      total: bill.total_amount || 0,
      no: bill.bill_no,
    };
    setSelectedTxn(txn);
    setTxnDialogMode("edit");
    setShowTxnDialog(true);
  };

  const billStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid")
      return (
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 font-normal capitalize text-emerald-800 dark:text-emerald-200">
          Paid
        </Badge>
      );
    if (s === "overdue")
      return (
        <Badge variant="outline" className="border-red-500/40 bg-red-500/10 font-normal capitalize text-red-800 dark:text-red-200">
          Overdue
        </Badge>
      );
    if (s === "partial")
      return (
        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 font-normal capitalize text-amber-900 dark:text-amber-100">
          Partial
        </Badge>
      );
    return (
      <Badge variant="outline" className="font-normal capitalize text-muted-foreground">
        {s || "Unpaid"}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight">Bills</CardTitle>
              <CardDescription>
                Track vendor bills, approvals, and payments. {loading ? "Loading…" : `${filteredBills.length} in this view`}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-border/80"
              disabled={selectedBills.size === 0}
              onClick={() => setShowPayDialog(true)}
            >
              Pay bills{selectedBills.size > 0 ? ` (${selectedBills.size})` : ""}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                  Add bill
                  <ChevronDown className="h-4 w-4 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setShowBillDialog(true)}>Create bill manually</DropdownMenuItem>
                <DropdownMenuItem>Upload bill</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          {/* Status filter — pill group */}
          <div
            className="flex w-full flex-wrap gap-2 rounded-xl border border-border/80 bg-muted/40 p-1 sm:w-auto sm:inline-flex"
            role="tablist"
            aria-label="Bill status"
          >
            {(
              [
                { id: "for-review" as const, label: "For review", count: tabCounts.forReview },
                { id: "unpaid" as const, label: "Unpaid", count: tabCounts.unpaid },
                { id: "paid" as const, label: "Paid", count: tabCounts.paid },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={statusFilter === tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-initial",
                  statusFilter === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                    statusFilter === tab.id ? "bg-muted/80 text-foreground" : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 border-border/80">
                    Batch actions
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem>Mark as paid</DropdownMenuItem>
                  <DropdownMenuItem>Mark as unpaid</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive">Delete selected</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant={showFilterPanel ? "secondary" : "outline"}
                size="sm"
                className="gap-1 border-border/80"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
              >
                <Filter className="h-4 w-4" />
                Filter
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 rounded-full px-1.5 text-[11px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </div>

            <Button variant="outline" size="sm" className="gap-2 border-border/80">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
        <div className="rounded-xl border border-border/80 bg-muted/10 p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {/* Dates */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">Dates</Label>
                  <Select value={filterDates} onValueChange={(v) => {
                    setFilterDates(v);
                    if (v !== "custom") {
                      setFilterDateFrom("");
                      setFilterDateTo("");
                    }
                  }}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Dates</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this-week">This Week</SelectItem>
                      <SelectItem value="this-month">This Month</SelectItem>
                      <SelectItem value="this-year">This Year</SelectItem>
                      <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                      <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">From</Label>
                  <Input
                    type="date"
                    placeholder="Enter date"
                    value={filterDateFrom}
                    onChange={(e) => {
                      setFilterDateFrom(e.target.value);
                      if (e.target.value) setFilterDates("custom");
                    }}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground font-medium">To</Label>
                  <Input
                    type="date"
                    placeholder="Enter date"
                    value={filterDateTo}
                    onChange={(e) => {
                      setFilterDateTo(e.target.value);
                      if (e.target.value) setFilterDates("custom");
                    }}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Account/Category */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Account/Category</Label>
              <Select value={filterCategory || "__all__"} onValueChange={(v) => setFilterCategory(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account/category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All categories</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-medium">Amount</Label>
              <Select value={filterAmountType} onValueChange={setFilterAmountType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="between">Between</SelectItem>
                  <SelectItem value="greater-than">Greater than</SelectItem>
                  <SelectItem value="less-than">Less than</SelectItem>
                  <SelectItem value="equal-to">Equal to</SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-2">
                {(filterAmountType === "between" || filterAmountType === "greater-than" || filterAmountType === "equal-to") && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {filterAmountType === "between" ? "Minimum" : filterAmountType === "equal-to" ? "Amount" : "Amount"}
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={filterAmountMin}
                      onChange={(e) => setFilterAmountMin(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
                {(filterAmountType === "between" || filterAmountType === "less-than") && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      {filterAmountType === "between" ? "Maximum" : "Amount"}
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={filterAmountMax}
                      onChange={(e) => setFilterAmountMax(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={resetFilters}>
              Reset filters
            </Button>
            <Button size="sm" className="bg-emerald-600 px-8 hover:bg-emerald-700" onClick={applyFilters}>
              Apply
            </Button>
          </div>
        </div>
      )}

          {/* Table */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
              <Table className="table-fixed min-w-[1180px]">
                <TableHeader>
                  <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredBills.length > 0 && selectedBills.size === filteredBills.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all bills"
                      />
                    </TableHead>
                    <TableHead className="w-[200px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Bill
                    </TableHead>
                    <TableHead className="w-[100px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Source
                    </TableHead>
                    <TableHead className="w-[160px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Supplier
                    </TableHead>
                    <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Bill no.
                    </TableHead>
                    <TableHead className="w-[110px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Bill date
                    </TableHead>
                    <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Category
                    </TableHead>
                    <TableHead className="w-[110px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Due date
                    </TableHead>
                    <TableHead className="w-[100px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="w-[120px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Amount
                    </TableHead>
                    <TableHead className="w-[128px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="py-16">
                        <div className="flex flex-col items-center gap-4 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/30">
                            <FileText className="h-7 w-7 text-muted-foreground/60" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold tracking-tight">
                              {statusFilter === "paid"
                                ? "No paid bills"
                                : statusFilter === "unpaid"
                                  ? "No unpaid bills"
                                  : "No bills to review"}
                            </h3>
                            <p className="mx-auto max-w-md text-sm text-muted-foreground">
                              When you have bills ready to review, you&apos;ll find them here. To create one, use{" "}
                              <button
                                type="button"
                                className="font-medium text-foreground underline-offset-4 hover:underline"
                                onClick={() => setShowBillDialog(true)}
                              >
                                Add bill
                              </button>
                              .
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => (
                      <TableRow key={bill.id} className="h-12 border-border/60 hover:bg-muted/30">
                        <TableCell>
                          <Checkbox
                            checked={selectedBills.has(bill.id)}
                            onCheckedChange={() => toggleSelectBill(bill.id)}
                            aria-label={`Select bill ${bill.bill_no}`}
                          />
                        </TableCell>
                        <TableCell className="whitespace-normal">
                          <div className="flex min-w-0 items-center gap-2">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="block truncate font-medium" title={bill.supplier?.name || undefined}>
                              {bill.supplier?.name || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">Manual</TableCell>
                        <TableCell className="whitespace-normal text-sm">
                          <span className="block max-w-[160px] truncate" title={bill.supplier?.name || undefined}>
                            {bill.supplier?.name || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm tabular-nums">{bill.bill_no}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {bill.bill_date
                            ? new Date(bill.bill_date).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="whitespace-normal text-sm">
                          <span className="line-clamp-2">{bill.category || "Bills"}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {bill.due_date
                            ? new Date(bill.due_date).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>{billStatusBadge(bill.status)}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {formatMoney(bill.total_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 font-normal">
                                View / Edit
                                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openView(bill)}>View</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(bill)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteBill(bill)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction View/Edit Dialog */}
      <TransactionViewEditDialog
        open={showTxnDialog}
        onOpenChange={setShowTxnDialog}
        mode={txnDialogMode}
        transaction={selectedTxn}
        suppliers={suppliers}
        codes={codes}
        onSaved={fetchData}
      />

      {/* Bill Creation Dialog */}
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
                  PHP{billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowBillDialog(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Body — scrollable ── */}
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
                  <Textarea className="min-h-[80px] resize-none h-10" />
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
                  <Select defaultValue="head-office">
                    <SelectTrigger className="h-10"><SelectValue placeholder="Head Office - Puerto Princesa City" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="head-office">Head Office - Puerto Princesa City</SelectItem>
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
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category details</h3>
                </div>
                <p className="text-[11px] text-muted-foreground max-w-xl sm:text-right">
                  Pick a <span className="font-medium text-foreground">category</span> from your expense list per line (same as new expense).
                </p>
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
                          <ExpenseCategorySelect
                            value={item.category}
                            onValueChange={(name) => handleBillItemChange(index, "category", name)}
                            idPrefix={`new-bill-cat-${index}`}
                          />
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
                    <span className="font-semibold">PHP{billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-t font-bold text-base">
                    <span>Total</span>
                    <span>PHP{billFormData.items.reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ── Memo & Attachments ── */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Memo</Label>
                  <Textarea value={billFormData.notes} onChange={(e) => setBillFormData({ ...billFormData, notes: e.target.value })} placeholder="Add notes..." className="min-h-[80px] resize-none" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</Label>
                  <div className="border-2 border-dashed rounded-lg p-5 text-center">
                    <button className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline">Add attachment</button>
                    <p className="text-xs text-muted-foreground mt-1">Max file size: 20 MB</p>
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
                  <DropdownMenuItem>Save and new</DropdownMenuItem>
                  <DropdownMenuItem>Save and close</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Codes Modal */}
      <ManageCodesModal isOpen={showManageCodes} onClose={() => setShowManageCodes(false)} onUpdated={fetchCodes} />

      {/* Pay Bills Dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-xl font-semibold">Pay bills</DialogTitle>

          {/* Selected bills summary */}
          <div className="border rounded-lg overflow-hidden text-sm mb-2">
            <div className="bg-muted px-4 py-2 font-medium text-muted-foreground flex justify-between">
              <span>Bill</span>
              <span>Amount due</span>
            </div>
            {Array.from(selectedBills).map((id) => {
              const bill = bills.find((b) => b.id === id);
              if (!bill) return null;
              return (
                <div key={id} className="flex items-center justify-between px-4 py-2 border-t">
                  <div>
                    <p className="font-medium">{bill.supplier?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">#{bill.bill_no}</p>
                  </div>
                  <span className="font-semibold">
                    PHP{(bill.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between px-4 py-2 border-t bg-muted font-semibold">
              <span>Total</span>
              <span>
                PHP{Array.from(selectedBills)
                  .reduce((sum, id) => {
                    const b = bills.find((x) => x.id === id);
                    return sum + (b?.total_amount || 0);
                  }, 0)
                  .toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Payment details */}
          <div className="space-y-4 pt-2">
            <div>
              <Label>Payment date</Label>
              <Input
                type="date"
                className="mt-2"
                value={payForm.payment_date}
                onChange={(e) => setPayForm({ ...payForm, payment_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment method</Label>
              <div className="mt-2">
                <PaymentMethodSelect
                  value={payForm.payment_method}
                  onValueChange={(v) => setPayForm({ ...payForm, payment_method: v })}
                  idPrefix="pay-bill"
                />
              </div>
            </div>
            <div>
              <Label>Payment account <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                className="mt-2"
                placeholder="e.g. BDO Checking Account"
                value={payForm.payment_account}
                onChange={(e) => setPayForm({ ...payForm, payment_account: e.target.value })}
              />
            </div>
            <div>
              <Label>Memo <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                className="mt-2"
                placeholder="Add a note..."
                value={payForm.memo}
                onChange={(e) => setPayForm({ ...payForm, memo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowPayDialog(false)} disabled={payingSaving}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handlePayBills}
              disabled={payingSaving}
            >
              {payingSaving ? "Saving..." : `Confirm payment`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}