"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Database } from "@/lib/supabase-types"
import { ChevronDown, AlertCircle, Settings, ChevronUp, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Invoice = Database["public"]["Tables"]["invoices"]["Row"] & {
  customers?: { name: string } | null
}

type Customer = Database["public"]["Tables"]["customers"]["Row"]

export default function InvoicesTable() {
  const supabase = createClient()
  const [data, setData] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("last-12-months")
  const [showStats, setShowStats] = useState(true)
  const [loading, setLoading] = useState(true)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    customer_id: "",
    issue_date: new Date().toISOString().split('T')[0],
    due_date: "",
    status: "draft" as const,
    subtotal: 0,
    tax_total: 0,
    notes: ""
  })

  const [items, setItems] = useState([
    { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }
  ])

  const calculateStats = () => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const unpaidAmount = data
      .filter(inv => {
        const createdAt = new Date(inv.created_at || "")
        return (inv.status === "overdue" || inv.status === "sent") && createdAt >= yearAgo
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    const paidAmount = data
      .filter(inv => {
        const createdAt = new Date(inv.created_at || "")
        return inv.status === "paid" && createdAt >= thirtyDaysAgo
      })
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    const overdueAmount = data
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount || 0), 0)

    const notDueYetAmount = data
      .filter(inv => inv.status === "sent")
      .reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount || 0), 0)

    const depositedAmount = data
      .filter(inv => inv.status === "paid")
      .reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

    return {
      unpaid: unpaidAmount,
      paid: paidAmount,
      overdue: overdueAmount,
      notDueYet: notDueYetAmount,
      notDeposited: 0,
      deposited: depositedAmount
    }
  }

  const stats = calculateStats()
  const overduePercentage = stats.unpaid > 0 ? (stats.overdue / stats.unpaid) * 100 : 0
  const depositedPercentage = stats.paid > 0 ? (stats.deposited / stats.paid) * 100 : 100

  const toggleSelectAll = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(data.map(inv => inv.id)))
    }
  }

  const toggleSelectRow = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const getStatusDisplay = (invoice: Invoice) => {
    const status = invoice.status
    const dueDate = invoice.due_date
    
    if (status === "overdue" && dueDate) {
      const due = new Date(dueDate)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      return { text: `Overdue ${daysDiff} days`, subtext: "Sent" }
    } else if (status === "sent" && dueDate) {
      const due = new Date(dueDate)
      return { 
        text: `Overdue on ${due.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}`, 
        subtext: "Sent" 
      }
    } else if (status === "paid") {
      return { text: "Paid", subtext: "" }
    } else if (status === "partial") {
      return { text: "Partially paid", subtext: "" }
    } else {
      return { text: "Draft", subtext: "" }
    }
  }

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const calculateTotals = () => {
    let subtotal = 0
    let taxTotal = 0

    items.forEach(item => {
      const lineTotal = item.quantity * item.unit_price
      const taxAmount = lineTotal * (item.tax_rate / 100)
      subtotal += lineTotal
      taxTotal += taxAmount
    })

    return { subtotal, taxTotal, total: subtotal + taxTotal }
  }

  const generateInvoiceNo = () => {
    const year = new Date().getFullYear()
    const random = Math.floor(10000 + Math.random() * 90000)
    return `INV-${year}-${random}`
  }

  const handleCreateInvoice = async () => {
    if (!formData.customer_id) {
      alert("Please select a customer")
      return
    }

    if (items.length === 0 || items.every(item => !item.description)) {
      alert("Please add at least one item")
      return
    }

    setCreating(true)

    try {
      const { subtotal, taxTotal, total } = calculateTotals()
      const invoiceNo = generateInvoiceNo()

      // Insert invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_no: invoiceNo,
          customer_id: formData.customer_id,
          issue_date: formData.issue_date,
          due_date: formData.due_date || null,
          status: formData.status,
          subtotal,
          tax_total: taxTotal,
          total_amount: total,
          balance_due: total,
          notes: formData.notes || null
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // Insert invoice items
      const itemsToInsert = items
        .filter(item => item.description.trim())
        .map(item => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          line_total: item.quantity * item.unit_price,
          tax_amount: (item.quantity * item.unit_price) * (item.tax_rate / 100)
        }))

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from("invoice_items")
          .insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      // Reload invoices
      await loadInvoices()

      // Reset form
      setShowCreateDialog(false)
      setFormData({
        customer_id: "",
        issue_date: new Date().toISOString().split('T')[0],
        due_date: "",
        status: "draft",
        subtotal: 0,
        tax_total: 0,
        notes: ""
      })
      setItems([{ description: "", quantity: 1, unit_price: 0, tax_rate: 0 }])

      alert("Invoice created successfully!")
    } catch (error) {
      console.error("Error creating invoice:", error)
      alert("Error creating invoice. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select(`
          *,
          customers (
            name
          )
        `)
        .order("issue_date", { ascending: false })

      if (error) throw error
      setData(invoices || [])
    } catch (error) {
      console.error("Error loading invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function loadData() {
      await loadInvoices()

      // Load customers for dropdown
      const { data: customersData } = await supabase
        .from("customers")
        .select("*")
        .order("name")

      setCustomers(customersData || [])
    }
    
    loadData()
  }, [])

  if (loading) {
    return <div className="p-6">Loading invoices...</div>
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="border rounded-lg p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Invoices</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            {showStats ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>

        {showStats && (
          <div className="grid grid-cols-2 gap-8">
            {/* Unpaid Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-semibold">
                    ₱{stats.unpaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    <span className="text-base font-normal text-gray-600 ml-2">Unpaid</span>
                  </div>
                  <div className="text-sm text-gray-500">Last 365 days</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    ₱{stats.overdue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-gray-600">
                    ₱{stats.notDueYet.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Overdue</span>
                  <span className="text-gray-700">Not due yet</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="flex h-full">
                    <div 
                      className="bg-orange-500" 
                      style={{ width: `${overduePercentage}%` }}
                    />
                    <div 
                      className="bg-gray-300" 
                      style={{ width: `${100 - overduePercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Paid Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-semibold">
                    ₱{stats.paid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    <span className="text-base font-normal text-gray-600 ml-2">Paid</span>
                  </div>
                  <div className="text-sm text-gray-500">Last 30 days</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    ₱{stats.notDeposited.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-gray-600">
                    ₱{stats.deposited.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Not deposited</span>
                  <span className="text-gray-700">Deposited</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-600 h-full" 
                    style={{ width: `${depositedPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Batch actions
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Send reminders</DropdownMenuItem>
              <DropdownMenuItem>Export selected</DropdownMenuItem>
              <DropdownMenuItem>Delete selected</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-12-months">Last 12 months</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
              <SelectItem value="this-year">This year</SelectItem>
              <SelectItem value="all-time">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          className="bg-green-600 hover:bg-green-700 gap-2"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4" />
          Create invoice
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <Checkbox
                  checked={selectedRows.size === data.length && data.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">No.</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                <div className="flex items-center gap-1">
                  Status
                  <ChevronDown className="h-4 w-4" />
                </div>
              </th>
              <th className="px-4 py-3 text-left">
                <Settings className="h-4 w-4 text-gray-400" />
              </th>
            </tr>
          </thead>

          <tbody>
            {data.length > 0 ? (
              data.map((invoice) => {
                const statusDisplay = getStatusDisplay(invoice)
                const issueDate = new Date(invoice.issue_date || "")
                
                return (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedRows.has(invoice.id)}
                        onCheckedChange={() => toggleSelectRow(invoice.id)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {issueDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-sm">{invoice.invoice_no}</td>
                    <td className="px-4 py-3 text-sm">{invoice.customers?.name || "N/A"}</td>
                    <td className="px-4 py-3 text-sm">
                      ₱{(invoice.total_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {invoice.status !== "paid" && <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />}
                        <div>
                          <div className="text-sm">{statusDisplay.text}</div>
                          {statusDisplay.subtext && <div className="text-xs text-gray-500">{statusDisplay.subtext}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Button variant="link" className="text-blue-600 p-0 h-auto">View/Edit</Button>
                        <span className="text-gray-300">|</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="link" className="text-blue-600 p-0 h-auto flex items-center gap-1">
                              Receive payment
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>Record payment</DropdownMenuItem>
                            <DropdownMenuItem>Send reminder</DropdownMenuItem>
                            <DropdownMenuItem>Void invoice</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-end gap-4 p-4 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Button variant="ghost" size="sm" disabled>First</Button>
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <span>1-{data.length} of {data.length}</span>
            <Button variant="ghost" size="sm" disabled>Next</Button>
            <Button variant="ghost" size="sm" disabled>Last</Button>
          </div>
        </div>
      </div>

      {/* Create Invoice Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Invoice</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new invoice
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select 
                  value={formData.customer_id} 
                  onValueChange={(value) => setFormData({...formData, customer_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: any) => setFormData({...formData, status: value})}
                >
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

              <div className="space-y-2">
                <Label htmlFor="issue_date">Issue Date</Label>
                <Input
                  id="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              <Label>Invoice Items</Label>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold">Description</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold w-24">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold w-32">Unit Price</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold w-24">Tax %</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold w-32">Total</th>
                      <th className="px-3 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="px-3 py-2">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            placeholder="Item description"
                            className="h-9"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                            min="1"
                            className="h-9"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="h-9"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.tax_rate}
                            onChange={(e) => updateItem(index, "tax_rate", parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            step="0.1"
                            className="h-9"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm">
                          ₱{((item.quantity * item.unit_price) * (1 + item.tax_rate / 100)).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          {items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" onClick={addItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₱{totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>₱{totals.taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>₱{totals.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Add any additional notes or terms..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateInvoice} 
              disabled={creating}
              className="bg-green-600 hover:bg-green-700"
            >
              {creating ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}