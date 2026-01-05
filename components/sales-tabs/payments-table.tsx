//components\sales-tabs\payments-table.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

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

  if (loading) {
    return <div className="text-center py-4">Loading payments...</div>
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice No</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No payments found
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.invoices?.invoice_no || "N/A"}
                </TableCell>
                <TableCell>
                  {p.invoices?.customers?.name || "N/A"}
                </TableCell>
                <TableCell>
                  ₱{Number(p.amount).toLocaleString('en-PH', { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </TableCell>
                <TableCell>
                  {p.payment_date 
                    ? new Date(p.payment_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : "N/A"
                  }
                </TableCell>
                <TableCell className="capitalize">
                  {p.payment_method || "N/A"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {p.reference_no || "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {totalCount > itemsPerPage && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} payments
          </div> 
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}