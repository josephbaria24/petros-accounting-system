"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import Link from "next/link"
import { Database } from "@/lib/supabase-types"

type Customer = Database["public"]["Tables"]["customers"]["Row"]
export default function CustomersTable() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])


  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("customers").select("*")
      setCustomers(data || [])
    }
    load()
  }, [])

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {customers.map((c: any) => (
          <TableRow key={c.id}>
            <TableCell>{c.name}</TableCell>
            <TableCell>{c.email}</TableCell>
            <TableCell>{c.phone}</TableCell>
            <TableCell>
              <Link className="text-blue-600" href={`/sales/customer/${c.id}`}>
                View
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
