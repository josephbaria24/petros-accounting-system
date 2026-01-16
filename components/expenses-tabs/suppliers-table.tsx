//components\expenses-tabs\suppliers-table.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageSquare, Printer, Settings, Search, ChevronDown } from "lucide-react"

type Supplier = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  open_balance: number
  currency: string
}

export default function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSuppliers()
  }, [])

async function fetchSuppliers() {
  setLoading(true)
  try {
    // 1) Fetch suppliers
    const { data: supplierRows, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id, name, phone, email, address")
      .order("name")

    if (suppliersError) throw suppliersError

    // 2) Fetch open balances per supplier from bills (unpaid/partial/overdue)
    const { data: openBills, error: billsError } = await supabase
      .from("bills")
      .select("vendor_id, balance_due, status")
      .in("status", ["unpaid", "partial", "overdue"])

    if (billsError) throw billsError

    const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: paidBills, error: paidErr } = await supabase
        .from("bills")
        .select("total_amount, status, bill_date")
        .eq("status", "paid")
        .gte("bill_date", thirtyDaysAgo.toISOString().split("T")[0])

      if (paidErr) throw paidErr

      const paidTotal = (paidBills ?? []).reduce(
        (sum, b) => sum + Number(b.total_amount ?? 0),
        0
      )

      setTotalPaidLast30Days(paidTotal)


    const balanceByVendor = new Map<string, number>()
    for (const b of openBills ?? []) {
      const vid = b.vendor_id as string | null
      if (!vid) continue
      const current = balanceByVendor.get(vid) ?? 0
      balanceByVendor.set(vid, current + Number(b.balance_due ?? 0))
    }

    // 3) Map to table rows (REAL DATA)
    const mapped: Supplier[] = (supplierRows ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      phone: s.phone ?? null,
      email: s.email ?? null,
      address: s.address ?? null,
      currency: "PHP", // your DB doesn't store supplier currency; keep constant or add a column later
      open_balance: balanceByVendor.get(s.id) ?? 0,
    }))

    setSuppliers(mapped)
  } catch (error) {
    console.error("Error fetching suppliers:", error)
  } finally {
    setLoading(false)
  }
}


const [totalPaidLast30Days, setTotalPaidLast30Days] = useState(0)

  return (
    <div className="flex flex-col">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Suppliers</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <MessageSquare className="mr-2 h-4 w-4" />
              Give feedback
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  New Supplier
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>New Supplier</DropdownMenuItem>
                <DropdownMenuItem>Import Suppliers</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-500 text-white p-4 rounded-lg">
            <div className="text-3xl font-bold">0</div>
            <div className="text-sm">0 OVERDUE</div>
            <div className="text-xs mt-1">Unpaid Last 365 Days</div>
          </div>
          <div className="bg-gray-300 p-4 rounded-lg">
            <div className="text-3xl font-bold">0</div>
            <div className="text-sm">0 OPEN BILLS</div>
          </div>
          <div className="bg-green-500 text-white p-4 rounded-lg">
            <div className="text-3xl font-bold">PHP{totalPaidLast30Days.toLocaleString()}</div>
            <div className="text-sm">41 PAID LAST 30 DAYS</div>
            <div className="text-xs mt-1">Paid</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-card border-b">
                <tr>
                  <th className="text-left p-3 font-medium w-10">
                    <Checkbox />
                  </th>
                  <th className="text-left p-3 font-medium">SUPPLIER ↑</th>
                  <th className="text-left p-3 font-medium">ADDRESS</th>
                  <th className="text-left p-3 font-medium">PHONE</th>
                  <th className="text-left p-3 font-medium">EMAIL</th>
                  <th className="text-left p-3 font-medium">CURRENCY</th>
                  <th className="text-right p-3 font-medium">OPEN BALANCE</th>
                  <th className="text-left p-3 font-medium">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-muted-foreground">
                      No suppliers found. Click "New Supplier" to add one.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id} className="border-b hover:bg-secondary">
                      <td className="p-3">
                        <Checkbox />
                      </td>
                      <td className="p-3 font-medium">{supplier.name}</td>
                      <td className="p-3">{supplier.address || "-"}</td>
                      <td className="p-3">{supplier.phone || "-"}</td>
                      <td className="p-3">{supplier.email || "-"}</td>
                      <td className="p-3">{supplier.currency}</td>
                      <td className="p-3 text-right">
                        PHP{supplier.open_balance.toFixed(2)}
                      </td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600"
                            >
                              Create bill
                              <ChevronDown className="ml-1 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>Create bill</DropdownMenuItem>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>Make inactive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}