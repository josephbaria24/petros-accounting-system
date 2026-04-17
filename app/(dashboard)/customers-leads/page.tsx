"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardList,
  UserPlus,
  Users,
  UserSquare2,
  Target,
  FileSpreadsheet,
  ScrollText,
  LayoutList,
  Receipt,
  Star,
  MessageSquare,
  Share2,
  Sparkles,
  ChevronRight,
  UsersRound,
} from "lucide-react";

/** Same height on paired cards so the header border lines up across columns. */
const PAIR_CARD_HEADER =
  "flex min-h-[5.25rem] shrink-0 items-center gap-3 border-b border-border px-5 py-4";

type OverdueRow = {
  id: string;
  invoice_no: string;
  issue_date: string | null;
  due_date: string | null;
  balance_due: number | null;
  customers: { name: string } | null;
};

function formatPHP(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function CustomersLeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const validTabs = ["overview", "customers", "leads", "marketing", "contracts", "reviews"] as const;
  const rawTab = searchParams.get("tab") || "overview";
  const tab = validTabs.includes(rawTab as (typeof validTabs)[number]) ? rawTab : "overview";

  const [loading, setLoading] = useState(true);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [overdueRows, setOverdueRows] = useState<OverdueRow[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    (async () => {
      try {
        const { data: unpaid } = await supabase
          .from("invoices")
          .select("id, balance_due, due_date, status")
          .in("status", ["sent", "partial", "overdue"])
          .gt("balance_due", 0);

        const rows = unpaid ?? [];
        setUnpaidCount(rows.length);
        const overdue = rows.filter((r) => r.due_date && r.due_date < today);
        setOverdueCount(overdue.length);
        setOverdueTotal(overdue.reduce((s, r) => s + Number(r.balance_due ?? 0), 0));

        const { data: invDetail } = await supabase
          .from("invoices")
          .select("id, invoice_no, issue_date, due_date, balance_due, customers(name)")
          .in("status", ["sent", "partial", "overdue"])
          .gt("balance_due", 0)
          .lt("due_date", today)
          .order("due_date", { ascending: true })
          .limit(4);

        setOverdueRows((invDetail as unknown as OverdueRow[]) ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setTab = (value: string) => {
    router.push(`/customers-leads?tab=${value}`, { scroll: false });
  };

  /** Same KPI card layout as Sales → Overview (`sales-overview.tsx`). */
  const funnelSteps: {
    label: string;
    value: number;
    helper: string;
    badge?: string;
    href?: string;
    icon: LucideIcon;
    valueClass?: string;
  }[] = [
    { label: "Open opportunities", value: 0, helper: "In pipeline", icon: Target },
    { label: "Open estimates", value: 0, helper: "Pending", icon: FileSpreadsheet },
    { label: "Open contracts", value: 0, helper: "Awaiting signature", icon: ScrollText },
    { label: "In progress projects", value: 0, helper: "Active work", icon: LayoutList },
    {
      label: "Unpaid invoices",
      value: unpaidCount,
      helper: "Open count",
      badge: overdueCount > 0 ? `${overdueCount} overdue` : undefined,
      href: "/sales?tab=invoices&invoiceFilter=unpaid",
      icon: Receipt,
      valueClass: "text-amber-950 dark:text-amber-100",
    },
    { label: "Reviews", value: 0, helper: "Collected", icon: Star },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-8 p-4 sm:p-6 lg:px-8 lg:py-8 2xl:max-w-[1536px]">
        <header className="space-y-2 border-b border-border pb-8">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Customers &amp; leads</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Customers &amp; leads</h1>
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-[15px]">
            Pipeline health, surveys, and shortcuts in one place.
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full space-y-8">
          <TabsList className="mb-0 inline-flex h-auto min-h-10 w-full flex-wrap justify-start gap-0 rounded-lg border border-border bg-muted/40 p-0.5 sm:w-auto sm:flex-nowrap">
            {[
              { id: "overview", label: "Overview" },
              { id: "customers", label: "Customers" },
              { id: "leads", label: "Leads" },
              { id: "marketing", label: "Marketing" },
              { id: "contracts", label: "Contracts" },
              { id: "reviews", label: "Reviews" },
            ].map((t) => (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="rounded-md px-3.5 py-2 text-sm font-medium text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-2 space-y-12 focus-visible:outline-none">
            {/* Pipeline funnel */}
            <section className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Pipeline snapshot</h2>
                  <p className="text-sm text-muted-foreground">Key counts across your sales workflow</p>
                </div>
                <span className="text-xs text-muted-foreground">As of today</span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i} className="flex h-full flex-col border-border/80 shadow-sm">
                        <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-2 space-y-0 border-b border-border/60 pb-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <Skeleton className="h-11 w-full rounded-sm" />
                            <Skeleton className="h-7 w-16" />
                          </div>
                          <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col pt-4">
                          <Skeleton className="h-[26px] w-20 rounded-md" />
                          <div className="min-h-2 flex-1" aria-hidden />
                          <Skeleton className="h-3 w-24" />
                        </CardContent>
                      </Card>
                    ))
                  : funnelSteps.map((step) => {
                      const Icon = step.icon;
                      const card = (
                        <Card
                          className={cn(
                            "flex h-full flex-col border-border/80 shadow-sm",
                            step.href && "transition-shadow hover:shadow-md",
                          )}
                        >
                          <CardHeader className="flex shrink-0 flex-row items-start justify-between gap-2 space-y-0 border-b border-border/60 pb-3">
                            <div className="min-w-0 flex-1 space-y-1 pr-1">
                              <div className="min-h-11">
                                <CardTitle className="line-clamp-2 text-left text-xs font-semibold uppercase leading-snug tracking-wide text-muted-foreground">
                                  {step.label}
                                </CardTitle>
                              </div>
                              <div
                                className={cn(
                                  "text-left text-xl font-semibold tabular-nums leading-none tracking-tight",
                                  step.valueClass,
                                )}
                              >
                                {step.value.toLocaleString()}
                              </div>
                            </div>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                            </div>
                          </CardHeader>
                          <CardContent className="flex flex-1 flex-col pt-4">
                            <div className="flex min-h-[26px] items-center">
                              {step.badge ? (
                                <Badge variant="destructive" className="text-xs font-normal">
                                  {step.badge}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="min-h-2 flex-1 shrink-0" aria-hidden />
                            <p className="text-left text-xs leading-normal text-muted-foreground">{step.helper}</p>
                          </CardContent>
                        </Card>
                      );
                      return step.href ? (
                        <Link
                          key={step.label}
                          href={step.href}
                          className="block h-full min-h-0 rounded-lg text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          aria-label={`${step.label}: ${step.value}. Open in Sales.`}
                        >
                          {card}
                        </Link>
                      ) : (
                        <div key={step.label} className="h-full min-h-0">
                          {card}
                        </div>
                      );
                    })}
              </div>
            </section>

            {/* Surveys */}
            <section className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">Post-invoice surveys</h2>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Automate follow-ups after you send an invoice—configure each flow below.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Work requests",
                    desc: "Drive repeat business using the post-invoice survey.",
                    icon: MessageSquare,
                  },
                  {
                    title: "Referrals",
                    desc: "Generate referrals using the post-invoice survey.",
                    icon: Share2,
                  },
                  {
                    title: "Reviews & testimonials",
                    desc: "Collect feedback using the post-invoice survey.",
                    icon: Sparkles,
                  },
                ].map((w) => {
                  const SurveyIcon = w.icon;
                  return (
                  <Card
                    key={w.title}
                    className="flex flex-col rounded-lg border border-border bg-card shadow-none"
                  >
                    <CardHeader className="space-y-3 pb-2 pt-6">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                          <SurveyIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <CardTitle className="text-base font-semibold leading-snug">{w.title}</CardTitle>
                          <CardDescription className="text-sm leading-relaxed">{w.desc}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-0">
                      <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
                        <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Preview
                        </p>
                        <div className="space-y-2">
                          <Skeleton className="h-2 w-[88%] rounded-full" />
                          <Skeleton className="h-2 w-[72%] rounded-full" />
                          <Skeleton className="h-2 w-[94%] rounded-full" />
                          <div className="flex gap-2 pt-1">
                            <Skeleton className="h-7 flex-1 rounded-md" />
                            <Skeleton className="h-7 w-14 rounded-md" />
                          </div>
                        </div>
                        <p className="mt-3 text-center text-[11px] text-muted-foreground">
                          Configure in settings
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full" type="button">
                        Manage survey settings
                      </Button>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </section>

            {/* Overdue + Estimates */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="rounded-lg border border-border bg-card shadow-none">
                <CardHeader className={PAIR_CARD_HEADER}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-destructive/10 text-destructive">
                      <Receipt className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <CardTitle className="text-base font-semibold leading-tight">Overdue invoices</CardTitle>
                      <CardDescription className="text-sm leading-snug">Past due · today</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-5 py-5">
                  <div className="text-2xl font-semibold tabular-nums text-foreground">
                    {loading ? <Skeleton className="inline-block h-9 w-40 rounded-md" /> : formatPHP(overdueTotal)}
                  </div>
                  <div className="overflow-hidden rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                          <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Client
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Due
                          </TableHead>
                          <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Amount
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overdueRows.length === 0 && !loading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                              No overdue invoices.
                            </TableCell>
                          </TableRow>
                        ) : loading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8">
                              <div className="space-y-2">
                                <Skeleton className="h-8 w-full" />
                                <Skeleton className="h-8 w-full" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          overdueRows.map((row) => {
                            const name = Array.isArray(row.customers)
                              ? row.customers[0]?.name
                              : row.customers?.name ?? "—";
                            return (
                              <TableRow key={row.id} className="h-12 border-border/60">
                                <TableCell className="font-medium">
                                  <Link
                                    href={`/invoices/${row.id}`}
                                    className="hover:text-primary hover:underline underline-offset-4"
                                  >
                                    {name}
                                  </Link>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                  {row.due_date
                                    ? new Date(row.due_date).toLocaleDateString("en-PH", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })
                                    : "—"}
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">
                                  {formatPHP(Number(row.balance_due ?? 0))}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <Button variant="link" className="h-auto p-0 text-sm font-medium text-primary" asChild>
                    <Link
                      href="/sales?tab=invoices&invoiceFilter=overdue"
                      className="inline-flex items-center gap-1"
                    >
                      View all invoices
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-lg border border-border bg-card shadow-none">
                <CardHeader className={PAIR_CARD_HEADER}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <FileSpreadsheet className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <CardTitle className="text-base font-semibold leading-tight">Open estimates</CardTitle>
                      <CardDescription className="text-sm leading-snug">Sent quotes still open</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-4 px-5 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border bg-muted/30">
                    <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    No open estimates. Create one to win more work.
                  </p>
                  <Button type="button" variant="outline" size="sm">
                    Create an estimate
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Tasks + Shortcuts */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="rounded-lg border border-border bg-card shadow-none">
                <CardHeader className={cn(PAIR_CARD_HEADER, "justify-between gap-4")}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <CheckCircle2 className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <CardTitle className="text-base font-semibold leading-tight">Tasks</CardTitle>
                      <p className="min-h-5 text-sm leading-snug" aria-hidden />
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">All open</span>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center px-5 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md border border-border bg-muted/50">
                    <CheckCircle2 className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">You&apos;re caught up</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">Nothing needs attention.</p>
                  <Button variant="link" className="mt-4 h-auto p-0 text-sm font-medium text-primary" asChild>
                    <Link href="#">Show all</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-lg border border-border bg-card shadow-none">
                <CardHeader className={PAIR_CARD_HEADER}>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <UsersRound className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <CardTitle className="text-base font-semibold leading-tight">Shortcuts</CardTitle>
                      <CardDescription className="text-sm leading-snug">Common actions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-5 py-5">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {[
                      {
                        href: "/sales?tab=customers&addCustomer=1",
                        label: "New customer",
                        icon: UserPlus,
                      },
                      {
                        href: "/customers-leads?tab=customers",
                        label: "Import customers",
                        icon: Users,
                      },
                      {
                        href: "/sales/invoices/create",
                        label: "Create invoice",
                        icon: ClipboardList,
                      },
                      {
                        href: "/sales?tab=customers",
                        label: "View customers",
                        icon: UserSquare2,
                      },
                    ].map(({ href, label, icon: Icon }) => (
                      <Link
                        key={label}
                        href={href}
                        prefetch
                        className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 text-center transition-colors hover:bg-muted/50"
                      >
                        <Icon className="mx-auto size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
                        <span className="text-xs font-medium leading-snug text-foreground">{label}</span>
                        <span className="text-[11px] text-muted-foreground">Open →</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="mt-2 focus-visible:outline-none">
            <Card className="rounded-lg border border-border bg-card shadow-none">
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="text-lg font-semibold">Customers</CardTitle>
                <CardDescription className="text-sm">
                  View and manage customers, balances, and activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 px-5 py-5">
                <Button asChild size="sm">
                  <Link href="/customers">Open customer list</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/customers/new">New customer</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/sales?tab=customers">Sales · Customers</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="mt-2 focus-visible:outline-none">
            <Card className="rounded-lg border border-border bg-card shadow-none">
              <CardHeader className="border-b border-border px-5 py-4">
                <CardTitle className="text-lg font-semibold">Leads</CardTitle>
                <CardDescription className="text-sm">Prospects and contacts.</CardDescription>
              </CardHeader>
              <CardContent className="px-5 py-5">
                <Button asChild size="sm">
                  <Link href="/contacts">Open leads &amp; contacts</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {["marketing", "contracts", "reviews"].map((id) => (
            <TabsContent key={id} value={id} className="mt-2 focus-visible:outline-none">
              <Card className="rounded-lg border border-dashed border-border bg-muted/20 shadow-none">
                <CardHeader className="border-b border-dashed border-border px-5 py-4">
                  <CardTitle className="text-lg font-semibold capitalize">{id}</CardTitle>
                  <CardDescription className="text-sm">Coming soon</CardDescription>
                </CardHeader>
                <CardContent className="px-5 py-5">
                  <p className="max-w-xl text-sm text-muted-foreground">
                    This section is coming soon. Campaigns, contracts, and reviews will live here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

export default function CustomersLeadsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-7xl space-y-6 p-6">
            <Skeleton className="h-24 w-full max-w-xl rounded-md" />
            <Skeleton className="h-10 w-72 rounded-md" />
            <Skeleton className="h-40 w-full rounded-lg border border-border" />
          </div>
        </div>
      }
    >
      <CustomersLeadsContent />
    </Suspense>
  );
}
