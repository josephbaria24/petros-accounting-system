"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
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
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

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

  const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"]

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
        const status = inv.status || "draft"
        statusMap.set(status, (statusMap.get(status) || 0) + (inv.total_amount || 0))
      })

      const statusChartData = Array.from(statusMap, ([status, amount]) => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: Math.round(amount),
      }))

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

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{(metrics.totalInvoiced / 1000).toFixed(1)}k</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₱{(metrics.totalPaid / 1000).toFixed(1)}k</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₱{(metrics.unpaidAmount / 1000).toFixed(1)}k</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCustomers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue & Payments Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" stroke="#888888" fontSize={12} />
                <YAxis stroke="#888888" fontSize={12} tickFormatter={(value) => `₱${value / 1000}k`} />
                <Tooltip
                  formatter={(value) => `₱${value.toLocaleString()}`}
                  contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Invoiced"
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="paid"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Payments"
                  dot={{ fill: "#10b981", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Invoice Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ₱${(value / 1000).toFixed(0)}k`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={topCustomers}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" stroke="#888888" fontSize={12} tickFormatter={(value) => `₱${value / 1000}k`} />
              <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} width={190} />
              <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
              <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
