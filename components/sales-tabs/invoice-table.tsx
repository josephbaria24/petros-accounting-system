"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Database } from "@/lib/supabase-types"
import { ChevronDown, AlertCircle, Settings, ChevronUp, Plus } from "lucide-react"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"
import ReceivePaymentDialog from "../invoice/receive-payment-dialog"
import SendReminderDialog from "../invoice/send-reminder-dialog"
import BatchSendReminderDialog from "../invoice/batch-send-reminder-dialog"

type Invoice = Database["public"]["Tables"]["invoices"]["Row"] & {
  customers?: { name: string; email?: string | null } | null
}

type SelectedInvoiceForPayment = {
  id: string
  invoice_no: string
  customer_id: string
  customer_name: string
  customer_email?: string | null
  due_date?: string | null
  total_amount: number
  balance_due: number
}

type SelectedInvoiceForReminder = {
  id: string
  invoice_no: string
  customer_name: string
  customer_email?: string | null
  total_amount: number
  balance_due: number
  due_date?: string | null
  issue_date?: string | null
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
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)
  const [batchReminderDialogOpen, setBatchReminderDialogOpen] = useState(false)
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<SelectedInvoiceForPayment | null>(null)
  const [selectedInvoiceForReminder, setSelectedInvoiceForReminder] = useState<SelectedInvoiceForReminder | null>(null)

  const router = useRouter()

  const calculateStats = () => {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const unpaidInvoices = data.filter(inv => {
      const issueDate = new Date(inv.issue_date || "")
      return (inv.status === "overdue" || inv.status === "sent") && issueDate >= yearAgo
    })
    const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount || 0), 0)

    const overdueAmount = data
      .filter(inv => inv.status === "overdue")
      .reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount || 0), 0)

    const notDueYetAmount = data
      .filter(inv => inv.status === "sent")
      .reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount || 0), 0)

    const paidInvoices = data.filter(inv => {
      const issueDate = new Date(inv.issue_date || "")
      return (inv.status === "paid" || inv.status === "partial") && issueDate >= thirtyDaysAgo
    })
    
    const paidAmount = paidInvoices.reduce((sum, inv) => {
      if (inv.status === "paid") {
        return sum + (inv.total_amount || 0)
      } else if (inv.status === "partial") {
        return sum + ((inv.total_amount || 0) - (inv.balance_due || 0))
      }
      return sum
    }, 0)

    const notDepositedAmount = 0
    const depositedAmount = paidAmount - notDepositedAmount

    return {
      unpaid: unpaidAmount,
      paid: paidAmount,
      overdue: overdueAmount,
      notDueYet: notDueYetAmount,
      notDeposited: notDepositedAmount,
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
    const balanceDue = invoice.balance_due ?? invoice.total_amount ?? 0
    const totalAmount = invoice.total_amount || 0
    
    // Only consider it paid if status is explicitly "paid" AND balance is zero/near-zero
    if (status === "paid" && balanceDue <= 0.01) {
      return { text: "Paid", subtext: "" }
    } else if (status === "partial" || (balanceDue > 0 && balanceDue < totalAmount)) {
      return { text: "Partially paid", subtext: "" }
    } else if (status === "overdue" && dueDate) {
      const due = new Date(dueDate)
      const today = new Date()
      const daysDiff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
      return { text: `Overdue ${daysDiff} days`, subtext: "Sent" }
    } else if (status === "sent" && dueDate) {
      const due = new Date(dueDate)
      const today = new Date()
      
      // Check if it's actually overdue
      if (today > due) {
        const daysDiff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        return { text: `Overdue ${daysDiff} days`, subtext: "Sent" }
      }
      
      return { 
        text: `Due on ${due.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}`, 
        subtext: "Sent" 
      }
    } else if (status === "draft") {
      return { text: "Draft", subtext: "" }
    } else {
      return { text: "Sent", subtext: "" }
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
            name,
            email
          )
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      
      console.log("Loaded invoices:", invoices)
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

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="border rounded-lg p-6 bg-card">
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
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-semibold">
                    ₱{stats.unpaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    <span className="text-base font-normal text-red-600 dark:text-red-400 ml-2">Unpaid</span>
                  </div>
                  <div className="text-sm text-gray-500">Last 365 days</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    ₱{stats.overdue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    ₱{stats.notDueYet.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 dark:text-gray-300">Overdue</span>
                  <span className="text-gray-700 dark:text-gray-300">Not due yet</span>
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

            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl font-semibold">
                    ₱{stats.paid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
                    <span className="text-base font-normal text-green-600 ml-2">Paid</span>
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
              <DropdownMenuItem
                onClick={() => {
                  if (selectedRows.size === 0) {
                    alert("Please select at least one invoice");
                    return;
                  }
                  setBatchReminderDialogOpen(true);
                }}
              >
                Send reminders ({selectedRows.size})
              </DropdownMenuItem>
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
          onClick={() => router.push("/sales/invoices/create")}
        >
          <Plus className="h-4 w-4" />
          Create invoice
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-card border-b">
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
                const balanceDue = invoice.balance_due || 0
                
                return (
                  <tr key={invoice.id} className="border-b hover:bg-secondary">
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
                        {invoice.status === "paid" && balanceDue <= 0.01 ? (
                          <svg className="h-4 w-4 text-green-600 flex-shrink-0" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : invoice.status === "partial" ? (
                          <svg className="h-4 w-4 text-blue-600 flex-shrink-0" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                        )}
                        <div>
                          <div className="text-sm">{statusDisplay.text}</div>
                          {statusDisplay.subtext && <div className="text-xs text-gray-500">{statusDisplay.subtext}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Button 
                          variant="link" 
                          className="text-blue-600 p-0 h-auto cursor-pointer"
                          onClick={() => router.push(`/invoices/${invoice.id}`)}
                        >
                          View/Edit
                        </Button>
                        <span className="text-gray-300">|</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="link" 
                              className="text-blue-600 p-0 h-auto cursor-pointer"
                            >
                              Receive payment
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedInvoiceForPayment({
                                  id: invoice.id,
                                  invoice_no: invoice.invoice_no,
                                  customer_id: invoice.customer_id || "",
                                  customer_name: invoice.customers?.name || "N/A",
                                  customer_email: invoice.customers?.email || null,
                                  due_date: invoice.due_date || null,
                                  total_amount: invoice.total_amount || 0,
                                  balance_due: invoice.balance_due || invoice.total_amount || 0
                                })
                                setPaymentDialogOpen(true)
                              }}
                            >
                              Record payment
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedInvoiceForReminder({
                                  id: invoice.id,
                                  invoice_no: invoice.invoice_no,
                                  customer_name: invoice.customers?.name || "N/A",
                                  customer_email: invoice.customers?.email || null,
                                  total_amount: invoice.total_amount || 0,
                                  balance_due: invoice.balance_due || invoice.total_amount || 0,
                                  due_date: invoice.due_date || null,
                                  issue_date: invoice.issue_date || null
                                })
                                setReminderDialogOpen(true)
                              }}
                            >
                              Send reminder
                            </DropdownMenuItem>
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

        {/* Dialogs */}
        {selectedInvoiceForPayment && (
          <ReceivePaymentDialog
            open={paymentDialogOpen}
            onOpenChange={setPaymentDialogOpen}
            invoice={selectedInvoiceForPayment}
            onPaymentRecorded={() => {
              setPaymentDialogOpen(false);
              setSelectedInvoiceForPayment(null);
              loadInvoices();
            }}
          />
        )}

        {selectedInvoiceForReminder && (
          <SendReminderDialog
            open={reminderDialogOpen}
            onOpenChange={setReminderDialogOpen}
            invoice={selectedInvoiceForReminder}
          />
        )}

        {selectedRows.size > 0 && (
          <BatchSendReminderDialog
            open={batchReminderDialogOpen}
            onOpenChange={setBatchReminderDialogOpen}
            invoices={data
              .filter((inv) => selectedRows.has(inv.id))
              .map((inv) => ({
                id: inv.id,
                invoice_no: inv.invoice_no,
                customer_name: inv.customers?.name || "N/A",
                customer_email: inv.customers?.email || null,
                total_amount: inv.total_amount || 0,
                balance_due: inv.balance_due || inv.total_amount || 0,
                due_date: inv.due_date || null,
                issue_date: inv.issue_date || null,
              }))}
            onRemindersSent={() => {
              loadInvoices();
              setSelectedRows(new Set());
            }}
          />
        )}

        {/* Pagination */}
        <div className="flex items-center justify-end gap-4 p-4 border-t bg-card">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Button variant="ghost" size="sm" disabled>First</Button>
            <Button variant="ghost" size="sm" disabled>Previous</Button>
            <span>1-{data.length} of {data.length}</span>
            <Button variant="ghost" size="sm" disabled>Next</Button>
            <Button variant="ghost" size="sm" disabled>Last</Button>
          </div>
        </div>
      </div>
    </div>
  )
}