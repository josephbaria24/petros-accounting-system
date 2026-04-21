"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OpeningBalancesDialog } from "@/components/accounts/opening-balances-dialog";
import {
  AdjustBalanceDialog,
  type AdjustBalanceAccount,
} from "@/components/accounts/adjust-balance-dialog";
import { createClient } from "@/lib/supabase-client";
import { removeOrphanInvoicePaymentLedgers } from "@/lib/invoice-journal";
import { useToast } from "@/hooks/use-toast";
import {
  displayBalanceForAccountType,
  fetchLedgerRawNetByAccount,
  formatPhpBalance,
  type PaymentAccountRow,
} from "@/lib/payment-account-balances";
import { cn } from "@/lib/utils";
import {
  BookMarked,
  Landmark,
  Layers,
  PencilLine,
  RefreshCw,
  Search,
  Sparkles,
  Unlink,
} from "lucide-react";

type CoaRow = PaymentAccountRow & { displayBalance: number };

function typeLabel(type: string) {
  return type ? type.charAt(0).toUpperCase() + type.slice(1) : "";
}

const TYPE_ORDER = ["asset", "liability", "equity", "income", "expense"] as const;

function typeBadgeClass(type: string) {
  switch (type) {
    case "asset":
      return "border-sky-200/80 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100";
    case "liability":
      return "border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
    case "equity":
      return "border-violet-200/80 bg-violet-50 text-violet-950 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-100";
    case "income":
      return "border-emerald-200/80 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100";
    case "expense":
      return "border-rose-200/80 bg-rose-50 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100";
    default:
      return "border-border bg-muted/50 text-foreground";
  }
}

