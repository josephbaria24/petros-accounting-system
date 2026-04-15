//app\invoices\[id]\page.tsx
"use client"
import { sileo } from "sileo"

import { useEffect, useState, type ReactNode } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, FileText, Plus, RefreshCw, Trash2, Upload } from "lucide-react"

type Customer = {
  id: string
  name: string
  email: string | null
  billing_address: string | null
}

type InvoiceItem = {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  line_total: number
  tax_amount: number
  service_date: string | null
  product_service: string | null
  class: string | null
}

type CustomerAttachment = {
  id: string
  customer_id: string
  filename: string
  file_url: string
  file_size: number | null
  file_type: string | null
  uploaded_at: string
}

function invoiceStatusBadgeClass(status: string) {
  switch (status?.toLowerCase()) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
    case "sent":
      return "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100"
    case "draft":
      return "border-border bg-muted/80 text-muted-foreground"
    case "partial":
      return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100"
    case "overdue":
      return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
    default:
      return "border-border bg-muted/50 text-foreground"
  }
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="min-h-5 text-sm font-medium leading-snug text-foreground wrap-break-word">{children}</div>
    </div>
  )
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const invoiceId = params.id as string
  const NO_CODE_VALUE = "__none__";

  const [invoice, setInvoice] = useState<any>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [attachments, setAttachments] = useState<CustomerAttachment[]>([])
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
  const [replacingAttachmentId, setReplacingAttachmentId] = useState<string | null>(null)

  const [uploadingAttachment, setUploadingAttachment] = useState(false)


  
  const [codes, setCodes] = useState<{id: string, code: string, name: string}[]>([])
  const [editForm, setEditForm] = useState({
    customer_id: "",
    invoice_no: "",
    issue_date: "",
    due_date: "",
    status: "",
    notes: "",
    location: "",
    memo: "",
    terms: "",
    code: ""
  })

  const selectedCode =
    editForm.code && editForm.code !== NO_CODE_VALUE
      ? codes.find((c) => c.code === editForm.code) ?? null
      : null

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {

        // load code
        const { data: codesData } = await supabase
        .from("codes")
        .select("id, code, name")
        .order("code")
      
      setCodes(codesData || [])

        // Load customers
        const { data: customersData } = await supabase
          .from("customers")
          .select("id, name, email, billing_address")
          .order("name")
        
        setCustomers(customersData || [])

        // Load invoice
        const { data: invoiceData } = await supabase
          .from("invoices")
          .select("*, customers(id, name, email, billing_address)")
          .eq("id", invoiceId)
          .single()

        if (invoiceData) {
          setInvoice(invoiceData)
          setEditForm({
            customer_id: invoiceData.customer_id || "",
            invoice_no: invoiceData.invoice_no || "",
            issue_date: invoiceData.issue_date?.split("T")[0] || "",
            due_date: invoiceData.due_date?.split("T")[0] || "",
            status: invoiceData.status || "draft",
            notes: invoiceData.notes || "",
            location: invoiceData.location || "",
            memo: invoiceData.memo || "",
            terms: invoiceData.terms || "Due on receipt",
            code: invoiceData.code ? invoiceData.code : NO_CODE_VALUE
          })
          // Load customer attachments
          if (invoiceData.customer_id) {
            const { data: attachmentsData } = await supabase
              .from("customer_attachments")
              .select("*")
              .eq("customer_id", invoiceData.customer_id)
              .order("uploaded_at", { ascending: false })

            console.log("Loaded attachments:", attachmentsData)
            setAttachments(attachmentsData || [])
          }

          // Load invoice items
          const { data: itemsData } = await supabase
            .from("invoice_items")
            .select("*")
            .eq("invoice_id", invoiceId)
            .order("id")

          console.log("Loaded items:", itemsData) // Debug log
          setItems(itemsData || [])
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [invoiceId])



  const handleDeleteAttachment = async (attachmentId: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) {
      return
    }

    setDeletingAttachmentId(attachmentId)
    try {
      // Delete from database
      const { error } = await supabase
        .from("customer_attachments")
        .delete()
        .eq("id", attachmentId)

      if (error) throw error

      // Update local state
      setAttachments(attachments.filter(a => a.id !== attachmentId))
      sileo.success({ title: "Attachment deleted" })
    } catch (error) {
      console.error("Error deleting attachment:", error)
      sileo.error({ title: "Delete failed", description: "Could not delete attachment. Please try again." })
    } finally {
      setDeletingAttachmentId(null)
    }
  }

  const handleReplaceAttachment = async (attachmentId: string, oldFileUrl: string) => {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "image/*,application/pdf"  // Changed from "*/*"
      
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
        if (!validTypes.includes(file.type)) {
          sileo.warning({ title: "Invalid file type", description: "Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed." })
          return
        }

        setReplacingAttachmentId(attachmentId)
      try {
        const formData = new FormData()
        formData.append("attachment", file)

        // Upload new file
        const uploadResponse = await fetch("/api/upload-customer-attachment", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file")
        }

        const uploadResult = await uploadResponse.json()

        // Update database with new file URL
        const { error } = await supabase
          .from("customer_attachments")
          .update({
            filename: uploadResult.filename,
            file_url: uploadResult.url,
            file_size: file.size,
            file_type: file.type,
            uploaded_at: new Date().toISOString()
          })
          .eq("id", attachmentId)

        if (error) throw error

        // Update local state
        setAttachments(attachments.map(a => 
          a.id === attachmentId 
            ? {
                ...a,
                filename: uploadResult.filename,
                file_url: uploadResult.url,
                file_size: file.size,
                file_type: file.type,
                uploaded_at: new Date().toISOString()
              }
            : a
        ))

        sileo.success({ title: "Attachment replaced" })
      } catch (error) {
        console.error("Error replacing attachment:", error)
        sileo.error({ title: "Replace failed", description: "Could not replace attachment. Please try again." })
      } finally {
        setReplacingAttachmentId(null)
      }
    }

    input.click()
  }

  

  const handleAddAttachment = async () => {
    if (!invoice?.customer_id) {
      sileo.warning({ title: "No customer", description: "Please select a customer for this invoice." })
      return
    }

    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*,application/pdf"
    input.multiple = false
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        sileo.warning({ title: "Invalid file type", description: "Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed." })
        return
      }

      // Validate file size (e.g., max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        sileo.warning({ title: "File too large", description: "File size must be less than 10MB." })
        return
      }

      setUploadingAttachment(true)
      try {
        const formData = new FormData()
        formData.append("attachment", file)

        // Upload file
        const uploadResponse = await fetch("/api/upload-customer-attachment", {
          method: "POST",
          body: formData,
        })

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file")
        }

        const uploadResult = await uploadResponse.json()

        // Save to database
        const { data, error } = await supabase
          .from("customer_attachments")
          .insert({
            customer_id: invoice.customer_id,
            filename: uploadResult.filename,
            file_url: uploadResult.url,
            file_size: file.size,
            file_type: file.type
          })
          .select()
          .single()

        if (error) throw error

        // Update local state
        setAttachments([data, ...attachments])
        sileo.success({ title: "Attachment added" })
      } catch (error) {
        console.error("Error adding attachment:", error)
        sileo.error({ title: "Upload failed", description: "Could not add attachment. Please try again." })
      } finally {
        setUploadingAttachment(false)
      }
    }

    input.click()
  }


  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...items]
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    }

    // Recalculate line total and tax amount
    if (field === "quantity" || field === "unit_price" || field === "tax_rate") {
      const item = updatedItems[index]
      const qty = parseFloat(item.quantity?.toString() || "0")
      const price = parseFloat(item.unit_price?.toString() || "0")
      const taxRate = parseFloat(item.tax_rate?.toString() || "0")
      
      item.line_total = qty * price
      item.tax_amount = (qty * price) * (taxRate / 100)
    }

    setItems(updatedItems)
  }

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `temp-${Date.now()}`,
      invoice_id: invoiceId,
      description: "",
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
      line_total: 0,
      tax_amount: 0,
      service_date: null,
      product_service: null,
      class: null
    }
    setItems([...items, newItem])
  }

  const handleRemoveItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index)
    setItems(updatedItems)
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.line_total || 0), 0)
    const taxTotal = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0)
    const total = subtotal + taxTotal

    return { subtotal, taxTotal, total }
  }

  const handleSave = async () => {
    try {
      const totals = calculateTotals()
      
      // Update invoice - don't update total_amount as it's a computed column
      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          customer_id: editForm.customer_id,
          invoice_no: editForm.invoice_no,
          issue_date: editForm.issue_date || null,
          due_date: editForm.due_date || null,
          status: editForm.status,
          notes: editForm.notes,
          location: editForm.location,
          memo: editForm.memo,
          terms: editForm.terms,
          code: editForm.code === NO_CODE_VALUE ? null : editForm.code || null,
          subtotal: totals.subtotal,
          tax_total: totals.taxTotal,
          balance_due: totals.total
        })
        .eq("id", invoiceId)

      if (invoiceError) throw invoiceError

      // Delete removed items and update/insert items
      const existingItemIds = items
        .filter(item => !item.id.startsWith("temp-"))
        .map(item => item.id)

      // Delete items that were removed
      const { data: currentItems } = await supabase
        .from("invoice_items")
        .select("id")
        .eq("invoice_id", invoiceId)

      const itemsToDelete = currentItems
        ?.filter(item => !existingItemIds.includes(item.id))
        .map(item => item.id) || []

      if (itemsToDelete.length > 0) {
        await supabase
          .from("invoice_items")
          .delete()
          .in("id", itemsToDelete)
      }

      // Update or insert items
      for (const item of items) {
        // Don't include computed columns (line_total and tax_amount)
        const itemData = {
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          service_date: item.service_date,
          product_service: item.product_service,
          class: item.class
        }

        if (item.id.startsWith("temp-")) {
          // Insert new item
          await supabase
            .from("invoice_items")
            .insert(itemData)
        } else {
          // Update existing item
          await supabase
            .from("invoice_items")
            .update(itemData)
            .eq("id", item.id)
        }
      }

      // Reload invoice data
      const { data: updatedInvoice } = await supabase
        .from("invoices")
        .select("*, customers(id, name, email, billing_address)")
        .eq("id", invoiceId)
        .single()

      if (updatedInvoice) {
        setInvoice(updatedInvoice)
      }

      // Reload items with new IDs
      const { data: updatedItems } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("id")

      setItems(updatedItems || [])
      setIsEditing(false)
      sileo.success({ title: "Invoice saved", description: "All changes have been saved." })
    } catch (error: any) {
      console.error("Error saving invoice:", error?.message || error)
      sileo.error({ title: "Save failed", description: "Could not save invoice. Please try again." })
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch("/api/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      })
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `invoice-${invoice.invoice_no}.pdf`
      a.click()
    } catch (error) {
      console.error("Error downloading PDF:", error)
    }
  }

  const getSelectedCustomer = () => {
    return customers.find(c => c.id === editForm.customer_id) || invoice?.customers
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
          <div className="h-56 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-lg font-medium">Invoice not found</p>
        <p className="max-w-sm text-sm text-muted-foreground">This invoice may have been removed or the link is incorrect.</p>
        <Button variant="outline" className="mt-2" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go back
        </Button>
      </div>
    )
  }

  const totals = calculateTotals()
  const selectedCustomer = getSelectedCustomer()
  const displayStatus = isEditing ? editForm.status : invoice.status
  const issueLabel = invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : "—"
  const dueLabel = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "—"

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 lg:p-8 pb-12">
      {/* Document header */}
      <div className="flex flex-col gap-6 rounded-xl border border-border/80 bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Invoice</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {isEditing ? (
                <Input
                  value={editForm.invoice_no}
                  onChange={(e) => setEditForm({ ...editForm, invoice_no: e.target.value })}
                  className="h-10 max-w-xs text-xl font-semibold tracking-tight"
                />
              ) : (
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{invoice.invoice_no}</h1>
              )}
              <Badge
                variant="outline"
                className={cn("shrink-0 capitalize", invoiceStatusBadgeClass(displayStatus))}
              >
                {displayStatus || "—"}
              </Badge>
            </div>
            {!isEditing && (
              <p className="mt-2 text-sm text-muted-foreground">
                Issued {issueLabel}
                <span className="mx-2 text-border">·</span>
                Due {dueLabel}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
          <Button variant="outline" size="sm" className="shadow-sm" onClick={handleDownloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          {!isEditing ? (
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditing(false)
                  window.location.reload()
                }}
              >
                Cancel
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
                Save changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base">Bill to</CardTitle>
            <CardDescription>Customer and billing details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {isEditing ? (
              <>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</p>
                  <Select
                    value={editForm.customer_id}
                    onValueChange={(value) => setEditForm({ ...editForm, customer_id: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Project / training code
                  </p>
                  <Select
                    value={editForm.code || NO_CODE_VALUE}
                    onValueChange={(value) => setEditForm({ ...editForm, code: value })}
                  >
                    <SelectTrigger className="w-full h-auto min-h-14 items-start gap-3 py-3 whitespace-normal pr-10">
                      {selectedCode ? (
                        <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                          <span className="font-medium leading-tight">{selectedCode.code}</span>
                          <span className="text-xs leading-relaxed text-muted-foreground line-clamp-2 pb-0.5">
                            {selectedCode.name}
                          </span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Select code (optional)" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CODE_VALUE}>No code</SelectItem>
                      {codes.map((code) => (
                        <SelectItem key={code.id} value={code.code}>
                          <div className="flex w-full flex-col items-start gap-0.5">
                            <span className="font-medium leading-tight">{code.code}</span>
                            <span className="text-xs leading-snug text-muted-foreground">
                              {code.name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedCustomer && (
                  <>
                    <DetailField label="Email">
                      <span className="font-normal text-muted-foreground">{selectedCustomer.email || "N/A"}</span>
                    </DetailField>
                    <DetailField label="Billing address">
                      <span className="whitespace-pre-wrap font-normal text-muted-foreground">
                        {selectedCustomer.billing_address || "N/A"}
                      </span>
                    </DetailField>
                  </>
                )}
              </>
            ) : (
              <>
                <DetailField label="Customer name">{invoice.customers?.name || "N/A"}</DetailField>
                {invoice.code ? (
                  <DetailField label="Project / training code">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs font-semibold">
                        {invoice.code}
                      </Badge>
                      {codes.find((c) => c.code === invoice.code)?.name ? (
                        <span className="text-sm font-normal text-muted-foreground">
                          {codes.find((c) => c.code === invoice.code)?.name}
                        </span>
                      ) : null}
                    </div>
                  </DetailField>
                ) : null}
                <DetailField label="Email">
                  <span className="font-normal text-muted-foreground">{invoice.customers?.email || "N/A"}</span>
                </DetailField>
                <DetailField label="Billing address">
                  <span className="whitespace-pre-wrap font-normal text-muted-foreground">
                    {invoice.customers?.billing_address || "N/A"}
                  </span>
                </DetailField>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base">Invoice details</CardTitle>
            <CardDescription>Dates, terms, and billing context</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Issue date</p>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editForm.issue_date}
                    onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium">{issueLabel}</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Due date</p>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                ) : (
                  <p className="text-sm font-medium">{dueLabel}</p>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
                  <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className={cn("space-y-2", !isEditing && "sm:col-span-2")}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Terms</p>
                {isEditing ? (
                  <Input
                    value={editForm.terms}
                    onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                    placeholder="Due on receipt"
                  />
                ) : (
                  <p className="text-sm font-medium">{invoice.terms || "Due on receipt"}</p>
                )}
              </div>
            </div>
            <Separator className="bg-border/60" />
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Location</p>
              {isEditing ? (
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="Business location"
                />
              ) : (
                <p className="text-sm font-medium text-muted-foreground">{invoice.location || "N/A"}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Memo</p>
              {isEditing ? (
                <Textarea
                  value={editForm.memo}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  placeholder="Memo for customer"
                  rows={3}
                  className="min-h-18 resize-y"
                />
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">{invoice.memo || "N/A"}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4 space-y-0">
          <div>
            <CardTitle className="text-base">Line items</CardTitle>
            <CardDescription>{items.length} {items.length === 1 ? "item" : "items"} on this invoice</CardDescription>
          </div>
          {isEditing && (
            <Button onClick={handleAddItem} size="sm" variant="outline" className="shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <div className="overflow-x-auto rounded-lg border border-border/80">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[220px] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Description
                  </TableHead>
                  <TableHead className="w-[88px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Qty
                  </TableHead>
                  <TableHead className="w-[120px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit price
                  </TableHead>
                  <TableHead className="w-[100px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tax %
                  </TableHead>
                  <TableHead className="w-[112px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tax
                  </TableHead>
                  <TableHead className="w-[120px] text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Line total
                  </TableHead>
                  {isEditing && (
                    <TableHead className="w-[72px] text-center">
                      <span className="sr-only">Remove</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <TableRow key={item.id} className="border-border/60">
                      <TableCell className="align-top">
                        {isEditing ? (
                          <Textarea
                            value={item.description || ""}
                            onChange={(e) => handleItemChange(index, "description", e.target.value)}
                            placeholder="Item description"
                            rows={2}
                            className="min-w-[200px] resize-y"
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{item.description || "—"}</div>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right tabular-nums text-sm">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="text-right tabular-nums"
                          />
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right tabular-nums text-sm">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="text-right tabular-nums"
                          />
                        ) : (
                          `₱${(item.unit_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right tabular-nums text-sm">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={(item.tax_rate ?? 0) === 0 ? "" : item.tax_rate}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "tax_rate",
                                e.target.value === "" ? 0 : parseFloat(e.target.value)
                              )
                            }
                            min="0"
                            step="0.01"
                            className="text-right tabular-nums"
                          />
                        ) : (
                          `${item.tax_rate || 0}%`
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right tabular-nums text-sm text-muted-foreground">
                        ₱{(item.tax_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="align-top text-right text-sm font-semibold tabular-nums">
                        ₱{(item.line_total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
                      {isEditing && (
                        <TableCell className="align-top text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Remove line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={isEditing ? 7 : 6}
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      {isEditing ? "Add at least one line item to this invoice." : "No line items yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base">Summary</CardTitle>
          <CardDescription>Amounts in Philippine peso (₱)</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-end">
            <div className="w-full max-w-md space-y-0 rounded-xl border border-border/80 bg-muted/20 p-1 lg:ml-auto">
              <div className="space-y-3 rounded-lg bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-6 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums font-medium">
                    ₱{totals.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6 text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="tabular-nums font-medium">
                    ₱{totals.taxTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Separator className="bg-border/80" />
                <div className="flex items-center justify-between gap-6 text-base font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums tracking-tight">
                    ₱{totals.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3 dark:bg-amber-500/10">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-sm font-semibold text-amber-950 dark:text-amber-100">Balance due</span>
                    <span className="text-lg font-bold tabular-nums tracking-tight text-amber-950 dark:text-amber-50">
                      ₱
                      {(isEditing ? totals.total : invoice.balance_due || 0).toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/60 pb-4">
          <CardTitle className="text-base">Internal notes</CardTitle>
          <CardDescription>Not shown on the customer PDF</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isEditing ? (
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Add notes for your team..."
              rows={4}
              className="min-h-24 resize-y"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {invoice.notes || "No notes added."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Customer attachments */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-4 space-y-0">
          <div>
            <CardTitle className="text-base">Customer attachments</CardTitle>
            <CardDescription>
              {attachments.length} {attachments.length === 1 ? "file" : "files"} linked to this customer
            </CardDescription>
          </div>
          <Button
            onClick={handleAddAttachment}
            size="sm"
            variant="outline"
            className="shadow-sm"
            disabled={uploadingAttachment || !invoice?.customer_id}
          >
            {uploadingAttachment ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add attachment
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {attachments.length > 0 ? (
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card p-4 shadow-sm transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded {new Date(attachment.uploaded_at).toLocaleDateString()}
                        {attachment.file_size && ` · ${(attachment.file_size / 1024).toFixed(2)} KB`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(attachment.file_url, "_blank")}
                      title="View file"
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = attachment.file_url
                        link.download = attachment.filename
                        link.click()
                      }}
                      title="Download file"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReplaceAttachment(attachment.id, attachment.file_url)}
                      disabled={replacingAttachmentId === attachment.id}
                      title="Replace file"
                    >
                      {replacingAttachmentId === attachment.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAttachment(attachment.id, attachment.file_url)}
                      disabled={deletingAttachmentId === attachment.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete file"
                    >
                      {deletingAttachmentId === attachment.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 py-12 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">No attachments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Use Add attachment to upload a file for this customer.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}