//components\invoice\receive-payment-dialog.tsx
"use client";
import { sileo } from "sileo";

import { useState, useEffect, useRef } from "react";
import { X, Settings, ArrowBigDownDash, MessageCircle, DollarSign, Upload, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase-client";
import { postPaymentToLedger } from "@/lib/payment-journal";

export interface SelectedInvoiceForPayment {
  id: string;
  invoice_no: string;
  customer_id: string;
  customer_name: string;
  customer_email?: string | null;
  due_date?: string | null;
  total_amount: number;
  balance_due: number;
}

interface ReceivePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: SelectedInvoiceForPayment;
  onPaymentRecorded?: () => void;
}

type Attachment = {
  filename: string;
  file_url: string;
  file_size: number;
  file_type: string;
};

export default function ReceivePaymentDialog({
  open,
  onOpenChange,
  invoice,
  onPaymentRecorded,
}: ReceivePaymentDialogProps) {
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [depositTo, setDepositTo] = useState("cash-on-hand");
  const [amountReceived, setAmountReceived] = useState(
    invoice.balance_due.toString(),
  );
  const [sendLater, setSendLater] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(
    new Set([invoice.id]),
  );
  const [saving, setSaving] = useState(false);
  const [memo, setMemo] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [showExistingAttachments, setShowExistingAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment method options
  const paymentMethods = [
    "Cash",
    "Check",
    "Credit Card",
    "Bank Transfer",
    "GCash",
    "PayMaya",
    "Online Payment",
  ];

  // Deposit to options
  const depositOptions = [
    { value: "cash-on-hand", label: "Cash on hand" },
    { value: "bank-account", label: "Bank Account" },
    { value: "petty-cash", label: "Petty Cash" },
  ];

  // Update amount when invoice changes
  useEffect(() => {
    setAmountReceived(invoice.balance_due.toString());
  }, [invoice]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingAttachment(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size (20MB limit)
        if (file.size > 20 * 1024 * 1024) {
          sileo.warning({ title: "File too large", description: `${file.name} exceeds the 20MB limit.` });
          continue;
        }

        const formData = new FormData();
        formData.append("attachment", file);

        const response = await fetch("/api/upload-customer-attachment", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          setAttachments((prev) => [
            ...prev,
            {
              filename: data.filename,
              file_url: data.url,
              file_size: file.size,
              file_type: file.type,
            },
          ]);
        } else {
          throw new Error(data.error || "Upload failed");
        }
      }
    } catch (error) {
      console.error("Error uploading attachment:", error);
      sileo.error({ title: "Upload failed", description: "Could not upload attachment. Please try again." });
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

const handleSavePayment = async (closeAfterSave: boolean = false) => {
  if (!paymentMethod) {
    sileo.warning({ title: "Missing payment method", description: "Please select a payment method." });
    return;
  }

  const amount = parseFloat(amountReceived);
  if (isNaN(amount) || amount <= 0) {
    sileo.warning({ title: "Invalid amount", description: "Please enter a valid payment amount." });
    return;
  }

  if (amount > invoice.balance_due) {
    sileo.warning({ title: "Amount too high", description: "Payment amount cannot exceed the balance due." });
    return;
  }

  setSaving(true);
  try {
    const supabase = createClient();

    // Prepare notes with memo and deposit info
    let paymentNotes = `Deposited to: ${depositTo}`;
    if (memo) {
      paymentNotes += `\n\nMemo: ${memo}`;
    }

    // Insert payment record - the trigger will automatically update the invoice
    const { data: paymentData, error: paymentError } = await supabase
      .from("payments")
      .insert({
        invoice_id: invoice.id,
        amount: amount,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_no: referenceNo || null,
        notes: paymentNotes,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Post to ledger so Chart of Accounts balances update (Cash on hand / bank).
    try {
      await postPaymentToLedger(supabase as any, {
        paymentId: paymentData.id,
        depositTo: depositTo as any,
        amount,
        entryDate: paymentDate,
        memo: memo || null,
      });
    } catch (e) {
      console.error("Payment ledger post failed:", e);
      // Keep the payment record; just inform the user that balances may not reflect it yet.
      sileo.warning({
        title: "Payment saved, ledger not updated",
        description:
          "Payment recorded but cash/bank balance did not update. Please try again or refresh later.",
      });
    }

    // Save attachments if any (link them to customer)
    if (attachments.length > 0) {
      const attachmentRecords = attachments.map((att) => ({
        customer_id: invoice.customer_id,
        filename: att.filename,
        file_url: att.file_url,
        file_size: att.file_size,
        file_type: att.file_type,
      }));

      const { error: attachmentError } = await supabase
        .from("customer_attachments")
        .insert(attachmentRecords);

      if (attachmentError) {
        console.error("Error saving attachments:", attachmentError);
        // Don't fail the whole payment if attachments fail
      }
    }

    console.log("Payment recorded successfully! Trigger updated the invoice.");

    sileo.success({ title: "Payment recorded", description: "The payment has been recorded successfully." });

    if (onPaymentRecorded) {
      onPaymentRecorded();
    }

    if (closeAfterSave) {
      onOpenChange(false);
    } else {
      // Reset form for next payment
      setPaymentMethod("");
      setReferenceNo("");
      setAmountReceived("");
      setMemo("");
      setAttachments([]);
    }
  } catch (error) {
    console.error("Error recording payment:", error);
    sileo.error({ title: "Payment failed", description: "Could not record payment. Please try again." });
  } finally {
    setSaving(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-2rem)] max-w-[1100px] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold leading-tight">Receive Payment</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {invoice.customer_name} · Invoice #{invoice.invoice_no}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amount received</span>
              <span className="text-lg font-bold text-green-700">
                ₱{parseFloat(amountReceived || "0").toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Customer Info */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</Label>
                <div className="px-3 py-2.5 border rounded-md bg-muted/30 text-sm font-medium h-10 flex items-center">
                  {invoice.customer_name}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
                <div className="flex gap-2">
                  <Input type="email" value={invoice.customer_email || ""} readOnly className="h-10 bg-muted/30" />
                  <Button variant="outline" size="sm" className="h-10 whitespace-nowrap text-xs">Find by invoice no.</Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cc/Bcc</Label>
                <div className="flex items-center gap-2">
                  <Input placeholder="" className="h-10" />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Checkbox checked={sendLater} onCheckedChange={(checked) => setSendLater(checked as boolean)} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Send later</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* Payment Details */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment date</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Payment method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Choose payment method" /></SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method.toLowerCase().replace(/\s+/g, "-")}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference no.</Label>
                <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deposit to</Label>
                <Select value={depositTo} onValueChange={setDepositTo}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {depositOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* ── Outstanding Transactions ── */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Outstanding Transactions</h3>
            </div>

            <div className="flex items-center gap-3 mb-3">
              <Input placeholder="Find Invoice No." className="h-9 max-w-[220px] text-sm" />
              <Button variant="outline" size="sm" className="h-9 text-xs">Filter</Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs text-green-700 hover:text-green-800">All</Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2.5 text-left" style={{width: 40}} />
                    <th className="px-3 py-2.5 text-left">Description</th>
                    <th className="px-3 py-2.5 text-left" style={{width: 110}}>Due date</th>
                    <th className="px-3 py-2.5 text-right" style={{width: 130}}>Original amount</th>
                    <th className="px-3 py-2.5 text-right" style={{width: 130}}>Open balance</th>
                    <th className="px-3 py-2.5 text-right" style={{width: 130}}>Payment</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5"><Checkbox checked /></td>
                    <td className="px-3 py-2.5">
                      <div className="text-green-700 font-medium text-sm">Invoice # {invoice.invoice_no}</div>
                      <div className="text-xs text-muted-foreground">
                        ({new Date(invoice.due_date || "").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })})
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-sm">
                      {new Date(invoice.due_date || "").toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm">
                      ₱{invoice.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm">
                      ₱{invoice.balance_due.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Input type="number" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} className="h-9 w-28 ml-auto text-right text-sm" step="0.01" />
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20 text-xs text-muted-foreground">
                <span>1-1 of 1</span>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mt-4">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Amount to Apply</span>
                  <span className="font-semibold">₱{parseFloat(amountReceived || "0").toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Amount to Credit</span>
                  <span className="font-semibold">PHP0.00</span>
                </div>
                <div className="pt-1.5 border-t">
                  <Button variant="ghost" size="sm" onClick={() => setAmountReceived("")} className="h-8 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2">
                    Clear Payment
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t" />

          {/* ── Memo & Attachments ── */}
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Memo</Label>
                </div>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full min-h-[100px] p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments</Label>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg border text-sm">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium">{attachment.filename}</span>
                          <span className="text-xs text-muted-foreground">({(attachment.file_size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveAttachment(index)} className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" multiple />
                <div
                  className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">{uploadingAttachment ? "Uploading..." : "Drag & drop files here"}</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse · Max 20 MB</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 shrink-0">
          <Button variant="outline" className="h-9 text-sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 text-sm">Print</Button>
            <Button className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSavePayment(false)} disabled={saving}>
              Save
            </Button>
            <Button className="h-9 text-sm bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSavePayment(true)} disabled={saving}>
              {saving ? "Saving..." : "Save and close"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
