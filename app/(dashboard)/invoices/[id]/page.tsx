//app\invoices\[id]\page.tsx
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
      alert("Attachment deleted successfully!")
    } catch (error) {
      console.error("Error deleting attachment:", error)
      alert("Failed to delete attachment. Please try again.")
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
          alert("Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed")
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

        alert("Attachment replaced successfully!")
      } catch (error) {
        console.error("Error replacing attachment:", error)
        alert("Failed to replace attachment. Please try again.")
      } finally {
        setReplacingAttachmentId(null)
      }
    }

    input.click()
  }

  

  const handleAddAttachment = async () => {
    if (!invoice?.customer_id) {
      alert("No customer selected for this invoice")
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
        alert("Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed")
        return
      }

      // Validate file size (e.g., max 10MB)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        alert("File size must be less than 10MB")
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
        alert("Attachment added successfully!")
      } catch (error) {
        console.error("Error adding attachment:", error)
        alert("Failed to add attachment. Please try again.")
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
      alert("Invoice saved successfully!")
    } catch (error: any) {
      console.error("Error saving invoice:", error?.message || error)
      alert("Error saving invoice. Please try again.")
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
    return <div className="p-6">Loading invoice...</div>
  }

  if (!invoice) {
    return <div className="p-6">Invoice not found</div>
  }

  const totals = calculateTotals()
  const selectedCustomer = getSelectedCustomer()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">
            Invoice {isEditing ? (
              <Input 
                value={editForm.invoice_no}
                onChange={(e) => setEditForm({ ...editForm, invoice_no: e.target.value })}
                className="inline-block w-40 h-8"
              />
            ) : invoice.invoice_no}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false)
                // Reload data to discard changes
                window.location.reload()
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Details */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <>
                <div>
                  <label className="text-sm font-medium">Customer</label>
                  <Select 
                    value={editForm.customer_id} 
                    onValueChange={(value) => setEditForm({ ...editForm, customer_id: value })}
                  >
                    <SelectTrigger>
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

                {/* ADD THIS CODE SELECTOR */}
                    <div>
                      <label className="text-sm font-medium">Project/Training Code</label>
                    <Select
                value={editForm.code || NO_CODE_VALUE}
                onValueChange={(value) => setEditForm({ ...editForm, code: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select code (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CODE_VALUE}>No code</SelectItem>
                  {codes.map((code) => (
                    <SelectItem key={code.id} value={code.code}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{code.code}</span>
                        <span className="text-xs text-muted-foreground">{code.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

                    </div>


                
                {selectedCustomer && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-gray-600">{selectedCustomer.email || "N/A"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Billing Address</label>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {selectedCustomer.billing_address || "N/A"}
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Customer</label>
                  <p className="text-lg">{invoice.customers?.name || "N/A"}</p>
                </div>

                {/* ADD THIS CODE DISPLAY */}
                {invoice.code && (
                  <div>
                    <label className="text-sm font-medium">Project/Training Code</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-3 py-1 rounded-md bg-blue-100 text-blue-800 font-medium">
                        {invoice.code}
                      </span>
                      <span className="text-sm text-gray-600">
                        {codes.find(c => c.code === invoice.code)?.name || ''}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p>{invoice.customers?.email || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Billing Address</label>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {invoice.customers?.billing_address || "N/A"}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Issue Date</label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editForm.issue_date}
                    onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
                  />
                ) : (
                  <p>{invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : "N/A"}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Due Date</label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                ) : (
                  <p>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "N/A"}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                {isEditing ? (
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
                ) : (
                  <p className="capitalize">{invoice.status}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Terms</label>
                {isEditing ? (
                  <Input
                    value={editForm.terms}
                    onChange={(e) => setEditForm({ ...editForm, terms: e.target.value })}
                    placeholder="Due on receipt"
                  />
                ) : (
                  <p>{invoice.terms || "Due on receipt"}</p>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Location</label>
              {isEditing ? (
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  placeholder="Business location"
                />
              ) : (
                <p>{invoice.location || "N/A"}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Memo</label>
              {isEditing ? (
                <Textarea
                  value={editForm.memo}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  placeholder="Memo for customer"
                  rows={2}
                />
              ) : (
                <p className="text-sm text-gray-600">{invoice.memo || "N/A"}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Line Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Invoice Items ({items.length})</CardTitle>
          {isEditing && (
            <Button onClick={handleAddItem} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[300px]">Description</TableHead>
                  <TableHead className="w-[100px]">Quantity</TableHead>
                  <TableHead className="w-[120px]">Unit Price</TableHead>
                  <TableHead className="w-[100px]">Tax Rate (%)</TableHead>
                  <TableHead className="w-[120px]">Tax Amount</TableHead>
                  <TableHead className="w-[120px]">Line Total</TableHead>
                  {isEditing && <TableHead className="w-[80px]">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {isEditing ? (
                          <Textarea
                            value={item.description || ""}
                            onChange={(e) => handleItemChange(index, "description", e.target.value)}
                            placeholder="Item description"
                            rows={2}
                            className="min-w-[250px]"
                          />
                        ) : (
                          <div className="whitespace-pre-wrap">{item.description || "-"}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          item.quantity
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, "unit_price", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `₱${(item.unit_price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={item.tax_rate || 0}
                            onChange={(e) => handleItemChange(index, "tax_rate", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `${item.tax_rate || 0}%`
                        )}
                      </TableCell>
                      <TableCell>
                        ₱{(item.tax_amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        ₱{(item.line_total || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
                      {isEditing && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isEditing ? 7 : 6} className="text-center text-gray-500 py-8">
                      {isEditing ? "Click 'Add Item' to add invoice items" : "No items added yet"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-lg">
            <span>Subtotal:</span>
            <span>₱{totals.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-lg">
            <span>Tax:</span>
            <span>₱{totals.taxTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-xl font-semibold border-t pt-2">
            <span>Total:</span>
            <span>₱{totals.total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-lg text-orange-600">
            <span>Balance Due:</span>
            <span>₱{(isEditing ? totals.total : invoice.balance_due || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Add notes..."
              rows={4}
            />
          ) : (
            <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes || "No notes"}</p>
          )}
        </CardContent>
      </Card>
    {/* Customer Attachments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Customer Attachments ({attachments.length})</CardTitle>
          <Button 
            onClick={handleAddAttachment} 
            size="sm" 
            variant="outline"
            disabled={uploadingAttachment || !invoice?.customer_id}
          >
            {uploadingAttachment ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add Attachment
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {attachments.length > 0 ? (
            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-secondary"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{attachment.filename}</p>
                      <p className="text-sm text-gray-500">
                        Uploaded {new Date(attachment.uploaded_at).toLocaleDateString()}
                        {attachment.file_size && 
                          ` • ${(attachment.file_size / 1024).toFixed(2)} KB`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
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
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No attachments yet</p>
              <p className="text-sm">Click "Add Attachment" to upload files</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}