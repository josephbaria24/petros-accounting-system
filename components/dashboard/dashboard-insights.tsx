"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Check, ChevronDown, MoreVertical } from "lucide-react"

export type ProfitLossPoint = {
  label: string
  income: number
  expenses: number
}

export type ExpenseCategoryPoint = {
  name: string
  value: number
}

export type SalesPoint = {
  month: string
  amount: number
}

export type DashboardInsightsProps = {
  profitLoss: {
    defaultKey: string
    options: Record<
      string,
      {
        label: string
        previousLabel: string
        netProfit: number
        previousNetProfit: number
        income: number
        expenses: number
        series: ProfitLossPoint[]
      }
    >
  }
  expenses: {
    defaultKey: string
    options: Record<
      string,
      {
        label: string
        total: number
        byCategory: ExpenseCategoryPoint[]
      }
    >
  }
  sales: {
    defaultKey: string
    options: Record<
      string,
      {
        label: string
        total: number
        series: SalesPoint[]
      }
    >
  }
}

const currency = (value: number) =>
  `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const compactK = (value: number) => {
  const n = Number(value || 0)
  if (Math.abs(n) >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 10_000) return `₱${(n / 1_000).toFixed(1)}k`
  return currency(n)
}

function pctChange(current: number, previous: number) {
  if (!Number.isFinite(previous) || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

const chartConfig = {
  income: { label: "Income", color: "var(--chart-2)" },
  expenses: { label: "Expenses", color: "var(--chart-5)" },
  amount: { label: "Amount", color: "var(--chart-1)" },
} satisfies ChartConfig

function donutColor(name: string) {
  const key = (name || "").trim().toLowerCase()
  if (!key) return "var(--chart-1)"

  // Keep a few familiar mappings, but ensure everything else gets a stable distinct color.
  switch (key) {
    case "rent":
      return "var(--chart-3)"
    case "utilities":
      return "var(--chart-4)"
    case "transport":
      return "var(--chart-5)"
    case "supplies":
      return "var(--chart-2)"
  }

  // Deterministic string hash -> pick from palette.
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0

  const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ] as const

  return palette[h % palette.length]
}

export function DashboardInsights(props: DashboardInsightsProps) {
  const [plKey, setPlKey] = React.useState(props.profitLoss.defaultKey)
  const [expenseKey, setExpenseKey] = React.useState(props.expenses.defaultKey)
  const [salesKey, setSalesKey] = React.useState(props.sales.defaultKey)

  const pl = props.profitLoss.options[plKey] ?? Object.values(props.profitLoss.options)[0]
  const expense = props.expenses.options[expenseKey] ?? Object.values(props.expenses.options)[0]
  const sales = props.sales.options[salesKey] ?? Object.values(props.sales.options)[0]

  const plDelta = pctChange(pl?.netProfit || 0, pl?.previousNetProfit || 0)
  const plDeltaLabel =
    plDelta === null ? "—" : `${plDelta >= 0 ? "+" : ""}${plDelta.toFixed(0)}%`

  const plDeltaTone =
    plDelta === null
      ? "border-border bg-muted/60 text-muted-foreground"
      : plDelta >= 0
        ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
        : "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"

  const topCategories = (expense?.byCategory || []).slice(0, 5)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Profit & Loss */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/60 pb-4 space-y-0">
          <div>
            <CardTitle className="text-base">Profit &amp; Loss</CardTitle>
            <CardDescription>{pl?.label}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground hover:text-foreground">
                  {pl?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                {Object.entries(props.profitLoss.options).map(([key, opt]) => (
                  <DropdownMenuItem key={key} onClick={() => setPlKey(key)} className="flex items-center justify-between">
                    <span className="truncate">{opt.label}</span>
                    {key === plKey ? <Check className="h-4 w-4" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="More">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Net profit</p>
            <div className="flex items-center justify-between gap-3">
              <p className="text-2xl font-semibold tabular-nums tracking-tight">{currency(pl?.netProfit || 0)}</p>
              <Badge variant="outline" className={plDeltaTone}>
                {plDeltaLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {plDelta === null ? "No prior period comparison available" : `vs ${pl?.previousLabel}`}
            </p>
          </div>

          <Separator className="my-4" />

          <ChartContainer config={chartConfig} className="aspect-auto h-[140px] w-full">
            <BarChart data={pl?.series || []} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis hide />
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
              <Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 6, 6]} />
              <Bar dataKey="expenses" fill="var(--color-expenses)" radius={[6, 6, 6, 6]} />
            </BarChart>
          </ChartContainer>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Income</p>
              <p className="mt-1 font-semibold tabular-nums text-emerald-700 dark:text-emerald-200">
                {compactK(pl?.income || 0)}
              </p>
            </div>
            <div className="rounded-lg border border-border/80 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="mt-1 font-semibold tabular-nums text-amber-950 dark:text-amber-100">
                {compactK(pl?.expenses || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/60 pb-4 space-y-0">
          <div>
            <CardTitle className="text-base">Expenses</CardTitle>
            <CardDescription>{expense?.label}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground hover:text-foreground">
                  {expense?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                {Object.entries(props.expenses.options).map(([key, opt]) => (
                  <DropdownMenuItem key={key} onClick={() => setExpenseKey(key)} className="flex items-center justify-between">
                    <span className="truncate">{opt.label}</span>
                    {key === expenseKey ? <Check className="h-4 w-4" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="More"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Spending</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{currency(expense?.total || 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Top categories</p>
            </div>
            <Badge variant="outline" className="border-border bg-muted/60 font-mono tabular-nums">
              100%
            </Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <ChartContainer config={chartConfig} className="aspect-square h-[160px] w-full">
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      nameKey="name"
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-6">
                          <span className="text-muted-foreground">{String(name)}</span>
                          <span className="font-mono font-medium tabular-nums">{currency(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={expense?.byCategory || []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={46}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="hsl(var(--background))"
                  strokeWidth={2}
                >
                  {(expense?.byCategory || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={donutColor(entry.name)} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="space-y-2">
              {topCategories.length ? (
                topCategories.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: donutColor(c.name) }} />
                      <span className="truncate text-muted-foreground">{c.name}</span>
                    </div>
                    <Badge variant="outline" className="shrink-0 font-mono tabular-nums">
                      {currency(c.value)}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No expenses yet.</p>
              )}
            </div>
          </div>

          <div className="mt-4 text-sm">
            <Button variant="link" className="h-auto p-0 text-primary">
              View all spending
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 border-b border-border/60 pb-4 space-y-0">
          <div>
            <CardTitle className="text-base">Sales</CardTitle>
            <CardDescription>{sales?.label}</CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground hover:text-foreground">
                  {sales?.label}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56">
                {Object.entries(props.sales.options).map(([key, opt]) => (
                  <DropdownMenuItem key={key} onClick={() => setSalesKey(key)} className="flex items-center justify-between">
                    <span className="truncate">{opt.label}</span>
                    {key === salesKey ? <Check className="h-4 w-4" /> : null}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="More"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Total amount</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{currency(sales?.total || 0)}</p>

          <div className="mt-4">
            <ChartContainer config={chartConfig} className="aspect-auto h-[170px] w-full">
              <LineChart data={sales?.series || []} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickMargin={8}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <div className="flex w-full items-center justify-between gap-6">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-mono font-medium tabular-nums">{currency(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="var(--color-amount)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

