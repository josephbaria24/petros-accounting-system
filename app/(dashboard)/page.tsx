//app/(dashboard)/page.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { DollarSign, TrendingUp, Users, Target, Plus, FileText, CreditCard } from "lucide-react"
import { createServer } from "@/lib/supabase-server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { DashboardInsights } from "@/components/dashboard/dashboard-insights"

// Helper function to get date ranges
function getDateRanges() {
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  
  return { currentMonth, lastMonth, lastMonthEnd }
}

export default async function Dashboard() {
  const supabase = await createServer()
  
  // Auth guard - check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { currentMonth, lastMonth, lastMonthEnd } = getDateRanges()

  // Fetch invoices data
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false })

  const { data: currentMonthInvoices } = await supabase
    .from("invoices")
    .select("*")
    .gte("issue_date", currentMonth.toISOString().split('T')[0])

  const { data: lastMonthInvoices } = await supabase
    .from("invoices")
    .select("*")
    .gte("issue_date", lastMonth.toISOString().split('T')[0])
    .lte("issue_date", lastMonthEnd.toISOString().split('T')[0])

  // Fetch payments data
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("payment_date", { ascending: false })

  // Fetch expenses + bills for dashboard insights
  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount, category, created_at")

  const { data: bills } = await supabase
    .from("bills")
    .select("total_amount, bill_date, status")

  const { data: currentMonthPayments } = await supabase
    .from("payments")
    .select("*")
    .gte("payment_date", currentMonth.toISOString().split('T')[0])

  const { data: lastMonthPayments } = await supabase
    .from("payments")
    .select("*")
    .gte("payment_date", lastMonth.toISOString().split('T')[0])
    .lte("payment_date", lastMonthEnd.toISOString().split('T')[0])

  // Fetch customers count
  const { count: totalCustomers } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })

  const { count: newCustomersThisMonth } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .gte("created_at", currentMonth.toISOString())

  const { count: newCustomersLastMonth } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .gte("created_at", lastMonth.toISOString())
    .lt("created_at", currentMonth.toISOString())

  // Calculate metrics
  const currentRevenue = currentMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const lastRevenue = lastMonthPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1) : "0"

  const paidInvoicesThisMonth = currentMonthInvoices?.filter(inv => inv.status === 'paid').length || 0
  const paidInvoicesLastMonth = lastMonthInvoices?.filter(inv => inv.status === 'paid').length || 0
  const invoiceGrowth = paidInvoicesLastMonth > 0 ? paidInvoicesThisMonth - paidInvoicesLastMonth : paidInvoicesThisMonth

  const totalUnpaid = invoices?.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + Number(inv.balance_due || inv.total_amount), 0) || 0

  const customersThisMonth = newCustomersThisMonth ?? 0
  const customersLastMonth = newCustomersLastMonth ?? 0
  const customerGrowth = customersLastMonth > 0 
    ? ((customersThisMonth - customersLastMonth) / customersLastMonth * 100).toFixed(1) 
    : customersThisMonth > 0 ? "100" : "0"
    
  // Recent invoices with customer info
  const { data: recentInvoices } = await supabase
    .from("invoices")
    .select(`
      *,
      customers (
        name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(5)

  // -------------------------
  // Dashboard insights helpers
  // -------------------------
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const addMonths = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, 1)
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
  const startOfWeek = (d: Date) => {
    // Monday-based week
    const day = d.getDay() // 0..6 (Sun..Sat)
    const diff = (day + 6) % 7 // Mon=0 ... Sun=6
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff)
  }

  const now = new Date()
  const thisYearStart = new Date(now.getFullYear(), 0, 1)
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)

  const quarter = Math.floor(now.getMonth() / 3) // 0..3
  const thisQuarterStart = new Date(now.getFullYear(), quarter * 3, 1)
  const lastQuarterStart = addMonths(thisQuarterStart, -3)
  const lastQuarterEnd = new Date(thisQuarterStart.getTime() - 24 * 60 * 60 * 1000)

  const toISODate = (d: Date) => d.toISOString().split("T")[0]

  const inRange = (raw: string | null, from: Date, to: Date) => {
    if (!raw) return false
    const dt = new Date(raw)
    if (Number.isNaN(dt.getTime())) return false
    return dt >= from && dt <= to
  }

  const sumPayments = (from: Date, to: Date) =>
    (payments || []).filter((p) => inRange(p.payment_date || null, from, to)).reduce((s, p) => s + Number(p.amount || 0), 0)

  const sumExpenses = (from: Date, to: Date) => {
    const exp = (expenses || [])
      .filter((e) => inRange(e.created_at || null, from, to))
      .reduce((s, e) => s + Number(e.amount || 0), 0)
    const bill = (bills || [])
      .filter((b) => b.status !== "draft")
      .filter((b) => inRange(b.bill_date || null, from, to))
      .reduce((s, b) => s + Number(b.total_amount || 0), 0)
    return exp + bill
  }

  const rangeEndOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  const endOfMonth = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)

  const startOfQuarter = (d: Date) => new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
  const endOfQuarter = (d: Date) => {
    const s = startOfQuarter(d)
    const next = addMonths(s, 3)
    return new Date(next.getTime() - 1)
  }

  const msDay = 24 * 60 * 60 * 1000

  const ranges = {
    "last-30-days": {
      label: "Last 30 days",
      from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      to: rangeEndOfDay(now),
    },
    "this-month": {
      label: "This month",
      from: startOfMonth(now),
      to: endOfMonth(now),
    },
    "this-month-to-date": {
      label: "This month to date",
      from: startOfMonth(now),
      to: rangeEndOfDay(now),
    },
    "this-fiscal-quarter": {
      label: "This fiscal quarter",
      from: startOfQuarter(now),
      to: endOfQuarter(now),
    },
    "this-fiscal-quarter-to-date": {
      label: "This fiscal quarter to date",
      from: startOfQuarter(now),
      to: rangeEndOfDay(now),
    },
    "this-financial-year": {
      label: "This financial year",
      from: thisYearStart,
      to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
    },
    "this-financial-year-to-date": {
      label: "This financial year to date",
      from: thisYearStart,
      to: rangeEndOfDay(now),
    },
    "last-month": {
      label: "Last month",
      from: startOfMonth(addMonths(now, -1)),
      to: endOfMonth(addMonths(now, -1)),
    },
    "last-fiscal-quarter": {
      label: "Last fiscal quarter",
      from: startOfQuarter(addMonths(now, -3)),
      to: endOfQuarter(addMonths(now, -3)),
    },
    "last-financial-year": {
      label: "Last financial year",
      from: lastYearStart,
      to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
    },
  } as const

  // Sales-specific ranges (match provided dropdown options & order)
  const salesRangeEntries = [
    ["today", { label: "Today", from: startOfDay(now), to: rangeEndOfDay(now) }],
    ["this-week", { label: "This week", from: startOfWeek(now), to: new Date(startOfWeek(now).getTime() + 7 * msDay - 1) }],
    ["this-week-to-date", { label: "This week to date", from: startOfWeek(now), to: rangeEndOfDay(now) }],
    ["this-fiscal-week", { label: "This fiscal week", from: startOfWeek(now), to: new Date(startOfWeek(now).getTime() + 7 * msDay - 1) }],
    ["this-month", { label: "This month", from: startOfMonth(now), to: endOfMonth(now) }],
    ["this-month-to-date", { label: "This month to date", from: startOfMonth(now), to: rangeEndOfDay(now) }],
    ["this-quarter", { label: "This quarter", from: startOfQuarter(now), to: endOfQuarter(now) }],
    ["this-quarter-to-date", { label: "This quarter to date", from: startOfQuarter(now), to: rangeEndOfDay(now) }],
    ["this-fiscal-quarter", { label: "This fiscal quarter", from: startOfQuarter(now), to: endOfQuarter(now) }],
    ["this-fiscal-quarter-to-date", { label: "This fiscal quarter to date", from: startOfQuarter(now), to: rangeEndOfDay(now) }],
    ["this-year", { label: "This year", from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) }],
    ["this-year-to-date", { label: "This year to date", from: new Date(now.getFullYear(), 0, 1), to: rangeEndOfDay(now) }],
    ["this-year-to-last-month", { label: "This year to last month", from: new Date(now.getFullYear(), 0, 1), to: endOfMonth(addMonths(now, -1)) }],
    ["this-financial-year", { label: "This financial year", from: thisYearStart, to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999) }],
    ["last-financial-year-to-date", { label: "Last financial year to date", from: lastYearStart, to: new Date(lastYearStart.getTime() + Math.max(1, Math.ceil((rangeEndOfDay(now).getTime() - thisYearStart.getTime()) / msDay)) * msDay - 1) }],
    ["last-year", { label: "Last year", from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999) }],
    ["last-7-days", { label: "Last 7 days", from: new Date(now.getTime() - 7 * msDay), to: rangeEndOfDay(now) }],
    ["last-30-days", { label: "Last 30 days", from: new Date(now.getTime() - 30 * msDay), to: rangeEndOfDay(now) }],
    ["last-90-days", { label: "Last 90 days", from: new Date(now.getTime() - 90 * msDay), to: rangeEndOfDay(now) }],
    ["last-12-months", { label: "Last 12 months", from: addMonths(startOfMonth(now), -11), to: rangeEndOfDay(now) }],
    ["since-30-days-ago", { label: "Since 30 days ago", from: new Date(now.getTime() - 30 * msDay), to: rangeEndOfDay(now) }],
    ["since-60-days-ago", { label: "Since 60 days ago", from: new Date(now.getTime() - 60 * msDay), to: rangeEndOfDay(now) }],
    ["since-90-days-ago", { label: "Since 90 days ago", from: new Date(now.getTime() - 90 * msDay), to: rangeEndOfDay(now) }],
    ["since-365-days-ago", { label: "Since 365 days ago", from: new Date(now.getTime() - 365 * msDay), to: rangeEndOfDay(now) }],
    ["next-week", { label: "Next week", from: new Date(startOfWeek(now).getTime() + 7 * msDay), to: new Date(startOfWeek(now).getTime() + 14 * msDay - 1) }],
    ["next-4-weeks", { label: "Next 4 weeks", from: new Date(startOfWeek(now).getTime() + 7 * msDay), to: new Date(startOfWeek(now).getTime() + 35 * msDay - 1) }],
    ["next-month", { label: "Next month", from: startOfMonth(addMonths(now, 1)), to: endOfMonth(addMonths(now, 1)) }],
    ["next-quarter", { label: "Next quarter", from: startOfQuarter(addMonths(now, 3)), to: endOfQuarter(addMonths(now, 3)) }],
    ["next-fiscal-quarter", { label: "Next fiscal quarter", from: startOfQuarter(addMonths(now, 3)), to: endOfQuarter(addMonths(now, 3)) }],
    ["next-year", { label: "Next year", from: new Date(now.getFullYear() + 1, 0, 1), to: new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999) }],
    ["next-financial-year", { label: "Next financial year", from: new Date(now.getFullYear() + 1, 0, 1), to: new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999) }],
  ] as const

  const buildExpensesOption = (from: Date, to: Date) => {
    const expRows = (expenses || []).filter((e) => inRange(e.created_at || null, from, to))
    const expTotal = expRows.reduce((s, e) => s + Number(e.amount || 0), 0)
    const billsTotal = (bills || [])
      .filter((b) => b.status !== "draft")
      .filter((b) => inRange(b.bill_date || null, from, to))
      .reduce((s, b) => s + Number(b.total_amount || 0), 0)

    const catMap = new Map<string, number>()
    expRows.forEach((e) => {
      const key = (e.category || "Other").trim() || "Other"
      catMap.set(key, (catMap.get(key) || 0) + Number(e.amount || 0))
    })
    if (billsTotal > 0) {
      catMap.set("Bills", (catMap.get("Bills") || 0) + billsTotal)
    }

    const byCategory = Array.from(catMap, ([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    return { total: Math.round(expTotal + billsTotal), byCategory }
  }

  const daysBetween = (from: Date, to: Date) => Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))

  const buildSalesSeries = (from: Date, to: Date) => {
    const days = daysBetween(from, to)
    const rows = (invoices || []).filter((inv) => inRange(inv.issue_date || null, from, to))

    if (days <= 62) {
      const m = new Map<string, number>()
      rows.forEach((inv) => {
        if (!inv.issue_date) return
        const dt = new Date(inv.issue_date)
        if (Number.isNaN(dt.getTime())) return
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
        m.set(key, (m.get(key) || 0) + Number(inv.total_amount || 0))
      })

      const series: { month: string; amount: number }[] = []
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(to.getTime() - i * 24 * 60 * 60 * 1000)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        const label = d.toLocaleString("default", { month: "short", day: "numeric" })
        series.push({ month: label, amount: Math.round(m.get(key) || 0) })
      }
      return series
    }

    const monthMap = new Map<string, number>()
    rows.forEach((inv) => {
      if (!inv.issue_date) return
      const dt = new Date(inv.issue_date)
      if (Number.isNaN(dt.getTime())) return
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
      monthMap.set(key, (monthMap.get(key) || 0) + Number(inv.total_amount || 0))
    })

    const series: { month: string; amount: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = addMonths(startOfMonth(to), -i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleString("default", { month: "short" })
      series.push({ month: label, amount: Math.round(monthMap.get(key) || 0) })
    }
    return series
  }

  // Profit & Loss (Last fiscal quarter vs previous quarter)
  const plIncome = sumPayments(lastQuarterStart, lastQuarterEnd)
  const plExpenses = sumExpenses(lastQuarterStart, lastQuarterEnd)
  const plNet = plIncome - plExpenses
  const prevQuarterStart = addMonths(lastQuarterStart, -3)
  const prevQuarterEnd = new Date(lastQuarterStart.getTime() - 24 * 60 * 60 * 1000)
  const plPrevIncome = sumPayments(prevQuarterStart, prevQuarterEnd)
  const plPrevExpenses = sumExpenses(prevQuarterStart, prevQuarterEnd)
  const plPrevNet = plPrevIncome - plPrevExpenses

  const shortQuarterLabel = (d: Date) => {
    const q = Math.floor(d.getMonth() / 3) + 1
    const yy = String(d.getFullYear()).slice(-2)
    return `Q${q} FY${yy}`
  }

  const profitLossSeries = [
    {
      label: shortQuarterLabel(prevQuarterStart),
      income: Math.round(plPrevIncome),
      expenses: Math.round(plPrevExpenses),
    },
    {
      label: shortQuarterLabel(lastQuarterStart),
      income: Math.round(plIncome),
      expenses: Math.round(plExpenses),
    },
  ]

  // Build working filter options for Expenses + Sales
  const expenseOptions: Record<string, { label: string; total: number; byCategory: { name: string; value: number }[] }> = {}
  const salesOptions: Record<string, { label: string; total: number; series: { month: string; amount: number }[] }> = {}

  Object.entries(ranges).forEach(([key, r]) => {
    const exp = buildExpensesOption(r.from, r.to)
    expenseOptions[key] = { label: r.label, total: exp.total, byCategory: exp.byCategory }
  })

  salesRangeEntries.forEach(([key, r]) => {
    const series = buildSalesSeries(r.from, r.to)
    const total = series.reduce((s, p) => s + Number(p.amount || 0), 0)
    salesOptions[key] = { label: r.label, total, series }
  })

  // Profit & Loss options (same dropdown ranges as Expenses/Sales)
  const profitLossOptions: Record<
    string,
    {
      label: string
      previousLabel: string
      netProfit: number
      previousNetProfit: number
      income: number
      expenses: number
      series: { label: string; income: number; expenses: number }[]
    }
  > = {}

  const shiftRange = (from: Date, to: Date, days: number) => ({
    from: new Date(from.getTime() + days * msDay),
    to: new Date(to.getTime() + days * msDay),
  })

  const prevRangeFor = (key: string, from: Date, to: Date) => {
    // default: previous period with same duration ending right before `from`
    const durationDays = Math.max(1, Math.ceil((to.getTime() - from.getTime() + 1) / msDay))
    const prevTo = new Date(from.getTime() - 1)
    const prevFrom = new Date(prevTo.getTime() - durationDays * msDay + 1)

    if (key === "this-month") {
      const prev = addMonths(from, -1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    }
    if (key === "last-month") {
      const prev = addMonths(from, -1)
      return { from: startOfMonth(prev), to: endOfMonth(prev) }
    }
    if (key === "this-financial-year") {
      const prevYearStart = new Date(from.getFullYear() - 1, 0, 1)
      const prevYearEnd = new Date(from.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      return { from: prevYearStart, to: prevYearEnd }
    }
    if (key === "last-financial-year") {
      const prevYearStart = new Date(from.getFullYear() - 1, 0, 1)
      const prevYearEnd = new Date(from.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
      return { from: prevYearStart, to: prevYearEnd }
    }
    if (key === "this-fiscal-quarter") {
      const prev = addMonths(from, -3)
      return { from: startOfQuarter(prev), to: endOfQuarter(prev) }
    }
    if (key === "last-fiscal-quarter") {
      const prev = addMonths(from, -3)
      return { from: startOfQuarter(prev), to: endOfQuarter(prev) }
    }
    if (key === "this-month-to-date") {
      // compare vs same number of days into last month
      const prevMonthStart = startOfMonth(addMonths(from, -1))
      const days = Math.max(1, Math.ceil((to.getTime() - from.getTime() + 1) / msDay))
      return { from: prevMonthStart, to: new Date(prevMonthStart.getTime() + days * msDay - 1) }
    }
    if (key === "this-fiscal-quarter-to-date") {
      const prevQStart = startOfQuarter(addMonths(from, -3))
      const days = Math.max(1, Math.ceil((to.getTime() - from.getTime() + 1) / msDay))
      return { from: prevQStart, to: new Date(prevQStart.getTime() + days * msDay - 1) }
    }
    if (key === "this-financial-year-to-date") {
      const prevYStart = new Date(from.getFullYear() - 1, 0, 1)
      const days = Math.max(1, Math.ceil((to.getTime() - from.getTime() + 1) / msDay))
      return { from: prevYStart, to: new Date(prevYStart.getTime() + days * msDay - 1) }
    }
    if (key === "last-30-days") {
      return shiftRange(from, to, -30)
    }

    return { from: prevFrom, to: prevTo }
  }

  const shortLabelForRange = (from: Date, to: Date) => {
    const days = Math.ceil((to.getTime() - from.getTime() + 1) / msDay)
    if (days >= 360) return String(from.getFullYear())
    if (days >= 80) return from.toLocaleString("default", { month: "short", year: "2-digit" })
    return from.toLocaleString("default", { month: "short", day: "numeric" })
  }

  Object.entries(ranges).forEach(([key, r]) => {
    const prev = prevRangeFor(key, r.from, r.to)

    const income = sumPayments(r.from, r.to)
    const expensesSum = sumExpenses(r.from, r.to)
    const netProfit = income - expensesSum

    const prevIncome = sumPayments(prev.from, prev.to)
    const prevExpenses = sumExpenses(prev.from, prev.to)
    const prevNetProfit = prevIncome - prevExpenses

    profitLossOptions[key] = {
      label: r.label,
      previousLabel: `Previous (${r.label.toLowerCase()})`,
      income,
      expenses: expensesSum,
      netProfit,
      previousNetProfit: prevNetProfit,
      series: [
        {
          label: shortLabelForRange(prev.from, prev.to),
          income: Math.round(prevIncome),
          expenses: Math.round(prevExpenses),
        },
        {
          label: shortLabelForRange(r.from, r.to),
          income: Math.round(income),
          expenses: Math.round(expensesSum),
        },
      ],
    }
  })

  const dashboardStats = [
    {
      title: "Monthly Revenue",
      value: `₱${currentRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: `${Number(revenueGrowth) >= 0 ? '+' : ''}${revenueGrowth}% from last month`,
      icon: DollarSign,
    },
    {
      title: "Paid Invoices",
      value: paidInvoicesThisMonth.toString(),
      description: `${invoiceGrowth >= 0 ? '+' : ''}${invoiceGrowth} from last month`,
      icon: FileText,
    },
    {
      title: "Unpaid Amount",
      value: `₱${totalUnpaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: `${invoices?.filter(inv => inv.status === 'unpaid' || inv.status === 'overdue').length || 0} outstanding invoices`,
      icon: TrendingUp,
    },
    {
      title: "Total Customers",
      value: totalCustomers?.toString() || "0",
      description: `${Number(customerGrowth) >= 0 ? '+' : ''}${customerGrowth}% growth this month`,
      icon: Users,
    },
  ]

  const invoiceTotalCount = invoices?.length || 0

  const statusDefs = [
    { status: "paid", label: "Paid", dot: "bg-emerald-500", bar: "bg-emerald-600" },
    { status: "partial", label: "Partial", dot: "bg-sky-500", bar: "bg-sky-600" },
    { status: "sent", label: "Sent", dot: "bg-amber-500", bar: "bg-amber-500" },
    { status: "overdue", label: "Overdue", dot: "bg-red-500", bar: "bg-red-600" },
    { status: "draft", label: "Draft", dot: "bg-muted-foreground/50", bar: "bg-muted-foreground/40" },
  ] as const

  const statusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
      case "partial":
        return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100"
      case "overdue":
        return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
      case "sent":
      case "unpaid":
        return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
      case "draft":
        return "border-border bg-muted/70 text-muted-foreground"
      default:
        return "border-border bg-muted/50 text-foreground"
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:px-8 lg:py-6 2xl:max-w-[1536px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Dashboard</p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h2>
          <p className="text-sm text-muted-foreground">A quick snapshot of revenue, invoices, and customers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDateRangePicker />
          <Link href="/invoices/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-2 h-10 w-full justify-start gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
          <TabsTrigger value="overview" className="rounded-lg px-3">
            Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="rounded-lg px-3">
            Recent Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg px-3">
            Recent Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dashboardStats.map((stat, index) => (
                <Card key={index} className="border-border/80 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border/60 pb-3">
                    <div className="space-y-0.5">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                      <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

          <DashboardInsights
            profitLoss={{
              defaultKey: "last-fiscal-quarter",
              options: profitLossOptions,
            }}
            expenses={{
              defaultKey: "this-financial-year-to-date",
              options: expenseOptions,
            }}
            sales={{
              defaultKey: "last-12-months",
              options: salesOptions,
            }}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="border-border/80 shadow-sm lg:col-span-4">
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-base">Invoice status overview</CardTitle>
                <CardDescription>Current distribution across all invoices</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {statusDefs.map(({ status, label, dot, bar }) => {
                    const rows = invoices?.filter((inv) => inv.status === status) || []
                    const count = rows.length
                    const amount = rows.reduce((sum, inv) => sum + Number(inv.total_amount), 0)
                    const percentage = invoiceTotalCount ? Math.round((count / invoiceTotalCount) * 100) : 0

                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
                            <p className="text-sm font-medium">{label}</p>
                            <p className="text-xs text-muted-foreground">({count})</p>
                          </div>
                          <p className="text-sm font-semibold tabular-nums">
                            ₱{amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className={cn("h-full rounded-full", bar)} style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 shadow-sm lg:col-span-3">
              <CardHeader className="border-b border-border/60 pb-4">
                <CardTitle className="text-base">Recent invoices</CardTitle>
                <CardDescription>Latest invoices created</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  {recentInvoices && recentInvoices.length > 0 ? (
                    recentInvoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="block rounded-lg border border-border/80 bg-card p-3 shadow-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {invoice.customers?.name || "Unknown Customer"}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {invoice.invoice_no} · {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : "—"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              ₱{Number(invoice.total_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </p>
                            <Badge variant="outline" className={cn("mt-1 capitalize", statusBadge(invoice.status))}>
                              {invoice.status || "—"}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 py-10 text-center">
                      <p className="text-sm font-medium">No invoices yet</p>
                      <p className="mt-1 text-sm text-muted-foreground">Create your first invoice to get started.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4 space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base">Recent invoices</CardTitle>
              <CardDescription>Quick access to the latest invoices</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                  {invoices && invoices.length > 0 ? (
                    invoices.slice(0, 10).map((invoice) => (
                      <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                        <div className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-3 shadow-sm transition-colors hover:bg-muted/30">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{invoice.invoice_no}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(invoice.issue_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              ₱{Number(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            <Badge variant="outline" className={cn("mt-1 capitalize", statusBadge(invoice.status))}>
                              {invoice.status}
                            </Badge>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No invoices found</p>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-4">
              <CardTitle className="text-base">Recent payments</CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-2">
                  {payments && payments.length > 0 ? (
                    payments.slice(0, 10).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-lg border border-border/80 bg-card p-3 shadow-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{payment.payment_method || 'Payment'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.payment_date).toLocaleDateString()}
                              {payment.reference_no && ` • Ref: ${payment.reference_no}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-200">
                          +₱{Number(payment.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No payments found</p>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}