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
import {
  MessageSquare,
  Printer,
  Settings,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  AlertTriangle,
  FileStack,
  CircleDollarSign,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Supplier = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  open_balance: number
  currency: string
}

type SupplierRow = {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
}

type OpenBillRow = {
  vendor_id: string | null
  balance_due: number | null
  status: string
  bill_date: string | null
}

type PaidBillRow = {
  total_amount: number | null
  status: string
  bill_date: string | null
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
  const [overdueCount, setOverdueCount] = useState(0)
  const [overdueBalance, setOverdueBalance] = useState(0)
  const [openBillsCount, setOpenBillsCount] = useState(0)
  const [unpaid365Count, setUnpaid365Count] = useState(0)
  const [paidLast30Count, setPaidLast30Count] = useState(0)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  /** Supabase PostgREST returns at most 1000 rows per request; paginate until exhausted. */
  async function fetchSuppliers() {
    setLoading(true)
    try {
    // 1) Fetch all suppliers (batched)
    const supplierRows = await fetchAllPaged<SupplierRow>((from, to) =>
      supabase.from("suppliers").select("id, name, phone, email, address").order("name").range(from, to) as unknown as Promise<{
        data: SupplierRow[] | null
        error: unknown
      }>
    )

    // 2) Open bills for balances (batched)
    const openBills = await fetchAllPaged<OpenBillRow>((from, to) =>
      supabase
        .from("bills")
        .select("vendor_id, balance_due, status, bill_date")
        .in("status", ["unpaid", "partial", "overdue"])
        .range(from, to) as unknown as Promise<{ data: OpenBillRow[] | null; error: unknown }>
    )

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 3) Paid bills last 30 days (batched)
    const paidBills = await fetchAllPaged<PaidBillRow>((from, to) =>
      supabase
        .from("bills")
        .select("total_amount, status, bill_date")
        .eq("status", "paid")
        .gte("bill_date", thirtyDaysAgo.toISOString().split("T")[0])
        .range(from, to) as unknown as Promise<{ data: PaidBillRow[] | null; error: unknown }>
    )

    const paidTotal = paidBills.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0)
    setTotalPaidLast30Days(paidTotal)
    setPaidLast30Count(paidBills.length)

    const overdueRows = openBills.filter((b) => b.status === "overdue")
    setOverdueCount(overdueRows.length)
    setOverdueBalance(overdueRows.reduce((sum, b) => sum + Number(b.balance_due ?? 0), 0))
    setOpenBillsCount(openBills.length)

    const cutoff365 = new Date()
    cutoff365.setDate(cutoff365.getDate() - 365)
    setUnpaid365Count(
      openBills.filter((b) => {
        const d = b.bill_date
        if (!d) return false
        return new Date(d) >= cutoff365
      }).length
    )

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

  const formatMoney = (value: number) =>
    `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const totalPagesFiltered = Math.max(1, Math.ceil(filteredSuppliers.length / rowsPerPage))
  const pageFiltered = Math.min(currentPage, totalPagesFiltered)
  const paginatedSuppliers = filteredSuppliers.slice(
    (pageFiltered - 1) * rowsPerPage,
    pageFiltered * rowsPerPage
  )

  if (loading) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-28" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col">
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight">Suppliers</CardTitle>
              <CardDescription>
                Vendors and payees for expenses and bills. Search, review balances, and create bills.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Give feedback
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                  New supplier
                  <ChevronDown className="h-4 w-4 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowNewSupplier(true)}>New supplier</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowImportSuppliers(true)}>Import from CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* KPI strip — compact, theme-aware */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative overflow-hidden rounded-xl border border-border/80 bg-linear-to-br from-amber-500/10 to-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{formatMoney(overdueBalance)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {overdueCount} overdue · {unpaid365Count} open in last 365 days
                  </p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/80 bg-muted/20 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Open bills</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{openBillsCount.toLocaleString()}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Unpaid, partial, or overdue</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <FileStack className="h-4 w-4" />
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl border border-border/80 bg-linear-to-br from-emerald-500/10 to-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Paid (30 days)</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{formatMoney(totalPaidLast30Days)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{paidLast30Count} bill(s) marked paid</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                  <CircleDollarSign className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search suppliers by name…"
                className="h-10 border-border/80 pl-10 shadow-sm"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
              />
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" type="button" aria-label="Print">
                <Printer className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" type="button" aria-label="Table settings">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-border/80 bg-card">
            <Table className="table-fixed min-w-[1024px]">
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-12">
                    <Checkbox className="translate-y-0.5" aria-label="Select all" />
                  </TableHead>
                  <TableHead className="w-[200px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Supplier
                  </TableHead>
                  <TableHead className="min-w-[180px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Address
                  </TableHead>
                  <TableHead className="w-[128px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Phone
                  </TableHead>
                  <TableHead className="w-[200px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </TableHead>
                  <TableHead className="w-[88px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Currency
                  </TableHead>
                  <TableHead className="w-[132px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Open balance
                  </TableHead>
                  <TableHead className="w-[148px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14 text-center text-sm text-muted-foreground">
                      {suppliers.length === 0
                        ? 'No suppliers yet. Use "New supplier" to add one.'
                        : "No suppliers match your search."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSuppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="h-12 border-border/60 hover:bg-muted/30">
                      <TableCell>
                        <Checkbox className="translate-y-0.5" aria-label={`Select ${supplier.name}`} />
                      </TableCell>
                      <TableCell className="whitespace-normal font-medium">
                        <span className="block max-w-[200px] truncate" title={supplier.name}>
                          {supplier.name}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-normal text-muted-foreground">
                        <span className="block max-w-[240px] truncate" title={supplier.address || undefined}>
                          {supplier.address?.trim() ? supplier.address : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {supplier.phone?.trim() ? supplier.phone : "—"}
                      </TableCell>
                      <TableCell className="whitespace-normal text-sm text-muted-foreground">
                        <span className="block max-w-[200px] truncate" title={supplier.email || undefined}>
                          {supplier.email?.trim() ? supplier.email : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal tabular-nums">
                          {supplier.currency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoney(supplier.open_balance)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 font-normal">
                              Create bill
                              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem>Create bill</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditSupplier(supplier)}>Edit supplier</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleMakeInactive(supplier.id)}>Make inactive</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredSuppliers.length > rowsPerPage ? (
            <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">
                {(pageFiltered - 1) * rowsPerPage + 1}–{Math.min(pageFiltered * rowsPerPage, filteredSuppliers.length)} of{" "}
                {filteredSuppliers.length}
              </span>
              <div className="flex flex-wrap items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={pageFiltered <= 1}
                  onClick={() => setCurrentPage(pageFiltered - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPagesFiltered }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPagesFiltered || Math.abs(p - pageFiltered) <= 2)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("…")
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    typeof p === "string" ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === pageFiltered ? "default" : "outline"}
                        size="sm"
                        className="h-8 min-w-8 px-2 text-xs"
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </Button>
                    )
                  )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={pageFiltered >= totalPagesFiltered}
                  onClick={() => setCurrentPage(pageFiltered + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : filteredSuppliers.length > 0 ? (
            <p className="border-t border-border/60 pt-4 text-sm text-muted-foreground">
              {filteredSuppliers.length} supplier{filteredSuppliers.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </CardContent>
      </Card>

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