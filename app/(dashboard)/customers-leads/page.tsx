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
  ArrowRight,
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

  const funnelSteps: {
    label: string;
    value: number;
    badge?: string;
    href?: string;
    icon: LucideIcon;
  }[] = [
    { label: "Open opportunities", value: 0, icon: Target },
    { label: "Open estimates", value: 0, icon: FileSpreadsheet },
    { label: "Open contracts", value: 0, icon: ScrollText },
    { label: "In progress projects", value: 0, icon: LayoutList },
    {
      label: "Unpaid invoices",
      value: unpaidCount,
      badge: overdueCount > 0 ? `${overdueCount} overdue` : undefined,
      href: "/sales?tab=invoices&invoiceFilter=unpaid",
      icon: Receipt,
    },
    { label: "Reviews", value: 0, icon: Star },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:px-8 lg:py-6 2xl:max-w-[1536px]">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Customers &amp; leads</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Customers &amp; leads</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline health, surveys, and shortcuts in one place.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full space-y-6">
          <TabsList className="mb-2 h-auto min-h-10 w-full flex-wrap justify-start gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
            {[
              { id: "overview", label: "Overview" },
              { id: "customers", label: "Customers" },
              { id: "leads", label: "Leads" },
              { id: "marketing", label: "Marketing" },
              { id: "contracts", label: "Contracts" },
              { id: "reviews", label: "Reviews" },
            ].map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="rounded-lg px-3 py-2 text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-10">
            {/* Pipeline funnel */}
            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold tracking-tight">Pipeline snapshot</h2>
                  <p className="text-xs text-muted-foreground">Key counts across your sales workflow</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">As of today</span>
              </div>

              <div className="flex flex-col gap-2 lg:flex-row lg:flex-nowrap lg:items-stretch lg:gap-0">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex min-w-0 flex-1 items-stretch">
                        <Skeleton className="h-[172px] w-full min-w-[132px] flex-1 rounded-xl" />
                        {i < 5 ? (
                          <div className="hidden shrink-0 items-center justify-center px-1 text-muted-foreground/35 lg:flex">
                            <ArrowRight className="h-4 w-4" />
                          </div>
                        ) : null}
                      </div>
                    ))
                  : funnelSteps.map((step, i) => {
                      const Icon = step.icon;
                      // Fixed grid: same icon row, title band, value, and badge slot on every card so labels align across the row.
                      const inner = (
                        <>
                          <div className="bg-linear-to-r from-emerald-500/90 via-teal-500/80 to-emerald-600/90 h-1 w-full shrink-0" />
                          <CardContent className="flex min-h-[168px] flex-col p-4 pt-3">
                            <div className="flex h-9 shrink-0 items-center justify-between gap-2">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                              </div>
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
                                {step.href ? (
                                  <ChevronRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                                ) : null}
                              </span>
                            </div>
                            <div className="mt-3 flex min-h-11 items-end">
                              <p className="w-full text-[11px] font-semibold uppercase leading-snug tracking-wider text-muted-foreground">
                                {step.label}
                              </p>
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums leading-none tracking-tight text-foreground md:text-3xl">
                              {step.value}
                            </p>
                            <div className="mt-2 min-h-[26px]">
                              {step.badge ? (
                                <Badge variant="destructive" className="font-normal">
                                  {step.badge}
                                </Badge>
                              ) : (
                                <span className="block min-h-[22px] w-full" aria-hidden />
                              )}
                            </div>
                          </CardContent>
                        </>
                      );
                      return (
                        <div key={step.label} className="flex min-w-0 flex-1 items-stretch gap-0">
                          <Card
                            className={cn(
                              "flex h-full min-h-0 flex-1 flex-col border-border/80 shadow-sm",
                              step.href && "transition-shadow hover:shadow-md"
                            )}
                          >
                            {step.href ? (
                              <Link
                                href={step.href}
                                className="group flex h-full flex-col text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                aria-label={`${step.label}: ${step.value}. Open unpaid invoices in Sales.`}
                              >
                                {inner}
                              </Link>
                            ) : (
                              <div className="flex h-full flex-col">{inner}</div>
                            )}
                          </Card>
                          {i < funnelSteps.length - 1 && (
                            <div className="hidden items-center justify-center px-1.5 text-muted-foreground/50 lg:flex">
                              <ArrowRight className="h-4 w-4" aria-hidden />
                            </div>
                          )}
                        </div>
                      );
                    })}
              </div>
            </section>

            {/* Surveys */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Post-invoice surveys</h2>
              <p className="text-xs text-muted-foreground">
                Automate follow-ups after you send an invoice—configure each flow below.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Work requests",
                    desc: "Drive repeat business using the post-invoice survey.",
                    icon: MessageSquare,
                    accent: "from-violet-500/15 to-card",
                  },
                  {
                    title: "Referrals",
                    desc: "Generate referrals using the post-invoice survey.",
                    icon: Share2,
                    accent: "from-sky-500/15 to-card",
                  },
                  {
                    title: "Reviews & testimonials",
                    desc: "Collect feedback using the post-invoice survey.",
                    icon: Sparkles,
                    accent: "from-amber-500/15 to-card",
                  },
                ].map((w) => {
                  const SurveyIcon = w.icon;
                  return (
                  <Card
                    key={w.title}
                    className="flex flex-col overflow-hidden border-border/80 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="space-y-3 pb-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br border border-border/60",
                            w.accent
                          )}
                        >
                          <SurveyIcon className="h-5 w-5 text-foreground/80" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <CardTitle className="text-base font-semibold leading-tight">{w.title}</CardTitle>
                          <CardDescription className="text-sm leading-relaxed">{w.desc}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4 pt-0">
                      <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-4">
                        <div className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Preview
                        </div>
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
                          Survey content is configured in settings
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="w-full border-border/80" type="button">
                        Manage survey settings
                      </Button>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            </section>

            {/* Overdue + Estimates */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-border/60 pb-4">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Overdue invoices</CardTitle>
                      <CardDescription>Balances past due date · as of today</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                    {loading ? <Skeleton className="inline-block h-9 w-40" /> : formatPHP(overdueTotal)}
                  </div>
                  <div className="overflow-hidden rounded-lg border border-border/80">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
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
                  <Button variant="link" className="h-auto p-0 text-sm font-medium" asChild>
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

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Open estimates</CardTitle>
                      <CardDescription>Quotes you&apos;ve sent that are still open</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-4 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border/80 bg-muted/30">
                    <FileSpreadsheet className="h-7 w-7 text-muted-foreground/70" />
                  </div>
                  <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                    You have no open estimates. Create an estimate to win more jobs.
                  </p>
                  <Button type="button" variant="outline" className="border-border/80">
                    Create an estimate
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Tasks + Shortcuts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <CardTitle className="text-base font-semibold">Tasks</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground">All open tasks</span>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-14 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                  </div>
                  <p className="font-medium text-foreground">You&apos;re caught up</p>
                  <p className="mt-1 max-w-xs text-sm text-muted-foreground">No tasks need your attention right now.</p>
                  <Button variant="link" className="mt-4 h-auto p-0 text-sm font-medium" asChild>
                    <Link href="#">Show all</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/80 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">Shortcuts</CardTitle>
                  </div>
                  <CardDescription>Jump to common customer and billing actions</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
                        className="group flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 text-center transition-colors hover:border-border hover:bg-muted/40"
                      >
                        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-border/60 transition-transform group-hover:scale-[1.02]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium leading-snug text-foreground">{label}</span>
                        <span className="inline-flex items-center justify-center gap-0.5 text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                          Open
                          <ChevronRight className="h-3 w-3 opacity-70" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-lg">Customers</CardTitle>
                <CardDescription>
                  View and manage all customers, balances, and activity.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 pt-6">
                <Button asChild>
                  <Link href="/customers">Open customer list</Link>
                </Button>
                <Button asChild variant="outline" className="border-border/80">
                  <Link href="/customers/new">New customer</Link>
                </Button>
                <Button asChild variant="outline" className="border-border/80">
                  <Link href="/sales?tab=customers">Sales · Customers</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="mt-4">
            <Card className="border-border/80 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-lg">Leads</CardTitle>
                <CardDescription>Track prospects and convert them to customers.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Button asChild>
                  <Link href="/contacts">Open leads &amp; contacts</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {["marketing", "contracts", "reviews"].map((id) => (
            <TabsContent key={id} value={id} className="mt-4">
              <Card className="border-border/80 shadow-sm">
                <CardHeader className="border-b border-border/60 pb-4">
                  <CardTitle className="text-lg capitalize">{id}</CardTitle>
                  <CardDescription>Coming soon</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    This section is coming soon. Connect campaigns, contracts, and reviews here when those modules are
                    enabled.
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
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </div>
      }
    >
      <CustomersLeadsContent />
    </Suspense>
  );
}
