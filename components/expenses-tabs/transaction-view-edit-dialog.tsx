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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {readOnly ? "Read-only view." : "Update the details then click Save."}
          </DialogDescription>
        </DialogHeader>

        {!transaction ? (
          <div className="text-sm text-muted-foreground">No transaction selected.</div>
        ) : transaction.type === "Expense" ? (
          <div className="space-y-4">
            <div>
              <Label>Supplier</Label>
              <Select
                value={expenseEdit.vendor_id}
                onValueChange={(v) =>
                  !readOnly && setExpenseEdit((p) => ({ ...p, vendor_id: v }))
                }
                disabled={readOnly}
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
                readOnly={readOnly}
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
                readOnly={readOnly}
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
                readOnly={readOnly}
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
                  !readOnly &&
                  setExpenseEdit((p) => ({ ...p, code: v === "none" ? "" : v }))
                }
                disabled={readOnly}
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

            <div>
              <Label>Notes</Label>
              <Textarea
                value={expenseEdit.notes}
                readOnly={readOnly}
                onChange={(e) =>
                  setExpenseEdit((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Supplier</Label>
              <Select
                value={billEdit.vendor_id}
                onValueChange={(v) =>
                  !readOnly && setBillEdit((p) => ({ ...p, vendor_id: v }))
                }
                disabled={readOnly}
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
                  readOnly={readOnly}
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
                    !readOnly &&
                    setBillEdit((p) => ({ ...p, code: v === "none" ? "" : v }))
                  }
                  disabled={readOnly}
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
                  readOnly={readOnly}
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
                  readOnly={readOnly}
                  onChange={(e) =>
                    setBillEdit((p) => ({ ...p, due_date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label>Items</Label>
              <div className="space-y-2">
                {loadingItems ? (
                  <div className="text-sm text-muted-foreground">Loading items...</div>
                ) : (
                  billEdit.items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2">
                      <Input
                        className="col-span-8"
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
                      <Input
                        className="col-span-3 text-right"
                        type="number"
                        placeholder="0.00"
                        value={it.amount}
                        readOnly={readOnly}
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
                        onClick={() => removeBillLine(idx)}
                        disabled={readOnly || billEdit.items.length === 1}
                      >
                        ✕
                      </Button>
                    </div>
                  ))
                )}

                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={addBillLine}>
                    Add line
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={billEdit.notes}
                readOnly={readOnly}
                onChange={(e) =>
                  setBillEdit((p) => ({ ...p, notes: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end font-semibold">
              Total: PHP{totalBill.toFixed(2)}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!readOnly && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSave}>
              Save changes
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
