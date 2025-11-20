"use client"

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  ColumnDef
} from "@tanstack/react-table"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// 1. Import Supabase types
import { Database } from "@/lib/supabase-types"

// 2. Define Invoice type from your generated types
type Invoice = Database["public"]["Tables"]["invoices"]["Row"]

// 3. Strongly type the column helper
const columnHelper = createColumnHelper<Invoice>()

export default function InvoicesTable() {
  const supabase = createClient()

  // 4. Strongly typed useState
  const [data, setData] = useState<Invoice[]>([])

  // 5. Strongly typed columns
  const columns: ColumnDef<Invoice, any>[] = [
    columnHelper.accessor("invoice_no", {
      header: "Invoice No",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("customer_id", {
      header: "Customer",
    }),
    columnHelper.accessor("total_amount", {
      header: "Total",
      cell: (info) => `₱${info.getValue()}`,
    }),
    columnHelper.accessor("status", {
      header: "Status",
    }),
    columnHelper.accessor("due_date", {
      header: "Due Date",
    }),
  ]

  // 6. Typed table
  const table = useReactTable<Invoice>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // 7. Load data from Supabase
  useEffect(() => {
    async function load() {
      const { data: invoices } = await supabase.from("invoices").select("*")
      setData(invoices || [])
    }
    load()
  }, [])

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map(headerGroup => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <TableHead key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>

      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
