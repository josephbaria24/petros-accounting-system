"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import {
  type PaymentAccountRow,
  displayBalanceForAccountType,
  formatPhpBalance,
  paymentAccountCategoryLabel,
} from "@/lib/payment-account-balances";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onValueChange: (accountId: string) => void;
  accounts: PaymentAccountRow[];
  ledgerRawByAccount: Record<string, number>;
  loading: boolean;
  idPrefix?: string;
  /** Show book balance to the right of the field (like QuickBooks). */
  balancePosition?: "below" | "inline";
};

export function PaymentAccountSelect({
  value,
  onValueChange,
  accounts,
  ledgerRawByAccount,
  loading,
  idPrefix = "pay-acct",
  balancePosition = "inline",
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)),
    );
  }, [accounts, query]);

  const selected = accounts.find((a) => a.id === value);

  const selectedDisplayBal =
    selected == null
      ? null
      : displayBalanceForAccountType(selected.type, ledgerRawByAccount[selected.id] ?? 0);

  const balanceText =
    loading ? (
      "…"
    ) : selected ? (
      formatPhpBalance(selectedDisplayBal)
    ) : (
      "—"
    );

  const selectBlock = (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <SelectTrigger className="h-10 w-full min-w-0 border-border bg-background shadow-none">
        {/* Leaf only — React 19 forbids children here when Select portals into this node */}
        <SelectValue placeholder="Select payment account" />
      </SelectTrigger>
        <SelectContent className="max-h-[min(360px,55vh)] w-[var(--radix-select-trigger-width)] min-w-[280px] p-0">
          <div className="sticky top-0 z-10 border-b bg-popover p-2 space-y-2">
            <Input
              id={`${idPrefix}-search`}
              placeholder="Search accounts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9"
              onKeyDown={(e) => e.stopPropagation()}
            />
            <Link
              href="/accounts"
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline px-1"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Add / manage accounts
            </Link>
          </div>
          <div className="max-h-[min(280px,45vh)] overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-6 text-sm text-muted-foreground text-center">Loading accounts…</p>
            ) : accounts.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground text-center">
                No asset, liability, income, or expense accounts yet.{" "}
                <Link href="/accounts" className="text-blue-600 underline">
                  Chart of accounts
                </Link>
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground text-center">No matches.</p>
            ) : (
              filtered.map((a) => (
                <SelectItem
                  key={a.id}
                  value={a.id}
                  textValue={`${a.name} - PHP`}
                  className="cursor-pointer pr-2"
                >
                  <span className="flex w-full items-start justify-between gap-3 text-left">
                    <span className="min-w-0 flex-1 truncate font-normal leading-snug">
                      {a.name} - PHP
                    </span>
                    <span className="shrink-0 text-xs italic text-muted-foreground">
                      {paymentAccountCategoryLabel(a)}
                    </span>
                  </span>
                </SelectItem>
              ))
            )}
          </div>
        </SelectContent>
    </Select>
  );

  if (balancePosition === "inline") {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-0">
          <div className="min-w-0 flex-1">{selectBlock}</div>
          <div className="flex shrink-0 flex-col justify-center border-t border-border/60 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Book balance
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">{balanceText}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectBlock}
      <p className="text-xs text-muted-foreground">
        Balance{" "}
        <span className="font-medium tabular-nums text-foreground">{balanceText}</span>
      </p>
    </div>
  );
}
