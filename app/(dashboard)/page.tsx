//app\(dashboard)\page.tsx


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDateRangePicker } from "@/components/date-range-picker"
import { DollarSign, TrendingUp, Users, Target, Plus, FileText, CreditCard } from "lucide-react"
import { createServer } from "@/lib/supabase-server"
import Link from "next/link"

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

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <CalendarDateRangePicker />
            <Link href="/invoices/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </Link>
          </div>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices">Recent Invoices</TabsTrigger>
            <TabsTrigger value="payments">Recent Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {dashboardStats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Invoice Status Overview</CardTitle>
                  <CardDescription>Current status of all invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { status: 'paid', label: 'Paid', color: 'bg-green-500' },
                      { status: 'unpaid', label: 'Unpaid', color: 'bg-yellow-500' },
                      { status: 'overdue', label: 'Overdue', color: 'bg-red-500' },
                      { status: 'draft', label: 'Draft', color: 'bg-gray-500' },
                    ].map(({ status, label, color }) => {
                      const count = invoices?.filter(inv => inv.status === status).length || 0
                      const amount = invoices?.filter(inv => inv.status === status)
                        .reduce((sum, inv) => sum + Number(inv.total_amount), 0) || 0
                      const percentage = invoices?.length ? (count / invoices.length * 100).toFixed(1) : 0

                      return (
                        <div key={status} className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${color} mr-3`}></div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">{label}</span>
                              <span className="text-sm text-muted-foreground">{count} invoices</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="w-full bg-muted rounded-full h-2 mr-3">
                                <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                              </div>
                              <span className="text-sm font-medium">₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Latest invoices from customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentInvoices && recentInvoices.length > 0 ? (
                      recentInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {invoice.customers?.name || 'Unknown Customer'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.invoice_no} • {new Date(invoice.issue_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">
                              ₱{Number(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </div>
                            <div className={`text-xs ${
                              invoice.status === 'paid' ? 'text-green-600' :
                              invoice.status === 'overdue' ? 'text-red-600' :
                              'text-yellow-600'
                            }`}>
                              {invoice.status}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No invoices yet. Create your first invoice to get started.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Invoices</CardTitle>
                <CardDescription>Complete list of invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invoices && invoices.length > 0 ? (
                    invoices.slice(0, 10).map((invoice) => (
                      <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer">
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
                            <p className="text-sm font-medium">
                              ₱{Number(invoice.total_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                            <p className={`text-xs capitalize ${
                              invoice.status === 'paid' ? 'text-green-600' :
                              invoice.status === 'overdue' ? 'text-red-600' :
                              'text-yellow-600'
                            }`}>
                              {invoice.status}
                            </p>
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

          <TabsContent value="payments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
                <CardDescription>Latest payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payments && payments.length > 0 ? (
                    payments.slice(0, 10).map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted">
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{payment.payment_method || 'Payment'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.payment_date).toLocaleDateString()}
                              {payment.reference_no && ` • Ref: ${payment.reference_no}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-green-600">
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
    </div>
  )
}