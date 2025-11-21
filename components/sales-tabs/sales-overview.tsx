"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"

export default function SalesOverview() {
  const supabase = createClient()
  const [metrics, setMetrics] = useState({
    totalInvoices: 0,
    totalPaid: 0,
    totalPayments: 0,
    totalCustomers: 0
  })

  useEffect(() => {
    async function load() {
      const { data: invoices } = await supabase.from("invoices").select("*")
      const { data: payments } = await supabase.from("payments").select("*")
      const { data: customers } = await supabase.from("customers").select("*")

      const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

      setMetrics({
        totalInvoices: invoices?.length || 0,
        totalPaid,
        totalPayments: payments?.length || 0,
        totalCustomers: customers?.length || 0
      })
    }
    load()
  }, [])

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader><CardTitle>Total Invoices</CardTitle></CardHeader>
        <CardContent>{metrics.totalInvoices}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Total Payments</CardTitle></CardHeader>
        <CardContent>{metrics.totalPayments}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Paid Amount</CardTitle></CardHeader>
        <CardContent>₱{metrics.totalPaid.toLocaleString()}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Customers</CardTitle></CardHeader>
        <CardContent>{metrics.totalCustomers}</CardContent>
      </Card>
    </div>
  )
}
