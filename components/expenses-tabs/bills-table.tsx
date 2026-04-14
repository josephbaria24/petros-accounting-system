//components\expenses-tabs\bills-table.tsx

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { fetchAllPaged } from "@/lib/supabase-fetch-all";
import { TransactionViewEditDialog } from "./transaction-view-edit-dialog";

import { Button } from "@/components/ui/button";
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
  MessageSquare,
  Settings,
  X,
  Trash2Icon,
  FileText,
  CalendarIcon,
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

      const suppliersData = await fetchAllPaged((from, to) =>
        supabase.from("suppliers").select("*").order("name").range(from, to)
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
        .filter((item) => item.description.trim() || item.amount > 0)
        .map((item) => ({
          bill_id: bill.id,
          description: item.description.trim() || "—",
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

  const statusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Paid
          </span>
        );
      case "overdue":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Unpaid
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header: Title + Action Buttons */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold">Bills</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50 disabled:opacity-40"
            disabled={selectedBills.size === 0}
            onClick={() => setShowPayDialog(true)}
          >
            Pay bills{selectedBills.size > 0 ? ` (${selectedBills.size})` : ""}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Add bill
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowBillDialog(true)}>
                Create bill manually
              </DropdownMenuItem>
              <DropdownMenuItem>Upload bill</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-0 mb-4">
        <button
          onClick={() => setStatusFilter("for-review")}
          className={`px-5 py-2 text-sm font-medium rounded-l-md border transition-colors ${statusFilter === "for-review"
            ? "bg-gray-900 text-white border-gray-900"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
        >
          For review
        </button>
        <button
          onClick={() => setStatusFilter("unpaid")}
          className={`px-5 py-2 text-sm font-medium border-t border-b transition-colors ${statusFilter === "unpaid"
            ? "bg-gray-900 text-white border-gray-900"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
        >
          Unpaid
        </button>
        <button
          onClick={() => setStatusFilter("paid")}
          className={`px-5 py-2 text-sm font-medium rounded-r-md border transition-colors ${statusFilter === "paid"
            ? "bg-gray-900 text-white border-gray-900"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
        >
          Paid
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-green-600 text-green-600 hover:bg-green-50">
                Batch actions
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Mark as paid</DropdownMenuItem>
              <DropdownMenuItem>Mark as unpaid</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete selected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={showFilterPanel ? "border-green-600 text-green-600" : ""}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {activeFiltersCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="mb-4 border rounded-lg bg-card p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
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
          <div className="flex items-center justify-between mt-5 pt-4 border-t">
            <Button
              variant="link"
              className="text-green-600 hover:text-green-700 px-0 font-semibold"
              onClick={resetFilters}
            >
              Reset
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white px-8"
              onClick={applyFilters}
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-card border-b">
              <tr>
                <th className="text-left p-3 font-medium w-10">
                  <Checkbox
                    checked={filteredBills.length > 0 && selectedBills.size === filteredBills.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">BILL</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">SOURCE</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">SUPPLIER</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">BILL NO</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">BILL DATE</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">CATEGORY</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">DUE DATE</th>
                <th className="text-right p-3 font-medium text-xs text-muted-foreground tracking-wider">BILL AMOUNT</th>
                <th className="text-left p-3 font-medium text-xs text-muted-foreground tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-12 w-12 text-muted-foreground/40" />
                      <h3 className="text-xl font-bold text-foreground">
                        {statusFilter === "paid"
                          ? "No paid bills"
                          : statusFilter === "unpaid"
                            ? "No unpaid bills"
                            : "No bills to review"}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        When you have bills ready to review, you&apos;ll find them here.
                        <br />
                        To upload a bill or create a new one, go to{" "}
                        <button
                          className="font-semibold text-foreground hover:underline"
                          onClick={() => setShowBillDialog(true)}
                        >
                          Add Bill
                        </button>
                        .
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="border-b hover:bg-secondary/50 transition-colors">
                    <td className="p-3">
                      <Checkbox
                        checked={selectedBills.has(bill.id)}
                        onCheckedChange={() => toggleSelectBill(bill.id)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{bill.supplier?.name || "—"}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">Manual</td>
                    <td className="p-3">{bill.supplier?.name || "—"}</td>
                    <td className="p-3">{bill.bill_no}</td>
                    <td className="p-3">
                      {bill.bill_date
                        ? new Date(bill.bill_date).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })
                        : "—"}
                    </td>
                    <td className="p-3">{bill.category || "Bills"}</td>
                    <td className="p-3">
                      {bill.due_date
                        ? new Date(bill.due_date).toLocaleDateString("en-US", {
                          month: "2-digit",
                          day: "2-digit",
                          year: "numeric",
                        })
                        : "—"}
                    </td>
                    <td className="p-3 text-right font-medium">
                      PHP{(bill.total_amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                            View/Edit
                            <ChevronDown className="ml-1 h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openView(bill)}>View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(bill)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteBill(bill)}
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
              <Select
                value={payForm.payment_method}
                onValueChange={(v) => setPayForm({ ...payForm, payment_method: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Credit Card">Credit Card</SelectItem>
                  <SelectItem value="Online Payment">Online Payment</SelectItem>
                </SelectContent>
              </Select>
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