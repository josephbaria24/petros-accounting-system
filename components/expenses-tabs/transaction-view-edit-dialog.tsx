"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentMethodSelect } from "./payment-method-select";

type Supplier = { id: string; name: string };
type Code = { id: string; code: string; name: string };

type BillItemEdit = { id?: string; description: string; amount: number };

type ExpenseEditState = {
  vendor_id: string;
  category: string;
  amount: number;
  payment_method: string;
  notes: string;
  code: string;
};

type BillEditState = {
  vendor_id: string;
  bill_no: string;
  bill_date: string;
  due_date: string;
  notes: string;
  code: string;
  items: BillItemEdit[];
};

export type TransactionRow = any; // uses your mapped "transaction" objects

export function TransactionViewEditDialog({
  open,
  onOpenChange,
  mode, // "view" | "edit"
  transaction,
  suppliers,
  codes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "view" | "edit";
  transaction: TransactionRow | null;
  suppliers: Supplier[];
  codes: Code[];
  onSaved: () => Promise<void> | void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const readOnly = mode === "view";

  const [loadingItems, setLoadingItems] = useState(false);

  const [expenseEdit, setExpenseEdit] = useState<ExpenseEditState>({
    vendor_id: "",
    category: "",
    amount: 0,
    payment_method: "",
    notes: "",
    code: "",
  });

  const [billEdit, setBillEdit] = useState<BillEditState>({
    vendor_id: "",
    bill_no: "",
    bill_date: new Date().toISOString().split("T")[0],
    due_date: new Date().toISOString().split("T")[0],
    notes: "",
    code: "",
    items: [{ description: "", amount: 0 }],
  });

  // Load transaction into local form state when opened/changed
  useEffect(() => {
    if (!open || !transaction) return;

    if (transaction.type === "Expense") {
      setExpenseEdit({
        vendor_id: transaction.vendor_id ?? "",
        category: transaction.category ?? "",
        amount: Number(transaction.amount ?? transaction.total ?? 0),
        payment_method: transaction.payment_method ?? "",
        notes: transaction.notes ?? "",
        code: transaction.code ?? "",
      });
      return;
    }

    if (transaction.type === "Bill") {
      setBillEdit((prev) => ({
        ...prev,
        vendor_id: transaction.vendor_id ?? "",
        bill_no: transaction.bill_no ?? transaction.no ?? "",
        bill_date:
          transaction.bill_date ??
          transaction.date ??
          new Date().toISOString().split("T")[0],
        due_date: transaction.due_date ?? new Date().toISOString().split("T")[0],
        notes: transaction.notes ?? "",
        code: transaction.code ?? "",
        items: [],
      }));

      // fetch bill items
      (async () => {
        setLoadingItems(true);
        const { data, error } = await supabase
          .from("bill_items")
          .select("id, description, unit_cost")
          .eq("bill_id", transaction.id);

        setLoadingItems(false);

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
          items:
            (data ?? []).map((it) => ({
              id: it.id,
              description: it.description ?? "",
              amount: Number(it.unit_cost ?? 0),
            })) || [{ description: "", amount: 0 }],
        }));
      })();
    }
  }, [open, transaction, supabase]);

  const totalBill = useMemo(() => {
    return billEdit.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [billEdit.items]);

  const addBillLine = () => {
    if (readOnly) return;
    setBillEdit((p) => ({
      ...p,
      items: [...p.items, { description: "", amount: 0 }],
    }));
  };

  const removeBillLine = (idx: number) => {
    if (readOnly) return;
    setBillEdit((p) => ({
      ...p,
      items: p.items.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    if (!transaction) return;

    try {
      if (transaction.type === "Expense") {
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
          .eq("id", transaction.id);

        if (error) throw error;
      }

      if (transaction.type === "Bill") {
        const subtotal = totalBill;

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
          .eq("id", transaction.id);

        if (billError) throw billError;

        // replace items (simple + consistent)
        const { error: delErr } = await supabase
          .from("bill_items")
          .delete()
          .eq("bill_id", transaction.id);

        if (delErr) throw delErr;

        const itemsToInsert = billEdit.items
          .filter((i) => i.description || (i.amount ?? 0) > 0)
          .map((i) => ({
            bill_id: transaction.id,
            description: i.description,
            quantity: 1,
            unit_cost: Number(i.amount) || 0,
            tax_rate: 0,
          }));

        if (itemsToInsert.length) {
          const { error: insErr } = await supabase
            .from("bill_items")
            .insert(itemsToInsert);

          if (insErr) throw insErr;
        }
      }

      toast({ title: "Saved", description: "Changes updated successfully." });
      onOpenChange(false);
      await onSaved();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Save failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  };

  const title =
    transaction?.type === "Bill"
      ? mode === "view"
        ? "View Bill"
        : "Edit Bill"
      : mode === "view"
      ? "View Expense"
      : "Edit Expense";

  const supplierName =
    suppliers.find((s) => s.id === billEdit.vendor_id)?.name ?? "Supplier";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "gap-0 p-0 overflow-hidden flex flex-col max-h-[92vh]",
          transaction?.type === "Bill"
            ? "w-[calc(100vw-2rem)] max-w-3xl"
            : "max-w-2xl"
        )}
      >
        <DialogDescription className="sr-only">
          {readOnly ? "Read-only view." : "Update the details then save."}
        </DialogDescription>

        {!transaction ? (
          <div className="p-6 text-sm text-muted-foreground">No transaction selected.</div>
        ) : transaction.type === "Expense" ? (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold leading-tight">{title}</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {readOnly ? "View only" : "Edit details below"}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Supplier
                </Label>
                <Select
                  value={expenseEdit.vendor_id}
                  onValueChange={(v) =>
                    !readOnly && setExpenseEdit((p) => ({ ...p, vendor_id: v }))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-10 w-full">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </Label>
                <Input
                  className="h-10"
                  value={expenseEdit.category}
                  readOnly={readOnly}
                  onChange={(e) =>
                    setExpenseEdit((p) => ({ ...p, category: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Amount
                </Label>
                <Input
                  className="h-10"
                  type="number"
                  value={expenseEdit.amount}
                  readOnly={readOnly}
                  onChange={(e) =>
                    setExpenseEdit((p) => ({
                      ...p,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Payment method
                </Label>
                <PaymentMethodSelect
                  value={expenseEdit.payment_method}
                  onValueChange={(val) =>
                    !readOnly && setExpenseEdit((p) => ({ ...p, payment_method: val }))
                  }
                  idPrefix="txn-expense"
                  disabled={readOnly}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Code
                </Label>
                <Select
                  value={expenseEdit.code || "none"}
                  onValueChange={(v) =>
                    !readOnly &&
                    setExpenseEdit((p) => ({ ...p, code: v === "none" ? "" : v }))
                  }
                  disabled={readOnly}
                >
                  <SelectTrigger className="h-10 w-full">
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Notes
                </Label>
                <Textarea
                  value={expenseEdit.notes}
                  readOnly={readOnly}
                  onChange={(e) =>
                    setExpenseEdit((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="min-h-[88px] resize-none"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20 shrink-0">
              <Button variant="outline" className="h-9 text-sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {!readOnly && (
                <Button
                  className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSave}
                >
                  Save changes
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold leading-tight truncate">
                    {title}
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {billEdit.bill_no || "No bill number"} · {supplierName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Total
                  </span>
                  <span className="text-lg font-bold text-green-700 tabular-nums">
                    PHP{totalBill.toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="px-6 py-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Supplier
                  </Label>
                  <Select
                    value={billEdit.vendor_id}
                    onValueChange={(v) =>
                      !readOnly && setBillEdit((p) => ({ ...p, vendor_id: v }))
                    }
                    disabled={readOnly}
                  >
                    <SelectTrigger className="h-10 w-full">
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
              </div>

              <div className="border-t" />

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bill no.
                    </Label>
                    <Input
                      className="h-10"
                      value={billEdit.bill_no}
                      readOnly={readOnly}
                      onChange={(e) =>
                        setBillEdit((p) => ({ ...p, bill_no: e.target.value }))
                      }
                      placeholder="Bill number"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Project / training code
                    </Label>
                    <Select
                      value={billEdit.code || "none"}
                      onValueChange={(v) =>
                        !readOnly &&
                        setBillEdit((p) => ({ ...p, code: v === "none" ? "" : v }))
                      }
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-10 w-full">
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
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Bill date
                    </Label>
                    <Input
                      className="h-10"
                      type="date"
                      value={billEdit.bill_date}
                      readOnly={readOnly}
                      onChange={(e) =>
                        setBillEdit((p) => ({ ...p, bill_date: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Due date
                    </Label>
                    <Input
                      className="h-10"
                      type="date"
                      value={billEdit.due_date}
                      readOnly={readOnly}
                      onChange={(e) =>
                        setBillEdit((p) => ({ ...p, due_date: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t" />

              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Line items
                  </h3>
                </div>
                {loadingItems ? (
                  <div className="text-sm text-muted-foreground py-6 text-center border rounded-lg bg-muted/20">
                    Loading items…
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm table-fixed">
                      <thead>
                        <tr className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2.5 text-left w-10">#</th>
                          <th className="px-3 py-2.5 text-left">Description</th>
                          <th className="px-3 py-2.5 text-right w-32">Amount (PHP)</th>
                          {!readOnly && <th className="w-12 px-1" />}
                        </tr>
                      </thead>
                      <tbody>
                        {billEdit.items.map((it, idx) => (
                          <tr key={idx} className="border-t hover:bg-muted/30 transition-colors group">
                            <td className="px-3 py-2 align-middle">
                              <span className="text-xs text-muted-foreground font-medium">{idx + 1}</span>
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <Input
                                className="h-9 text-sm"
                                placeholder="Description"
                                value={it.description}
                                readOnly={readOnly}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setBillEdit((p) => {
                                    const items = [...p.items];
                                    items[idx] = { ...items[idx], description: v };
                                    return { ...p, items };
                                  });
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 align-middle">
                              <Input
                                className="h-9 text-sm text-right tabular-nums"
                                type="number"
                                placeholder="0.00"
                                value={it.amount === 0 ? "" : it.amount}
                                readOnly={readOnly}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const v = raw === "" ? 0 : parseFloat(raw) || 0;
                                  setBillEdit((p) => {
                                    const items = [...p.items];
                                    items[idx] = { ...items[idx], amount: v };
                                    return { ...p, items };
                                  });
                                }}
                              />
                            </td>
                            {!readOnly && (
                              <td className="px-1 py-2 align-middle text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 sm:opacity-100"
                                  onClick={() => removeBillLine(idx)}
                                  disabled={billEdit.items.length === 1}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!readOnly && (
                      <div className="flex items-center gap-2 px-3 py-2.5 border-t bg-muted/20">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-medium text-green-700 hover:text-green-800 hover:bg-green-50"
                          onClick={addBillLine}
                        >
                          + Add line
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                <div className="sm:hidden flex justify-end mt-3 text-sm font-semibold tabular-nums">
                  Total PHP
                  {totalBill.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              <div className="border-t" />

              <div className="px-6 py-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Memo / notes
                  </Label>
                  <Textarea
                    value={billEdit.notes}
                    readOnly={readOnly}
                    onChange={(e) =>
                      setBillEdit((p) => ({ ...p, notes: e.target.value }))
                    }
                    placeholder="Optional notes…"
                    className="min-h-[88px] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20 shrink-0">
              <Button variant="outline" className="h-9 text-sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {!readOnly && (
                <Button
                  className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSave}
                >
                  Save changes
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
