"use client";

import { useState, useEffect, useRef } from "react";
import { X, Settings, ArrowBigDownDash, MessageCircle } from "lucide-react";
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
          alert(`File ${file.name} exceeds 20MB limit`);
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
      alert("Error uploading attachment. Please try again.");
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
    alert("Please select a payment method");
    return;
  }

  const amount = parseFloat(amountReceived);
  if (isNaN(amount) || amount <= 0) {
    alert("Please enter a valid payment amount");
    return;
  }

  if (amount > invoice.balance_due) {
    alert("Payment amount cannot exceed the balance due");
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

    alert("Payment recorded successfully!");

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
    alert("Error recording payment. Please try again.");
  } finally {
    setSaving(false);
  }
};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="border-b p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
              <span className="">
                <ArrowBigDownDash />
              </span>
              Receive Payment
            </DialogTitle>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-gray-600">
                <MessageCircle /> Feedback
              </Button>
              <Button variant="ghost" size="sm">
                <X className="h-5 w-5" onClick={() => onOpenChange(false)} />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* Amount Received Section */}
          <div className="flex justify-end mb-6">
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">AMOUNT RECEIVED</div>
              <div className="text-4xl font-bold">
                PHP
                {parseFloat(amountReceived || "0").toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-sm text-gray-600 mt-1">Customer balance</div>
              <div className="text-sm font-semibold">
                PHP
                {invoice.balance_due.toLocaleString("en-PH", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <Label className="text-sm font-medium mb-2">Customer</Label>
              <div className="px-3 py-2 border rounded-md">
                {invoice.customer_name}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2">Email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={invoice.customer_email || ""}
                  readOnly
                  className="bg-gray-50"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  Find by invoice no.
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2">Cc/Bcc</Label>
              <div className="flex items-start gap-2">
                <Input placeholder="" />
                <Checkbox
                  checked={sendLater}
                  onCheckedChange={(checked) =>
                    setSendLater(checked as boolean)
                  }
                  className="mt-2"
                />
                <span className="text-sm mt-1.5">Send later</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <Label className="text-sm font-medium mb-2">Payment Date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2">Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose payment method" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem
                      key={method}
                      value={method.toLowerCase().replace(/\s+/g, "-")}
                    >
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium mb-2">Reference no.</Label>
              <Input
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder=""
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2">Deposit To</Label>
              <Select value={depositTo} onValueChange={setDepositTo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {depositOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Outstanding Transactions */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-card p-4 border-b">
              <h3 className="font-semibold text-lg">
                Outstanding Transactions
              </h3>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <Input placeholder="Find Invoice No." className="max-w-xs" />
                <Button variant="outline" size="sm">
                  Filter →
                </Button>
                <Button variant="link" size="sm" className="text-blue-600">
                  All
                </Button>
                <div className="ml-auto">
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-card border-b">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">
                        <Checkbox
                          checked={selectedInvoices.has(invoice.id)}
                          onCheckedChange={() => {}}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        DESCRIPTION
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        DUE DATE
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        ORIGINAL AMOUNT
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        OPEN BALANCE
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        PAYMENT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">
                        <Checkbox checked />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-blue-600 font-medium">
                          Invoice # {invoice.invoice_no}
                        </div>
                        <div className="text-sm text-gray-500">
                          (
                          {new Date(invoice.due_date || "").toLocaleDateString(
                            "en-US",
                            {
                              month: "2-digit",
                              day: "2-digit",
                              year: "numeric",
                            },
                          )}
                          )
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {new Date(invoice.due_date || "").toLocaleDateString(
                          "en-US",
                          {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        PHP
                        {invoice.total_amount.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        PHP
                        {invoice.balance_due.toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          className="w-32 ml-auto text-right"
                          step="0.01"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="flex items-center justify-between p-3 border-t bg-card">
                  <div className="text-sm text-gray-600">1-1 of 1</div>
                  <Button variant="ghost" size="sm" disabled>
                    1
                  </Button>
                </div>
              </div>

              {/* Amount to Apply */}
              <div className="flex justify-end mt-4">
                <div className="text-right">
                  <span className="text-sm text-gray-600 mr-4">
                    Amount to Apply
                  </span>
                  <span className="text-lg font-semibold">
                    PHP
                    {parseFloat(amountReceived || "0").toLocaleString("en-PH", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Amount to Credit */}
              <div className="flex justify-end mt-2">
                <div className="text-right">
                  <span className="text-sm text-gray-600 mr-4">
                    Amount to Credit
                  </span>
                  <span className="text-lg font-semibold">
                    PHP0.00
                  </span>
                </div>
              </div>

              {/* Clear Payment Button */}
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  className="border-green-600 text-green-600 hover:bg-green-50"
                  onClick={() => setAmountReceived("")}
                >
                  Clear Payment
                </Button>
              </div>
            </div>
          </div>

          {/* Memo Section */}
          <div className="mt-6">
            <Label className="text-sm font-medium mb-2">Memo</Label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Note"
              className="w-full min-h-[100px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Attachments Section */}
          <div className="mt-6 border rounded-lg p-4">
            <Label className="text-sm font-medium mb-3 block">Attachments</Label>
            
            {attachments.length > 0 && (
              <div className="mb-4 space-y-2">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{attachment.filename}</span>
                      <span className="text-xs text-gray-500">
                        ({(attachment.file_size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                multiple
              />
              <Button
                variant="link"
                className="text-blue-600"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAttachment}
              >
                {uploadingAttachment ? "Uploading..." : "Add attachment"}
              </Button>
              <div className="text-xs text-gray-500 mt-1">
                Max file size: 20 MB
              </div>
            </div>

            {attachments.length > 0 && (
              <div className="mt-3 text-center">
                <Button
                  variant="link"
                  className="text-blue-600 text-sm"
                  onClick={() => setShowExistingAttachments(!showExistingAttachments)}
                >
                  {showExistingAttachments ? "Hide existing" : "Show existing"}
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 text-center">
            <Button variant="link" className="text-blue-600 text-sm">
              Privacy
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-card flex items-center justify-between">
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="outline">Print</Button>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50"
              onClick={() => handleSavePayment(false)}
              disabled={saving}
            >
              Save
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleSavePayment(true)}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save and close"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}