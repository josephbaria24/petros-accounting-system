"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  displayBalanceForAccountType,
  fetchLedgerRawNetByAccount,
  fetchPaymentAccountsForExpense,
  formatPhpBalance,
  type PaymentAccountRow,
} from "@/lib/payment-account-balances";
import { postOpeningBalancesByAccountIds } from "@/lib/opening-balance-journal";
import { Search } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPosted?: () => void;
};

export function OpeningBalancesDialog({ open, onOpenChange, onPosted }: Props) {
  const supabase = createClient();
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  /** amount input strings keyed by account id */
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [accounts, setAccounts] = useState<PaymentAccountRow[]>([]);
  const [displayBalById, setDisplayBalById] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setQuery("");
    (async () => {
      try {
        const [list, rawById] = await Promise.all([
          fetchPaymentAccountsForExpense(supabase),
          fetchLedgerRawNetByAccount(supabase),
        ]);
        if (cancelled) return;
        setAccounts(list);
        const disp: Record<string, number> = {};
        const amt0: Record<string, string> = {};
        for (const a of list) {
          const raw = rawById[a.id] ?? 0;
          disp[a.id] = displayBalanceForAccountType(a.type, raw);
          amt0[a.id] = "";
        }
        setDisplayBalById(disp);
        setAmounts(amt0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)),
    );
  }, [accounts, query]);

  const hasExistingLedger = accounts.some((a) => Math.abs(displayBalById[a.id] ?? 0) > 0.0001);

  const handleSubmit = async () => {
    const parsed: Record<string, number> = {};
    for (const a of accounts) {
      const v = parseFloat(amounts[a.id] || "");
      if (Number.isFinite(v) && v > 0) {
        parsed[a.id] = Math.round(v * 100) / 100;
      }
    }

    setPosting(true);
    try {
      await postOpeningBalancesByAccountIds(supabase, parsed, entryDate);
      toast({
        title: "Opening balances recorded",
        description: "Journal entry posted. Opening Balance Equity was updated to keep debits and credits equal.",
      });
      onOpenChange(false);
      onPosted?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not save opening balances.";
      toast({ title: "Could not save", description: msg, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,720px)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden border-slate-200/90 p-0 shadow-2xl sm:rounded-2xl">
        <DialogHeader className="shrink-0 space-y-2 border-b border-slate-100 bg-linear-to-r from-emerald-50/80 via-white to-white px-5 py-4 sm:px-6">
          <DialogTitle className="text-lg font-semibold tracking-tight text-slate-900">
            Payment account opening balances
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-slate-600">
            Same accounts as in <span className="font-medium text-slate-800">New expense → Payment account</span>.
            Enter starting PHP amounts. One journal entry:{" "}
            <span className="font-medium text-slate-800">debit</span> each funded asset (and similar),{" "}
            <span className="font-medium text-slate-800">credit</span> any liability you include, and net{" "}
            <span className="font-medium text-emerald-800">Opening Balance Equity</span> so debits equal credits.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading accounts…</p>
          ) : accounts.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              No asset or liability accounts yet. Seed your chart of accounts or add rows in Supabase.
            </p>
          ) : (
            <>
              {hasExistingLedger ? (
                <p className="rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                  Some accounts already have ledger activity. Posting again <strong>adds</strong> to those balances.
                </p>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="obe-date" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Entry date
                </Label>
                <Input
                  id="obe-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="h-10 border-slate-200 shadow-sm"
                />
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search accounts…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-10 border-slate-200 pl-9 shadow-sm"
                />
              </div>

              <ScrollArea className="h-[min(340px,42vh)] rounded-xl border border-slate-100 bg-slate-50/30 pr-3">
                <div className="space-y-3 py-1 pr-2">
                  {filtered.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">No matches.</p>
                  ) : (
                    filtered.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <Label htmlFor={`amt-${a.id}`} className="text-sm font-medium text-slate-900">
                              {a.name}
                            </Label>
                            <p className="text-xs text-slate-500">
                              {a.type === "asset" ? "Asset" : "Liability"}
                              {a.description ? ` · ${a.description}` : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            <Input
                              id={`amt-${a.id}`}
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="0.00"
                              value={amounts[a.id] ?? ""}
                              onChange={(e) =>
                                setAmounts((prev) => ({ ...prev, [a.id]: e.target.value }))
                              }
                              className="h-10 w-36 font-mono tabular-nums sm:w-40"
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              Book: {formatPhpBalance(displayBalById[a.id] ?? 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSubmit}
            disabled={posting || loading || accounts.length === 0}
          >
            {posting ? "Posting…" : "Post to ledger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
