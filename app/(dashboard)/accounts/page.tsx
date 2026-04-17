"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { OpeningBalancesDialog } from "@/components/accounts/opening-balances-dialog";
import {
  AdjustBalanceDialog,
  type AdjustBalanceAccount,
} from "@/components/accounts/adjust-balance-dialog";
import { createClient } from "@/lib/supabase-client";
import {
  displayBalanceForAccountType,
  fetchLedgerRawNetByAccount,
  formatPhpBalance,
  type PaymentAccountRow,
} from "@/lib/payment-account-balances";
import { BookOpen, Layers, PencilLine, RefreshCw, Search } from "lucide-react";

type CoaRow = PaymentAccountRow & { displayBalance: number };

function typeLabel(type: string) {
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : "";
}

export default function ChartOfAccountsPage() {
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [openingDialogOpen, setOpeningDialogOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAccount, setAdjustAccount] = useState<AdjustBalanceAccount | null>(null);

  const loadAccounts = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);
    setLoadError(null);
    try {
      const [{ data: accounts, error: accErr }, rawById] = await Promise.all([
        supabase.from("accounts").select("id, name, type, description").order("name"),
        fetchLedgerRawNetByAccount(supabase),
      ]);
      if (accErr) throw new Error(accErr.message);

      const list = (accounts || []) as PaymentAccountRow[];
      const coa: CoaRow[] = list.map((a) => {
        const raw = rawById[a.id] ?? 0;
        return {
          ...a,
          displayBalance: displayBalanceForAccountType(a.type, raw),
        };
      });
      setRows(coa);
    } catch (e: unknown) {
      setRows([]);
      setLoadError(e instanceof Error ? e.message : "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const filtered = rows.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === "all" || acc.type === filterType),
  );

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const r of rows) {
      byType[r.type] = (byType[r.type] || 0) + 1;
    }
    return { total: rows.length, byType };
  }, [rows]);

  const openAdjust = (acc: CoaRow) => {
    setAdjustAccount(acc);
    setAdjustOpen(true);
  };

  return (
    <div className="min-h-full bg-linear-to-b from-slate-50 via-white to-emerald-50/25">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Chart of accounts
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-600">
              Names and types come from Supabase. Balances are the book position from journal lines
              (debit − credit), shown in PHP. Use{" "}
              <span className="font-medium text-slate-800">Adjust</span> on a row to post a correction, or{" "}
              <span className="font-medium text-slate-800">Set payment opening balances</span> for the four starter cash
              accounts.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 border-slate-200 bg-white shadow-sm hover:bg-slate-50"
              onClick={() => void loadAccounts()}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              type="button"
              className="h-10 bg-emerald-600 px-5 text-white shadow-md shadow-emerald-900/15 hover:bg-emerald-700"
              onClick={() => setOpeningDialogOpen(true)}
            >
              Set payment opening balances
            </Button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-inner">
                <Layers className="h-5 w-5 opacity-90" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total accounts</p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-inner">
                <Search className="h-5 w-5 opacity-90" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matching filter</p>
                <p className="text-2xl font-semibold tabular-nums text-slate-900">{filtered.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-sm">
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">By type</p>
              <p className="mt-1 text-sm text-slate-600">
                {["asset", "liability", "equity", "income", "expense"].map((t) => (
                  <span key={t} className="mr-2 inline-block">
                    <span className="font-medium text-slate-800">{typeLabel(t)}</span>{" "}
                    <span className="tabular-nums text-slate-500">{stats.byType[t] ?? 0}</span>
                  </span>
                ))}
              </p>
            </CardContent>
          </Card>
        </div>

        <OpeningBalancesDialog
          open={openingDialogOpen}
          onOpenChange={setOpeningDialogOpen}
          onPosted={() => void loadAccounts()}
        />
        <AdjustBalanceDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          account={adjustAccount}
          onPosted={() => void loadAccounts()}
        />

        {/* Main table card */}
        <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-[0_22px_55px_-28px_rgba(15,23,42,0.2)]">
          <div className="border-b border-slate-100 bg-linear-to-r from-slate-50/90 to-white px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-900">Account list</h2>
            <p className="mt-0.5 text-sm text-slate-500">Search and filter; adjust any row&apos;s book balance.</p>
          </div>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search accounts…"
                  className="h-10 border-slate-200 bg-white pl-9 shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-10 w-full border-slate-200 bg-white shadow-sm sm:w-[200px]">
                  <SelectValue placeholder="Account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loadError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</p>
            ) : loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                Loading accounts…
              </div>
            ) : filtered.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center text-sm text-slate-600">
                No accounts match. Clear the search or run your seed SQL /{" "}
                <span className="font-medium">Set payment opening balances</span>.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 bg-slate-50/95 hover:bg-slate-50/95">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Name
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Type
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Detail
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Status
                      </TableHead>
                      <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Balance
                      </TableHead>
                      <TableHead className="w-[120px] text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((acc) => (
                      <TableRow
                        key={acc.id}
                        className="border-slate-100 transition-colors hover:bg-emerald-50/35"
                      >
                        <TableCell className="max-w-[220px] font-medium text-slate-900 sm:max-w-none">
                          {acc.name}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {typeLabel(acc.type)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-md text-sm text-slate-600">
                          {acc.description?.trim() || "—"}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/60">
                            active
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums text-slate-900">
                          {formatPhpBalance(acc.displayBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 border-slate-200 text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/80 hover:text-emerald-900"
                            onClick={() => openAdjust(acc)}
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
