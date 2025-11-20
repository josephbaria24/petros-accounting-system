"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

// 1. Import generated Supabase types
import { Database } from "@/lib/supabase-types"

// 2. Define type alias for Payment row
type Payment = Database["public"]["Tables"]["payments"]["Row"]

export default function PaymentsTable() {
  const supabase = createClient()

  // 3. Strongly typed useState
  const [payments, setPayments] = useState<Payment[]>([])

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("payments").select("*")
      setPayments(data || [])
    }
    load()
  }, [])

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice ID</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Method</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell>{p.invoice_id}</TableCell>
            <TableCell>₱{p.amount}</TableCell>
            <TableCell>{p.payment_date}</TableCell>
            <TableCell>{p.payment_method}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
