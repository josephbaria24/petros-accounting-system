//components\sales-tabs\payments-table.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react"

// Type for payment with invoice details
type PaymentWithInvoice = {
  id: string
  amount: number
  payment_method: string | null
  payment_date: string | null
  reference_no: string | null
  invoice_id: string | null
  invoices: {
    invoice_no: string
    customers: {
      name: string
    } | null
  }
}

export default function PaymentsTable() {
  const supabase = createClient()
  const [payments, setPayments] = useState<PaymentWithInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    async function load() {
      setLoading(true)
      
      // Get total count
      const { count } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
      
      setTotalCount(count || 0)

      // Get paginated data
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          invoices!inner (
            invoice_no,
            customers (
              name
            )
          )
        `)
        .order("payment_date", { ascending: false })
        .range(from, to)

      if (error) {
        console.error("Error loading payments:", error)
      } else {
        setPayments(data || [])
      }
      setLoading(false)
    }
    load()
  }, [currentPage])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const currency = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (loading) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Payments</CardTitle>
              <CardDescription>Recent payment activity</CardDescription>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4 space-y-0">
        <div>
          <CardTitle className="text-base">Payments</CardTitle>
          <CardDescription>
            {totalCount ? `${totalCount.toLocaleString()} payment${totalCount === 1 ? "" : "s"}` : "No payments yet"}
          </CardDescription>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CreditCard className="h-4 w-4" />
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-[170px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoice
                </TableHead>
                <TableHead className="w-[280px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="w-[160px] pr-6 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount
                </TableHead>
                <TableHead className="w-[180px] pl-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Date
                </TableHead>
                <TableHead className="w-[170px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Method
                </TableHead>
                <TableHead className="w-[200px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Reference
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    No payments found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => (
                  <TableRow key={p.id} className="h-12 border-border/60">
                    <TableCell className="font-medium">
                      {p.invoices?.invoice_no ? (
                        <Link href={`/invoices/${p.invoice_id}`} className="hover:underline underline-offset-4">
                          {p.invoices.invoice_no}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="block truncate">{p.invoices?.customers?.name || "—"}</span>
                    </TableCell>
                    <TableCell className="pr-6 text-right font-semibold tabular-nums whitespace-nowrap">
                      {currency(p.amount)}
                    </TableCell>
                    <TableCell className="pl-6 text-sm text-muted-foreground whitespace-nowrap">
                      {p.payment_date
                        ? new Date(p.payment_date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline" className="capitalize">
                        {p.payment_method || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <span className="block truncate">{p.reference_no || "—"}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalCount > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to{" "}
              {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} payments
            </div>
            {totalCount > itemsPerPage ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm font-medium">
                  Page {currentPage} of {totalPages}
                </div>
                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}