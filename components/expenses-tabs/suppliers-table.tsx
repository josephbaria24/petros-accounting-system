//components\expenses-tabs\suppliers-table.tsx
"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { fetchAllPaged } from "@/lib/supabase-fetch-all"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { MessageSquare, Printer, Settings, Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

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

  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const rowsPerPage = 20

  // dialogs
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [showImportSuppliers, setShowImportSuppliers] = useState(false)
  const [showEditSupplier, setShowEditSupplier] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null)

  // create supplier form
  const [creating, setCreating] = useState(false)
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  })

  // import suppliers
  const [importing, setImporting] = useState(false)
  const [importFileName, setImportFileName] = useState<string>("")
  const [importPreviewCount, setImportPreviewCount] = useState<number>(0)
  const [importRows, setImportRows] = useState<
    Array<{ name: string; email?: string; phone?: string; address?: string; notes?: string }>
  >([])

  const [totalPaidLast30Days, setTotalPaidLast30Days] = useState(0)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  /** Supabase PostgREST returns at most 1000 rows per request; paginate until exhausted. */
  async function fetchSuppliers() {
    setLoading(true)
    try {
    // 1) Fetch all suppliers (batched)
    const supplierRows = await fetchAllPaged((from, to) =>
      supabase.from("suppliers").select("id, name, phone, email, address").order("name").range(from, to)
    )

    // 2) Open bills for balances (batched)
    const openBills = await fetchAllPaged((from, to) =>
      supabase
        .from("bills")
        .select("vendor_id, balance_due, status")
        .in("status", ["unpaid", "partial", "overdue"])
        .range(from, to)
    )

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 3) Paid bills last 30 days (batched)
    const paidBills = await fetchAllPaged((from, to) =>
      supabase
        .from("bills")
        .select("total_amount, status, bill_date")
        .eq("status", "paid")
        .gte("bill_date", thirtyDaysAgo.toISOString().split("T")[0])
        .range(from, to)
    )

    const paidTotal = paidBills.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0)
    setTotalPaidLast30Days(paidTotal)

    const balanceByVendor = new Map<string, number>()
    for (const b of openBills) {
      const vid = b.vendor_id as string | null
      if (!vid) continue
      const current = balanceByVendor.get(vid) ?? 0
      balanceByVendor.set(vid, current + Number(b.balance_due ?? 0))
    }

    // 3) Map to table rows (REAL DATA)
    const mapped: Supplier[] = supplierRows.map((s) => ({
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

  const resetSupplierForm = () => {
    setSupplierForm({ name: "", email: "", phone: "", address: "", notes: "" })
  }

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplierId(s.id)
    setSupplierForm({
      name: s.name ?? "",
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
      notes: "",
    })
    setShowEditSupplier(true)
  }

  const handleCreateSupplier = async () => {
    const name = supplierForm.name.trim()
    if (!name) {
      toast({ title: "Missing supplier name", description: "Please enter a supplier name.", variant: "destructive" })
      return
    }

    setCreating(true)
    try {
      // Some DB schemas may not have notes; only include fields we know are selected elsewhere.
      const payload: any = {
        name,
        email: supplierForm.email.trim() || null,
        phone: supplierForm.phone.trim() || null,
        address: supplierForm.address.trim() || null,
      }

      const { error } = await supabase.from("suppliers").insert(payload)
      if (error) throw error

      toast({ title: "Supplier created", description: `"${name}" was added successfully.` })
      setShowNewSupplier(false)
      resetSupplierForm()
      await fetchSuppliers()
    } catch (err: any) {
      console.error("Create supplier failed:", err)
      toast({
        title: "Create failed",
        description: err?.message ?? "Failed to create supplier. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleUpdateSupplier = async () => {
    if (!editingSupplierId) return
    const name = supplierForm.name.trim()
    if (!name) {
      toast({ title: "Missing supplier name", description: "Please enter a supplier name.", variant: "destructive" })
      return
    }

    setCreating(true)
    try {
      const payload: any = {
        name,
        email: supplierForm.email.trim() || null,
        phone: supplierForm.phone.trim() || null,
        address: supplierForm.address.trim() || null,
      }

      const { error } = await supabase.from("suppliers").update(payload).eq("id", editingSupplierId)
      if (error) throw error

      toast({ title: "Supplier updated", description: `"${name}" was updated successfully.` })
      setShowEditSupplier(false)
      setEditingSupplierId(null)
      resetSupplierForm()
      await fetchSuppliers()
    } catch (err: any) {
      console.error("Update supplier failed:", err)
      toast({
        title: "Update failed",
        description: err?.message ?? "Failed to update supplier. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  const handleMakeInactive = async (supplierId: string) => {
    const ok = window.confirm("Make this supplier inactive? (This requires an is_active column in your suppliers table.)")
    if (!ok) return

    try {
      const { error } = await supabase.from("suppliers").update({ is_active: false } as any).eq("id", supplierId)
      if (error) throw error
      toast({ title: "Supplier updated", description: "Supplier marked as inactive." })
      await fetchSuppliers()
    } catch (err: any) {
      console.error("Make inactive failed:", err)
      const msg = String(err?.message ?? "")
      const missingColumn =
        msg.toLowerCase().includes("column") && msg.toLowerCase().includes("is_active")
      toast({
        title: "Make inactive failed",
        description: missingColumn
          ? 'Your database is missing `suppliers.is_active` (boolean). Add it in Supabase to enable this action.'
          : err?.message ?? "Failed to update supplier.",
        variant: "destructive",
      })
    }
  }

  const parseCsvLine = (line: string) => {
    // Minimal CSV parser supporting quotes.
    const out: string[] = []
    let cur = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
        continue
      }
      if (ch === "," && !inQuotes) {
        out.push(cur)
        cur = ""
        continue
      }
      cur += ch
    }
    out.push(cur)
    return out.map((v) => v.trim())
  }

  const handleImportFile = async (file: File) => {
    setImporting(true)
    setImportFileName(file.name)
    setImportRows([])
    setImportPreviewCount(0)
    try {
      const raw = await file.text()
      const text = raw.replace(/^\uFEFF/, "")
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)

      if (!lines.length) {
        throw new Error("CSV file is empty.")
      }

      const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim())
      const idxOf = (...names: string[]) => {
        for (const n of names) {
          const i = header.indexOf(n)
          if (i !== -1) return i
        }
        return -1
      }

      const nameIdx = idxOf("name", "supplier", "supplier name", "company", "company name")
      if (nameIdx === -1) {
        console.log("CSV headers found:", JSON.stringify(header))
        throw new Error(`CSV must include a "name" or "supplier" column. Found headers: ${header.join(", ")}`)
      }

      const emailIdx = idxOf("email", "e-mail", "email address")
      const phoneIdx = idxOf("phone", "phone number", "telephone", "mobile")
      const addressIdx = idxOf("address", "street address", "street")
      const cityIdx = idxOf("city")
      const stateIdx = idxOf("state", "province")
      const countryIdx = idxOf("country")
      const zipIdx = idxOf("zip", "zip code", "postal code")
      const notesIdx = idxOf("notes", "note", "memo")
      const companyIdx = idxOf("company name", "company")

      const rows = lines.slice(1).map((line) => {
        const cols = parseCsvLine(line)
        const get = (i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "")

        const addressParts = [get(addressIdx), get(cityIdx), get(stateIdx), get(zipIdx), get(countryIdx)].filter(Boolean)

        return {
          name: get(nameIdx) || get(companyIdx),
          email: get(emailIdx) || undefined,
          phone: get(phoneIdx) || undefined,
          address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
          notes: get(notesIdx) || undefined,
        }
      })

      const cleaned = rows.filter((r) => r.name && r.name.trim().length > 0)
      setImportRows(cleaned)
      setImportPreviewCount(cleaned.length)

      if (!cleaned.length) {
        throw new Error("No valid rows found. Make sure at least one row has a supplier name.")
      }
    } finally {
      setImporting(false)
    }
  }

  const handleRunImport = async () => {
    if (!importRows.length) {
      toast({ title: "Nothing to import", description: "Upload a CSV first.", variant: "destructive" })
      return
    }
    setImporting(true)
    try {
      const payload = importRows.map((r) => ({
        name: r.name.trim(),
        email: r.email?.trim() || null,
        phone: r.phone?.trim() || null,
        address: r.address?.trim() || null,
      }))

      const { error } = await supabase.from("suppliers").insert(payload)
      if (error) throw error

      toast({ title: "Import complete", description: `Imported ${payload.length} supplier(s).` })
      setShowImportSuppliers(false)
      setImportRows([])
      setImportFileName("")
      setImportPreviewCount(0)
      await fetchSuppliers()
    } catch (err: any) {
      console.error("Import suppliers failed:", err)
      toast({
        title: "Import failed",
        description: err?.message ?? "Failed to import suppliers. Please check your CSV and try again.",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

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
                <DropdownMenuItem onClick={() => setShowNewSupplier(true)}>New Supplier</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowImportSuppliers(true)}>Import Suppliers</DropdownMenuItem>
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
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                {(() => {
                  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
                  const page = Math.min(currentPage, totalPages)
                  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage)

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-muted-foreground">
                          {suppliers.length === 0 ? 'No suppliers found. Click "New Supplier" to add one.' : "No matching suppliers found."}
                        </td>
                      </tr>
                    )
                  }

                  return paginated.map((supplier) => (
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
                            <DropdownMenuItem onClick={() => openEditSupplier(supplier)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMakeInactive(supplier.id)}>Make inactive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>

            {/* Pagination */}
            {(() => {
              const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
              const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage))
              const page = Math.min(currentPage, totalPages)
              const start = (page - 1) * rowsPerPage + 1
              const end = Math.min(page * rowsPerPage, filtered.length)

              if (filtered.length <= rowsPerPage) return null

              return (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    {start}-{end} of {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                      .reduce<(number | string)[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...")
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) =>
                        typeof p === "string" ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">…</span>
                        ) : (
                          <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 text-xs" onClick={() => setCurrentPage(p)}>
                            {p}
                          </Button>
                        )
                      )}
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setCurrentPage(page + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {/* New Supplier Dialog */}
      <Dialog
        open={showNewSupplier}
        onOpenChange={(open) => {
          setShowNewSupplier(open)
          if (!open) resetSupplierForm()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Supplier</DialogTitle>
            <DialogDescription>Add a supplier to use as a Payee in expenses and bills.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Supplier name *</Label>
              <Input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Petrosphere Services Inc."
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="supplier@email.com"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="09xx..."
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Textarea
                value={supplierForm.address}
                onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street, City, Province"
                className="mt-2 min-h-[90px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowNewSupplier(false)} disabled={creating}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleCreateSupplier} disabled={creating}>
              {creating ? "Creating..." : "Create Supplier"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog
        open={showEditSupplier}
        onOpenChange={(open) => {
          setShowEditSupplier(open)
          if (!open) {
            setEditingSupplierId(null)
            resetSupplierForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update supplier details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Supplier name *</Label>
              <Input
                value={supplierForm.name}
                onChange={(e) => setSupplierForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Petrosphere Services Inc."
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="supplier@email.com"
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Phone</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="09xx..."
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Address</Label>
              <Textarea
                value={supplierForm.address}
                onChange={(e) => setSupplierForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Street, City, Province"
                className="mt-2 min-h-[90px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowEditSupplier(false)} disabled={creating}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleUpdateSupplier} disabled={creating}>
              {creating ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Suppliers Dialog */}
      <Dialog
        open={showImportSuppliers}
        onOpenChange={(open) => {
          setShowImportSuppliers(open)
          if (!open) {
            setImportRows([])
            setImportFileName("")
            setImportPreviewCount(0)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Suppliers</DialogTitle>
            <DialogDescription>
              Upload a CSV with headers: <span className="font-medium">name</span> (required),{" "}
              <span className="font-medium">email</span>, <span className="font-medium">phone</span>,{" "}
              <span className="font-medium">address</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">CSV file</Label>
              <Input
                className="mt-2"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleImportFile(f)
                }}
              />
              {importFileName && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Selected: <span className="font-medium text-foreground">{importFileName}</span>
                </div>
              )}
            </div>

            <div className="text-sm">
              Preview: <span className="font-medium">{importPreviewCount}</span> row(s)
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowImportSuppliers(false)} disabled={importing}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleRunImport}
              disabled={importing || importRows.length === 0}
            >
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}