export default function ChartOfAccountsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CoaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orphanBusy, setOrphanBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [openingDialogOpen, setOpeningDialogOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAccount, setAdjustAccount] = useState<AdjustBalanceAccount | null>(null);

  const loadAccounts = useCallback(async (opts?: { silent?: boolean }) => {
    const supabase = createClient();
    if (!opts?.silent) setLoading(true);
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
      if (!opts?.silent) setLoading(false);
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

  const handleCleanOrphanLedgers = async () => {
    const supabase = createClient();
    setOrphanBusy(true);
    try {
      const { removedInvoiceEntries, removedPaymentEntries } =
        await removeOrphanInvoicePaymentLedgers(supabase);
      await loadAccounts({ silent: true });
      toast({
        title: "Ledger cleaned",
        description:
          removedInvoiceEntries + removedPaymentEntries === 0
            ? "No orphan invoice or payment journal entries were found."
            : `Removed ${removedInvoiceEntries} invoice journal entr${removedInvoiceEntries === 1 ? "y" : "ies"} and ${removedPaymentEntries} payment journal entr${removedPaymentEntries === 1 ? "y" : "ies"} whose records were already deleted.`,
      });
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Could not clean ledger",
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setOrphanBusy(false);
    }
  };

  return (
    <div className="relative min-h-full overflow-hidden bg-[#f6f7f9] dark:bg-zinc-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-25"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 90% 60% at 10% -10%, rgba(16, 185, 129, 0.16), transparent 55%),
            radial-gradient(ellipse 70% 50% at 100% 0%, rgba(56, 189, 248, 0.12), transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139, 92, 246, 0.08), transparent 45%)
          `,
        }}
      />

      <div className="relative w-full max-w-none px-4 py-8 sm:px-5 sm:py-10 md:px-6 lg:px-8 xl:px-10 2xl:px-12">
        {/* Hero */}
        <header className="mb-8 flex flex-col gap-8 lg:mb-10 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4 lg:max-w-4xl xl:max-w-5xl 2xl:max-w-none 2xl:min-w-0 2xl:flex-1">

            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-slate-900 to-slate-700 text-white shadow-lg shadow-slate-900/25 ring-1 ring-white/10 dark:from-zinc-100 dark:to-zinc-300 dark:text-zinc-900">
                <Landmark className="h-7 w-7 opacity-95" aria-hidden />
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-50 sm:text-4xl">
                  Chart of accounts
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-slate-600 dark:text-zinc-400">
                  These balances are the <span className="font-medium text-slate-800 dark:text-zinc-200">general ledger</span> (journal lines), not a live copy of the invoice list. Deleting invoices removes sales from the Sales screen, but ledger postings must be removed too—new deletes do that automatically; use{" "}
                  <span className="font-medium text-slate-800 dark:text-zinc-200">Clean orphan ledger</span> if you already deleted invoices and old balances remain. Invoice payments update the deposit account you pick in{" "}
                  <span className="font-medium text-slate-800 dark:text-zinc-200">Receive payment</span> (any asset from this chart). Use{" "}
                  <span className="font-medium text-slate-800 dark:text-zinc-200">Adjust</span> for manual corrections or opening balances for starting cash.
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              className="h-10 border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
              onClick={() => void loadAccounts()}
              disabled={loading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              size="default"
              title="Remove journal entries that still reference invoices or payments you already deleted"
              className="h-10 border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:bg-zinc-800"
              onClick={() => void handleCleanOrphanLedgers()}
              disabled={loading || orphanBusy}
            >
              <Unlink className={cn("mr-2 h-4 w-4", orphanBusy && "animate-pulse")} />
              Clean orphan ledger
            </Button>
            <Button
              type="button"
              size="default"
              className="h-10 bg-emerald-600 px-5 font-medium text-white shadow-md shadow-emerald-900/20 hover:bg-emerald-700 dark:shadow-emerald-950/40"
              onClick={() => setOpeningDialogOpen(true)}
            >
              <BookMarked className="mr-2 h-4 w-4 opacity-90" />
              Opening balances
            </Button>
          </div>
        </header>

        {/* KPI strip */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="group border-0 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.06),0_12px_40px_-18px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/60 backdrop-blur-md dark:bg-zinc-900/70 dark:ring-zinc-800/80">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white shadow-inner dark:bg-zinc-100 dark:text-zinc-900">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Total accounts
                </p>
                <p className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-zinc-50">
                  {stats.total}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.06),0_12px_40px_-18px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/60 backdrop-blur-md dark:bg-zinc-900/70 dark:ring-zinc-800/80">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-inner shadow-emerald-900/20">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                  Shown in list
                </p>
                <p className="mt-0.5 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-zinc-50">
                  {filtered.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">After search and type filter</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/85 shadow-[0_1px_0_rgba(15,23,42,0.06),0_12px_40px_-18px_rgba(15,23,42,0.25)] ring-1 ring-slate-200/60 backdrop-blur-md sm:col-span-2 lg:col-span-1 dark:bg-zinc-900/70 dark:ring-zinc-800/80">
            <CardContent className="p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-zinc-500">
                By type
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TYPE_ORDER.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/90 px-2.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800/60"
                  >
                    <span className="font-medium text-slate-800 dark:text-zinc-200">{typeLabel(t)}</span>
                    <span className="tabular-nums text-slate-600 dark:text-zinc-400">{stats.byType[t] ?? 0}</span>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

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

        {/* Main ledger table */}
        <Card className="overflow-hidden border-0 bg-white/90 shadow-[0_1px_0_rgba(15,23,42,0.05),0_24px_64px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur-md dark:bg-zinc-900/75 dark:ring-zinc-800/90">
          <div className="border-b border-slate-100/90 bg-linear-to-r from-white via-slate-50/40 to-white px-5 py-5 sm:px-7 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900/80 dark:to-zinc-900">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-zinc-50">
                  Account register
                </h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400">
                  Search, filter by type, and post adjustments per account.
                </p>
              </div>
            </div>
          </div>

          <CardContent className="space-y-5 p-4 sm:p-6 lg:p-7">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="relative min-w-0 w-full flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
                <Input
                  placeholder="Search by account name…"
                  className="h-11 border-slate-200/90 bg-white pl-10 text-[15px] shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-11 w-full border-slate-200/90 bg-white shadow-sm sm:w-[220px] dark:border-zinc-700 dark:bg-zinc-900">
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
              <div
                role="alert"
                className="rounded-xl border border-red-200/90 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
              >
                {loadError}
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 py-20 text-slate-500 dark:border-zinc-800 dark:text-zinc-500">
                <RefreshCw className="h-8 w-8 animate-spin opacity-70" />
                <p className="text-sm font-medium">Loading accounts…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/40 px-6 py-14 text-center dark:border-zinc-800 dark:bg-zinc-950/30">
                <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">No accounts match this view.</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-zinc-500">
                  Clear the search or widen the type filter. You can also run opening balances from the button above.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-zinc-800">
                <div className="max-h-[min(70vh,720px)] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="sticky top-0 z-1 border-b border-slate-200/90 bg-slate-50/95 hover:bg-slate-50/95 dark:border-zinc-800 dark:bg-zinc-900/95 dark:hover:bg-zinc-900/95">
                        <TableHead className="w-[36%] min-w-[160px] py-3.5 pl-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500 sm:pl-5">
                          Name
                        </TableHead>
                        <TableHead className="py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                          Type
                        </TableHead>
                        <TableHead className="hidden py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500 md:table-cell">
                          Detail
                        </TableHead>
                        <TableHead className="py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">
                          Status
                        </TableHead>
                        <TableHead className="py-3.5 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500 sm:pr-5">
                          Balance
                        </TableHead>
                        <TableHead className="w-[120px] py-3.5 pr-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500 sm:pr-5">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((acc, i) => (
                        <TableRow
                          key={acc.id}
                          className={cn(
                            "border-slate-100 transition-colors dark:border-zinc-800/80",
                            i % 2 === 0 ? "bg-white dark:bg-zinc-900/40" : "bg-slate-50/35 dark:bg-zinc-900/20",
                            "hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
                          )}
                        >
                          <TableCell className="max-w-[240px] py-3.5 pl-4 align-middle font-medium text-slate-900 dark:text-zinc-100 sm:max-w-none sm:pl-5">
                            <span className="line-clamp-2 sm:line-clamp-none">{acc.name}</span>
                          </TableCell>
                          <TableCell className="py-3.5 align-middle">
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize",
                                typeBadgeClass(acc.type),
                              )}
                            >
                              {typeLabel(acc.type)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden max-w-md py-3.5 align-middle text-sm text-slate-600 dark:text-zinc-400 md:table-cell">
                            <span className="line-clamp-2">{acc.description?.trim() || "—"}</span>
                          </TableCell>
                          <TableCell className="py-3.5 align-middle">
                            <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-100">
                              active
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 pr-4 text-right align-middle sm:pr-5">
                            <span
                              className={cn(
                                "text-sm font-semibold tabular-nums tracking-tight text-slate-900 dark:text-zinc-50",
                                acc.displayBalance < 0 && "text-rose-700 dark:text-rose-400",
                              )}
                            >
                              {formatPhpBalance(acc.displayBalance)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 pr-4 text-right align-middle sm:pr-5">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1.5 border-slate-200/90 bg-white/80 text-slate-700 shadow-sm hover:border-emerald-300/80 hover:bg-emerald-50/90 hover:text-emerald-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-100"
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
