//components\sales-tabs\sales-overview.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { DollarSign, FileText, Users, CreditCard, TrendingUp } from "lucide-react"

export default function SalesOverview() {
  const supabase = createClient()
  const [metrics, setMetrics] = useState({
    totalInvoices: 0,
    totalPaid: 0,
    totalPayments: 0,
    totalCustomers: 0,
    totalInvoiced: 0,
    unpaidAmount: 0,
  })
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [statusData, setStatusData] = useState<any[]>([])
  const [topCustomers, setTopCustomers] = useState<any[]>([])

  const currency = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const compactK = (value: number) => {
    const n = Number(value || 0)
    if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
    if (n >= 10_000) return `₱${(n / 1_000).toFixed(1)}k`
    return currency(n)
  }

  const chartConfig = {
    // IMPORTANT: our theme stores chart colors as hex/oklch values,
    // so we must use `var(--chart-x)` directly (not `hsl(var(--chart-x))`).
    revenue: { label: "Invoiced", color: "var(--chart-1)" },
    paid: { label: "Payments", color: "var(--chart-2)" },
    value: { label: "Amount", color: "var(--chart-1)" },
    total: { label: "Total", color: "var(--chart-1)" },
  } satisfies ChartConfig

  useEffect(() => {
    async function load() {
      // Fetch invoices with customer info
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*, customers(name)")

      // Fetch payments
      const { data: payments } = await supabase.from("payments").select("*")

      // Fetch customers
      const { data: customers } = await supabase.from("customers").select("*")

      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0
      const totalInvoiced = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0

      // Calculate monthly data
      const monthlyMap = new Map<string, { revenue: number; paid: number }>()
      invoices?.forEach((inv) => {
        const date = new Date(inv.issue_date)
        const month = date.toLocaleString("default", { month: "short", year: "2-digit" })
        const existing = monthlyMap.get(month) || { revenue: 0, paid: 0 }
        existing.revenue += inv.total_amount || 0
        monthlyMap.set(month, existing)
      })

      payments?.forEach((pay) => {
        const date = new Date(pay.payment_date)
        const month = date.toLocaleString("default", { month: "short", year: "2-digit" })
        const existing = monthlyMap.get(month) || { revenue: 0, paid: 0 }
        existing.paid += pay.amount || 0
        monthlyMap.set(month, existing)
      })

      const monthlyChartData = Array.from(monthlyMap, ([month, data]) => ({
        month,
        revenue: Math.round(data.revenue),
        paid: Math.round(data.paid),
      })).slice(-12)

      // Calculate status breakdown
      const statusMap = new Map<string, number>()
      invoices?.forEach((inv) => {
        const status = (inv.status || "draft").toLowerCase()
        statusMap.set(status, (statusMap.get(status) || 0) + (inv.total_amount || 0))
      })

      const statusChartData = Array.from(statusMap, ([status, amount]) => ({
        name: status,
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: Math.round(amount),
      }))
        .sort((a, b) => b.value - a.value)

      // Calculate top customers
      const customerMap = new Map<string, number>()
      invoices?.forEach((inv) => {
        const customerName = inv.customers?.name || "Unknown"
        customerMap.set(
          customerName,
          (customerMap.get(customerName) || 0) + (inv.total_amount || 0)
        )
      })

      const topCustomersData = Array.from(customerMap, ([name, total]) => ({
        name,
        total: Math.round(total),
      }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      setMonthlyData(monthlyChartData)
      setStatusData(statusChartData)
      setTopCustomers(topCustomersData)

      setMetrics({
        totalInvoices: invoices?.length || 0,
        totalPaid,
        totalPayments: payments?.length || 0,
        totalCustomers: customers?.length || 0,
        totalInvoiced,
        unpaidAmount: totalInvoiced - totalPaid,
      })
    }
    load()
  }, [])

  const kpis = [
    {
      title: "Total invoiced",
      value: compactK(metrics.totalInvoiced),
      helper: "All time",
      icon: DollarSign,
    },
    {
      title: "Total paid",
      value: compactK(metrics.totalPaid),
      helper: "All time",
      icon: CreditCard,
      valueClass: "text-emerald-700 dark:text-emerald-200",
    },
    {
      title: "Unpaid",
      value: compactK(metrics.unpaidAmount),
      helper: "Open balance",
      icon: TrendingUp,
      valueClass: "text-amber-950 dark:text-amber-100",
    },
    {
      title: "Invoices",
      value: metrics.totalInvoices.toLocaleString(),
      helper: "Count",
      icon: FileText,
    },
    {
      title: "Payments",
      value: metrics.totalPayments.toLocaleString(),
      helper: "Transactions",
      icon: CreditCard,
    },
    {
      title: "Customers",
      value: metrics.totalCustomers.toLocaleString(),
      helper: "Total",
      icon: Users,
    },
  ] as const

  const statusColor = (name: string) => {
    switch (name?.toLowerCase()) {
      case "paid":
        return "var(--chart-2)"
      case "partial":
        return "var(--chart-3)"
      case "overdue":
        return "var(--chart-5)"
      case "sent":
      case "unpaid":
        return "var(--chart-4)"
      case "draft":
      default:
        return "var(--muted-foreground)"
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 pb-3">
              <div className="space-y-0.5">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`text-xl font-semibold tracking-tight tabular-nums ${kpi.valueClass || ""}`}>
                  {kpi.value}
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <kpi.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{kpi.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue Chart */}
        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base">Revenue & payments</CardTitle>
            <CardDescription>Last 12 months trend</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
              <LineChart data={monthlyData} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickMargin={10}
                  tickFormatter={(v) => `₱${Math.round(Number(v) / 1000)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-6">
                          <span className="text-muted-foreground">{String(name)}</span>
                          <span className="font-mono font-medium tabular-nums">{currency(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Invoiced"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="paid"
                  name="Payments"
                  stroke="var(--color-paid)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Invoice Status Pie Chart */}
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base">Invoice status</CardTitle>
            <CardDescription>Share by amount</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="label"
                      formatter={(value, name, item) => (
                        <div className="flex w-full items-center justify-between gap-6">
                          <span className="text-muted-foreground">{String(item?.payload?.label || name)}</span>
                          <span className="font-mono font-medium tabular-nums">{currency(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={statusColor(entry.name)} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <Separator className="my-4" />

            <div className="space-y-2">
              {statusData.slice(0, 5).map((s: any) => (
                <div key={s.name} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: statusColor(s.name) }} />
                    <span className="truncate font-medium">{s.label}</span>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono tabular-nums">
                    {currency(s.value)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Chart */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base">Top customers</CardTitle>
          <CardDescription>By invoiced amount</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartContainer config={chartConfig} className="aspect-auto h-[320px] w-full">
            <BarChart data={topCustomers} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(v) => `₱${Math.round(Number(v) / 1000)}k`}
              />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={140}
                tickMargin={10}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="name"
                    formatter={(value) => (
                      <div className="flex w-full items-center justify-between gap-6">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-mono font-medium tabular-nums">{currency(Number(value))}</span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey="total" fill="var(--color-revenue)" radius={[6, 6, 6, 6]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
