"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-client";
import { postAccountBalanceAdjustment } from "@/lib/balance-adjustment-journal";
import { formatPhpBalance } from "@/lib/payment-account-balances";
import type { PaymentAccountRow } from "@/lib/payment-account-balances";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export type AdjustBalanceAccount = PaymentAccountRow & { displayBalance: number };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: AdjustBalanceAccount | null;
  onPosted?: () => void;
};

const OBE_NAME = "Opening Balance Equity";

export function AdjustBalanceDialog({ open, onOpenChange, account, onPosted }: Props) {
  const supabase = createClient();
  const [newBalance, setNewBalance] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [memo, setMemo] = useState("Balance adjustment");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open || !account) return;
    setNewBalance(String(account.displayBalance));
    setEntryDate(new Date().toISOString().split("T")[0]);
    setMemo("Balance adjustment");
  }, [open, account]);

  const isObe = account?.name.trim().toLowerCase() === OBE_NAME.toLowerCase();

  const handleSubmit = async () => {
    if (!account || isObe) return;
    const target = parseFloat(newBalance);
    if (!Number.isFinite(target)) {
      toast({ title: "Invalid amount", description: "Enter a valid number.", variant: "destructive" });
      return;
    }

    setPosting(true);
    try {
      const result = await postAccountBalanceAdjustment(supabase, {
        accountId: account.id,
        accountType: account.type,
        currentDisplayBalance: account.displayBalance,
        newDisplayBalance: target,
        entryDate,
        memo,
      });
      if ("skipped" in result) {
        toast({ title: "No change", description: "New balance matches the current book balance." });
      } else {
        toast({
          title: "Adjustment posted",
          description: "A journal entry was created (offset: Opening Balance Equity).",
        });
        onOpenChange(false);
        onPosted?.();
      }
    } catch (e: unknown) {
      toast({
        title: "Could not post",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust book balance</DialogTitle>
          <DialogDescription>
            Balances come from the ledger. This posts a journal entry for{" "}
            <span className="font-medium text-foreground">{account?.name ?? "—"}</span> and offsets{" "}
            <span className="font-medium text-foreground">Opening Balance Equity</span> so the book matches your target.
          </DialogDescription>
        </DialogHeader>

        {account && (
          <div className="space-y-4 py-1">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Current book balance: </span>
              <span className="font-semibold tabular-nums text-slate-900">
                {formatPhpBalance(account.displayBalance)}
              </span>
            </div>

            {isObe ? (
              <p className="text-sm text-amber-800">
                Use another account for adjustments; this account is the system offset for opening entries.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="adj-new-bal">New balance (PHP)</Label>
                  <Input
                    id="adj-new-bal"
                    type="number"
                    step="0.01"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="h-10 font-mono tabular-nums"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adj-date">Entry date</Label>
                  <Input
                    id="adj-date"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adj-memo">Memo (journal description)</Label>
                  <Textarea
                    id="adj-memo"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={posting || !account || isObe}
            onClick={handleSubmit}
          >
            {posting ? "Posting…" : "Post adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
