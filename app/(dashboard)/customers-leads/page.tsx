"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  UserPlus,
  Users,
  UserSquare2,
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
  }[] = [
    { label: "Open opportunities", value: 0 },
    { label: "Open estimates", value: 0 },
    { label: "Open contracts", value: 0 },
    { label: "In progress projects", value: 0 },
    {
      label: "Unpaid invoices",
      value: unpaidCount,
      badge: overdueCount > 0 ? `${overdueCount} overdue` : undefined,
      href: "/sales?tab=invoices&invoiceFilter=unpaid",
    },
    { label: "Reviews", value: 0 },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Customers & leads</h1>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="h-auto flex flex-wrap w-full justify-start gap-0 rounded-none border-b bg-transparent p-0">
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
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview" className="space-y-8 mt-2">
            {/* Funnel */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground" />
              <span className="text-sm text-muted-foreground">As of today</span>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-2 lg:gap-0">
              {funnelSteps.map((step, i) => (
                <div key={step.label} className="flex items-stretch flex-1 min-w-0">
                  <Card
                    className={`flex-1 border-t-4 border-t-green-600 shadow-sm bg-card overflow-hidden ${
                      step.href ? "transition-shadow hover:shadow-md" : ""
                    }`}
                  >
                    {step.href ? (
                      <Link
                        href={step.href}
                        className="block p-0 text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 rounded-b-lg"
                        aria-label={`${step.label}: ${loading ? "loading" : step.value}. Open unpaid invoices in Sales.`}
                      >
                        <CardContent className="p-4 text-center">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            {step.label}
                          </p>
                          <p className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                            {loading ? "—" : step.value}
                          </p>
                          {step.badge && (
                            <p className="text-xs font-semibold text-destructive mt-1">{step.badge}</p>
                          )}
                        </CardContent>
                      </Link>
                    ) : (
                      <CardContent className="p-4 text-center">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          {step.label}
                        </p>
                        <p className="text-2xl md:text-3xl font-bold tabular-nums text-foreground">
                          {loading ? "—" : step.value}
                        </p>
                        {step.badge && (
                          <p className="text-xs font-semibold text-orange-600 mt-1">{step.badge}</p>
                        )}
                      </CardContent>
                    )}
                  </Card>
                  {i < funnelSteps.length - 1 && (
                    <div className="hidden lg:flex items-center justify-center px-1 text-muted-foreground shrink-0">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Survey row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Work Requests",
                  desc: "Drive repeat business using the post-invoice survey.",
                },
                {
                  title: "Referrals",
                  desc: "Generate referrals using the post-invoice survey.",
                },
                {
                  title: "Reviews & Testimonials",
                  desc: "Collect feedback using the post-invoice survey.",
                },
              ].map((w) => (
                <Card key={w.title} className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{w.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{w.desc}</p>
                    <div className="h-24 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground text-xs">
                      Survey preview
                    </div>
                    <Button variant="outline" size="sm" className="w-full" type="button">
                      Manage survey settings
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Overdue + Estimates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Overdue invoices
                    </p>
                    <p className="text-sm text-muted-foreground">As of today</p>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground mb-4">
                    {loading ? "—" : formatPHP(overdueTotal)}
                  </p>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left p-2 font-medium">Client</th>
                          <th className="text-left p-2 font-medium">Date</th>
                          <th className="text-right p-2 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueRows.length === 0 && !loading ? (
                          <tr>
                            <td colSpan={3} className="p-6 text-center text-muted-foreground text-sm">
                              No overdue invoices.
                            </td>
                          </tr>
                        ) : (
                          overdueRows.map((row) => {
                            const name = Array.isArray(row.customers)
                              ? row.customers[0]?.name
                              : row.customers?.name ?? "—";
                            return (
                              <tr key={row.id} className="border-b last:border-0">
                                <td className="p-2">{name}</td>
                                <td className="p-2 text-muted-foreground">
                                  {row.due_date
                                    ? new Date(row.due_date).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td className="p-2 text-right tabular-nums">
                                  {formatPHP(Number(row.balance_due ?? 0))}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <Link
                    href="/sales?tab=invoices"
                    className="inline-block mt-3 text-sm font-medium text-blue-600 hover:underline"
                  >
                    View invoices
                  </Link>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Open estimates
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center min-h-[200px] text-center space-y-4">
                  <p className="text-sm text-muted-foreground max-w-sm">
                    You have no open estimates. Create an estimate to win more jobs!
                  </p>
                  <Button type="button" variant="outline">
                    Create an estimate
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Tasks + Shortcuts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Tasks</CardTitle>
                  <span className="text-xs text-muted-foreground">All open tasks</span>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600 mb-3" />
                  <p className="font-medium text-foreground">You&apos;re caught up!</p>
                  <Link href="#" className="text-sm text-blue-600 mt-4 hover:underline">
                    Show all
                  </Link>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Shortcuts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { href: "/customers/new", label: "New Customer", icon: UserPlus },
                      { href: "/customers", label: "Import Customers", icon: Users },
                      { href: "/invoices/new", label: "Create Invoice", icon: ClipboardList },
                      { href: "/customers", label: "View Customers", icon: UserSquare2 },
                    ].map(({ href, label, icon: Icon }) => (
                      <Link
                        key={label}
                        href={href}
                        className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-center group"
                      >
                        <div className="relative">
                          <div className="h-12 w-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center group-hover:border-green-600/50">
                            <Icon className="h-5 w-5 text-muted-foreground group-hover:text-green-700" />
                          </div>
                          <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">
                            +
                          </span>
                        </div>
                        <span className="text-xs font-medium text-foreground leading-tight">{label}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="customers" className="mt-2">
            <Card>
              <CardHeader>
                <CardTitle>Customers</CardTitle>
                <p className="text-sm text-muted-foreground">
                  View and manage all customers, balances, and activity.
                </p>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/customers">Open customer list</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/customers/new">New customer</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/sales?tab=customers">Sales · Customers</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="mt-2">
            <Card>
              <CardHeader>
                <CardTitle>Leads</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track prospects and convert them to customers.
                </p>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/contacts">Open leads & contacts</Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {["marketing", "contracts", "reviews"].map((id) => (
            <TabsContent key={id} value={id} className="mt-2">
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">{id}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
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
    <Suspense fallback={<div className="p-8 text-muted-foreground">Loading…</div>}>
      <CustomersLeadsContent />
    </Suspense>
  );
}
