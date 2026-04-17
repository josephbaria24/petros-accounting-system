//app\sales\invoices\create\page.tsx
"use client";
import { sileo } from "sileo";

import { useState, useEffect } from "react";
import CustomerSelector from "@/components/invoice/customer-selector";
import ManageTagsModal from "@/components/invoice/manage-tags-modal";
import ManageCodesModal from "@/components/invoice/manage-codes-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronDown, ChevronUp, Settings, ArrowLeft, FileText, RefreshCw, Trash2, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase-client";
import { generateInvoicePDF } from '@/lib/generate-invoice-pdf';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  billing_address: string | null;
  billing_street: string | null;
  billing_city: string | null;
  billing_province: string | null;
  billing_zip_code: string | null;
  billing_country: string | null;
};

type InvoiceItem = {
  serviceDate: string;
  productService: string;
  description: string;
  quantity: number;
  rate: number;
  tax: number;
  class: string;
};

/** Label for invoice line Product/service from a training / project code row. */
function productServiceLabelFromCode(
  codeValue: string,
  list: { code: string; name: string }[]
) {
  const meta = list.find((c) => c.code === codeValue);
  if (!meta) return codeValue;
  const name = meta.name?.trim();
  const code = meta.code?.trim();
  if (code && name) return `${code} — ${name}`;
  return name || code || codeValue;
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

export default function CreateInvoicePage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shipVia, setShipVia] = useState("");
  const [shippingDate, setShippingDate] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [ccBcc, setCcBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);

  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(issueDate);
  const [terms, setTerms] = useState("Due on receipt");
  const [location, setLocation] = useState("Head Office - Puerto Princesa City");
  const [invoiceAmounts, setInvoiceAmounts] = useState("Out of Scope of Tax");
  const [selectedCode, setSelectedCode] = useState("");
  const [codes, setCodes] = useState<{id: string, code: string, name: string}[]>([]);
  const [showCodeSelector, setShowCodeSelector] = useState(false);


  // Attachment states
  const [attachments, setAttachments] = useState<CustomerAttachment[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null)
  const [replacingAttachmentId, setReplacingAttachmentId] = useState<string | null>(null)

  const [items, setItems] = useState<InvoiceItem[]>([
    { serviceDate: "", productService: "", description: "", quantity: 1, rate: 0, tax: 0, class: "" },
  ]);

  const [note, setNote] = useState("Thank you for making business with us!");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [recurringSaving, setRecurringSaving] = useState(false);
  const [recurringName, setRecurringName] = useState("");
  const [recurringFrequency, setRecurringFrequency] = useState<"monthly" | "weekly">("monthly");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Settings panel state
  const [showSettings, setShowSettings] = useState(true);
  const [customisationOpen, setCustomisationOpen] = useState(true);
  const [paymentOptionsOpen, setPaymentOptionsOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);

  // Customisation toggles
  const [showShipTo, setShowShipTo] = useState(false);
  const [showServiceDate, setShowServiceDate] = useState(true);
  const [showProductService, setShowProductService] = useState(true);
  const [showSKU, setShowSKU] = useState(false);
  const [showCompanyReg, setShowCompanyReg] = useState(true);

  // Payment options toggles
  const [showDeposit, setShowDeposit] = useState(true);
  const [showDiscount, setShowDiscount] = useState(true);
  const [showShippingFee, setShowShippingFee] = useState(false);

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from("codes")
      .select("id, code, name")
      .order("code");

    if (error) {
      console.error("Error fetching codes:", error);
      return;
    }

    setCodes(data || []);
  };

  const handleCodeSelect = (codeValue: string) => {
    setSelectedCode(codeValue);
    setShowCodeSelector(false);
  };

  // When a code is chosen (or codes load after), fill Product/service on any line still blank.
  // Re-runs when line count changes so "+ Add line" rows pick up the current code.
  useEffect(() => {
    if (!selectedCode || codes.length === 0) return;
    const label = productServiceLabelFromCode(selectedCode, codes);
    setItems((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        if (row.productService?.trim()) return row;
        changed = true;
        return { ...row, productService: label };
      });
      return changed ? next : prev;
    });
  }, [selectedCode, codes, items.length]);

  useEffect(() => {
    fetchCustomers();
    if (!invoiceNo) {
      setInvoiceNo("INV-" + Date.now());
    }
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, email, billing_address, billing_street, billing_city, billing_province, billing_zip_code, billing_country")
      .order("name");

    if (error) {
      console.error("Error fetching customers:", error);
      return;
    }

    setCustomers(data || []);
  };

useEffect(() => {
    if (customerId) {
      const customer = customers.find((c) => c.id === customerId);
      if (customer) {
        setCustomerName(customer.name);
        setCustomerEmail(customer.email || "");

        const addressParts = [
          customer.billing_street,
          customer.billing_city,
          customer.billing_province,
          customer.billing_zip_code,
          customer.billing_country,
        ].filter(Boolean);

        const fullAddress = customer.name + (addressParts.length ? "\n" + addressParts.join(", ") : "");
        setBillingAddress(fullAddress);
        
        if (showShipTo) {
          setShippingAddress(fullAddress);
        }

        // Load customer attachments
        loadCustomerAttachments(customerId);
      }
    } else {
      // Clear attachments if no customer selected
      setAttachments([]);
    }
  }, [customerId, customers, showShipTo]);

  const loadCustomerAttachments = async (custId: string) => {
    try {
      const { data, error } = await supabase
        .from("customer_attachments")
        .select("*")
        .eq("customer_id", custId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error("Error loading attachments:", error);
    }
  };

  const addItem = () => {
    setItems([...items, { serviceDate: "", productService: "", description: "", quantity: 1, rate: 0, tax: 0, class: "" }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = <K extends keyof InvoiceItem>(index: number, field: K, value: InvoiceItem[K]) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value } as InvoiceItem;
    setItems(updated);
  };

  const clearAllLines = () => {
    setItems([{ serviceDate: "", productService: "", description: "", quantity: 1, rate: 0, tax: 0, class: "" }]);
  };

  const handleAddAttachment = async () => {
    if (!customerId) {
      toast({
        title: "No customer selected",
        description: "Please select a customer before uploading attachments.",
        variant: "destructive",
      });
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.multiple = false;
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "File size must be less than 10MB.",
          variant: "destructive",
        });
        return;
      }

      setUploadingAttachment(true);
      try {
        const formData = new FormData();
        formData.append("attachment", file);

        // Upload file
        const uploadResponse = await fetch("/api/upload-customer-attachment", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const uploadResult = await uploadResponse.json();

        // Save to database
        const { data, error } = await supabase
          .from("customer_attachments")
          .insert({
            customer_id: customerId,
            filename: uploadResult.filename,
            file_url: uploadResult.url,
            file_size: file.size,
            file_type: file.type
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setAttachments([data, ...attachments]);
        toast({
          title: "Attachment uploaded",
          description: "File has been uploaded successfully.",
        });
      } catch (error) {
        console.error("Error adding attachment:", error);
        toast({
          title: "Upload failed",
          description: "Failed to upload attachment. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploadingAttachment(false);
      }
    };

    input.click();
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) {
      return;
    }

    setDeletingAttachmentId(attachmentId);
    try {
      const { error } = await supabase
        .from("customer_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;

      setAttachments(attachments.filter(a => a.id !== attachmentId));
      toast({
        title: "Attachment deleted",
        description: "File has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete attachment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const handleReplaceAttachment = async (attachmentId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only image files (JPEG, PNG, GIF, WebP) and PDF files are allowed.",
          variant: "destructive",
        });
        return;
      }

      setReplacingAttachmentId(attachmentId);
      try {
        const formData = new FormData();
        formData.append("attachment", file);

        // Upload new file
        const uploadResponse = await fetch("/api/upload-customer-attachment", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        const uploadResult = await uploadResponse.json();

        // Update database
        const { error } = await supabase
          .from("customer_attachments")
          .update({
            filename: uploadResult.filename,
            file_url: uploadResult.url,
            file_size: file.size,
            file_type: file.type,
            uploaded_at: new Date().toISOString()
          })
          .eq("id", attachmentId);

        if (error) throw error;

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
        ));

        toast({
          title: "Attachment replaced",
          description: "File has been replaced successfully.",
        });
      } catch (error) {
        console.error("Error replacing attachment:", error);
        toast({
          title: "Replace failed",
          description: "Failed to replace attachment. Please try again.",
          variant: "destructive",
        });
      } finally {
        setReplacingAttachmentId(null);
      }
    };

    input.click();
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxTotal = items.reduce((s, i) => s + (i.quantity * i.rate * i.tax) / 100, 0);
  const total = subtotal + taxTotal;
  // Add these functions after the calculations (subtotal, taxTotal, total)
  
  const saveInvoice = async () => {
 if (!customerId) {
  toast({
    title: "Missing customer",
    description: "Please choose a customer before continuing.",
    variant: "destructive",
  });
  return;
}


    setLoading(true);
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_no: invoiceNo,
          customer_id: customerId,
          issue_date: issueDate,
          due_date: dueDate,
          subtotal,
          tax_total: taxTotal,
          balance_due: total,
          notes: note,
          memo: memo,
          customer_email: customerEmail,
          cc_bcc: ccBcc,
          code: selectedCode || null,
          location: location,
          terms: terms,
          invoice_amounts: invoiceAmounts,
          status: "draft",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const itemsToInsert = items
        .filter((item) => item.description || item.quantity > 0 || item.rate > 0)
        .map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.rate,
          tax_rate: item.tax,
          service_date: item.serviceDate || null,
          product_service: item.productService || null,
          class: item.class || null,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert);
        if (itemsError) throw itemsError;
      }

        toast({
        title: "Invoice saved",
        description: "The invoice has been saved successfully.",
      });

      window.location.href = "/sales/invoices";
    } catch (error) {
      console.error("Error saving invoice:", error);
     toast({
      title: "Save failed",
      description: "There was an error saving the invoice. Please try again.",
      variant: "destructive",
    });

    } finally {
      setLoading(false);
    }
  };

const reviewAndSend = async () => {
  if (!customerId) {
    sileo.warning({ title: "No customer selected", description: "Please choose a customer before saving." });
    return;
  }

  if (!customerEmail) {
  toast({
    title: "Missing email",
    description: "Please enter a customer email before sending.",
    variant: "destructive",
  });
  return;
}

  setSending(true);
  try {
    // First save the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        invoice_no: invoiceNo,
        customer_id: customerId,
        issue_date: issueDate,
        due_date: dueDate,
        subtotal,
        tax_total: taxTotal,
        balance_due: total,
        notes: note,
        memo: memo,
        customer_email: customerEmail,
        cc_bcc: ccBcc,
        code: selectedCode || null,
        location: location,
        terms: terms,
        invoice_amounts: invoiceAmounts,
        status: "sent",
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    const itemsToInsert = items
      .filter((item) => item.description || item.quantity > 0 || item.rate > 0)
      .map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.rate,
        tax_rate: item.tax,
        service_date: item.serviceDate || null,
        product_service: item.productService || null,
        class: item.class || null,
      }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    // Generate PDF on client-side
    console.log("Generating PDF...");
    const pdfBase64 = await generateInvoicePDF({
      invoiceNo,
      customerName,
      billingAddress,
      issueDate,
      dueDate,
      items: items.filter((item) => item.description || item.quantity > 0 || item.rate > 0),
      subtotal,
      taxTotal,
      total,
      note,
      terms,
      location,
    });
    console.log("PDF generated successfully");

    // Send email with PDF attachment
    console.log("Sending email...");
    const emailResponse = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: ccBcc ? `${customerEmail},${ccBcc}` : customerEmail,
        subject: `Invoice ${invoiceNo} from Petrosphere Incorporated`,
        message: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Invoice ${invoiceNo}</h2>
            <p>Dear ${customerName},</p>
            <p>Please find attached your invoice.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${invoiceNo}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Issue Date:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${issueDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Due Date:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${dueDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Amount Due:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd; color: #d9534f; font-weight: bold;">₱${total.toFixed(2)}</td>
              </tr>
            </table>
            <p style="margin: 20px 0;">${note}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #666;">Best regards,<br/><strong>Petrosphere Incorporated</strong></p>
          </div>
        `,
        attachments: [
          {
            filename: `Invoice-${invoiceNo}.pdf`,
            content: pdfBase64,
            encoding: "base64",
          },
        ],
      }),
    });

    let emailResult: any = null;
    try {
      emailResult = await emailResponse.json();
    } catch {
      // ignore JSON parse errors; we'll fall back to status text
    }

    if (!emailResponse.ok) {
      const apiError =
        emailResult?.error ||
        emailResult?.message ||
        emailResponse.statusText ||
        "Failed to send email";
      throw new Error(apiError);
    }
  console.log("Email sent successfully");
    toast({
      title: "Invoice sent",
      description: "The invoice has been emailed successfully.",
    });

    window.location.href = "/sales?tab=invoices"; // ✅ Opens invoices tab
  } catch (error) {
    console.error("Error sending invoice:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error sending invoice";
    toast({
      title: "Send failed",
      description: message,
      variant: "destructive",
    });
  } finally {
    setSending(false);
  }
};

  const openMakeRecurring = () => {
    if (!customerId) {
      toast({
        title: "Missing customer",
        description: "Please choose a customer before creating a recurring schedule.",
        variant: "destructive",
      });
      return;
    }
    const defaultName = `Invoice - ${customerName || "Customer"} (${recurringFrequency})`;
    setRecurringName(defaultName);
    setShowRecurring(true);
  };

  const saveRecurring = async () => {
    if (!customerId) return;
    if (!recurringName.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a name for this recurring schedule.",
        variant: "destructive",
      });
      return;
    }

    setRecurringSaving(true);
    try {
      const template = {
        customerEmail,
        ccBcc,
        note,
        memo,
        terms,
        location,
        selectedCode,
        invoiceAmounts,
        subtotal,
        taxTotal,
        total,
        dueDate,
        items,
      };

      const res = await fetch("/api/recurring-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          name: recurringName.trim(),
          frequency: recurringFrequency,
          interval: recurringInterval,
          startDate: recurringStartDate,
          template,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create recurring invoice.");
      }

      toast({
        title: "Recurring schedule created",
        description: "We’ll generate invoices automatically when the schedule runs.",
      });
      setShowRecurring(false);
    } catch (e: any) {
      toast({
        title: "Failed to create schedule",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRecurringSaving(false);
    }
  };
  // Add this return statement after the reviewAndSend function

  return (
    <div className="bg-linear-to-b from-slate-50 via-white to-white">
      {/* Header (sticky) */}
      <header className="border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.history.back()}
              className="h-10 w-10 rounded-full shrink-0 border border-slate-200/70 bg-white/80 shadow-sm hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">Create invoice</h1>
              <p className="text-sm text-slate-600">Create and send an invoice to your customer.</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-full">
        {/* Main Content Area */}
        <div className={`flex-1 ${showCodeSelector ? 'overflow-hidden' : ''}`}>
          <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
            {/* MAIN CONTENT */}
            <div className="bg-white border border-slate-200/80 rounded-3xl shadow-[0_20px_55px_-30px_rgba(15,23,42,0.25)] overflow-hidden">
            {/* ─── Balance Due Badge ─── */}
            <div className="flex items-center justify-end px-6 pt-5 sm:px-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-emerald-900/70">Balance due</span>
                <span className="text-lg font-bold text-emerald-800 tabular-nums">₱{total.toFixed(2)}</span>
              </div>
            </div>
            {/* ─── Customer Section ─── */}
            <div className="p-6 sm:p-8 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto] gap-4 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</Label>
                  <CustomerSelector value={customerId} onChange={setCustomerId} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</Label>
                  <Input type="email" placeholder="customer@email.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="h-10" />
                </div>
                <div className="flex items-end pb-0.5">
                  {!showCcBcc ? (
                    <button onClick={() => setShowCcBcc(true)} className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline whitespace-nowrap" type="button">+ Cc/Bcc</button>
                  ) : (
                    <Input type="text" placeholder="Cc/Bcc (comma separated)" value={ccBcc} onChange={(e) => setCcBcc(e.target.value)} className="h-10 w-[280px]" />
                  )}
                </div>
              </div>

              {customerId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-2 shadow-inner shadow-slate-900/5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill to</span>
                    </div>
                    <Textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="min-h-[90px] resize-none bg-white rounded-xl border-slate-200 shadow-sm" />
                    <button onClick={() => (window.location.href = `/sales/customers/${customerId}/edit`)} className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline" type="button">Edit customer</button>
                  </div>
                  {showShipTo && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4 space-y-2 shadow-inner shadow-slate-900/5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ship to</span>
                      </div>
                      <Textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="min-h-[90px] resize-none bg-white rounded-xl border-slate-200 shadow-sm" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200/70" />

            {/* ─── Invoice Details ─── */}
            <div className="p-6 sm:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                {/* Left column */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project / Training Code</Label>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <Select value={selectedCode} onValueChange={handleCodeSelect}>
                          <SelectTrigger className="h-11 min-w-[260px]">
                            <SelectValue placeholder="Select code" />
                          </SelectTrigger>
                      <SelectContent>
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
                      {selectedCode ? (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          type="button"
                          onClick={() => setSelectedCode("")}
                          aria-label="Clear selected code"
                          title="Clear"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                    <button onClick={() => setShowCodeSelector(true)} className="text-xs text-green-700 hover:text-green-800 hover:underline" type="button">Manage codes</button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice amounts are</Label>
                    <Select value={invoiceAmounts} onValueChange={setInvoiceAmounts}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Out of Scope of Tax">Out of Scope of Tax</SelectItem>
                        <SelectItem value="Tax Inclusive">Tax Inclusive</SelectItem>
                        <SelectItem value="Tax Exclusive">Tax Exclusive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {showShipTo && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ship via</Label>
                        <Input placeholder="Shipping method" value={shipVia} onChange={(e) => setShipVia(e.target.value)} className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping date</Label>
                        <Input type="date" value={shippingDate} onChange={(e) => setShippingDate(e.target.value)} className="h-10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tracking no.</Label>
                        <Input placeholder="Tracking number" value={trackingNo} onChange={(e) => setTrackingNo(e.target.value)} className="h-10" />
                      </div>
                    </>
                  )}
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</Label>
                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Head Office - Puerto Princesa City">Head Office - Puerto Princesa City</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice no.</Label>
                      <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms</Label>
                      <Input value={terms} onChange={(e) => setTerms(e.target.value)} className="h-10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice date</Label>
                      <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due date</Label>
                      <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200/70" />

            {/* ─── Product / Service Table ─── */}
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Products & services</h3>
              </div>
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <div className="w-full overflow-x-auto lg:overflow-x-visible">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2.5 text-left" style={{width: 44}}>#</th>
                        {showServiceDate && <th className="px-3 py-2.5 text-left" style={{width: 150}}>Service date</th>}
                        {showProductService && <th className="px-3 py-2.5 text-left">Product/service</th>}
                        <th className="px-3 py-2.5 text-left">Description</th>
                        <th className="px-3 py-2.5 text-left" style={{width: 80}}>Qty</th>
                        <th className="px-3 py-2.5 text-left" style={{width: 100}}>Rate</th>
                        <th className="px-3 py-2.5 text-right" style={{width: 110}}>Amount</th>
                        <th className="px-3 py-2.5 text-left" style={{width: 110}}>Class</th>
                        <th style={{width: 40}} />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, i) => (
                        <tr key={i} className="border-t border-slate-200/70 group hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2">
                            <span className="text-xs text-slate-500 font-medium">{i + 1}</span>
                          </td>
                          {showServiceDate && (
                            <td className="px-3 py-2">
                              <Input type="date" value={item.serviceDate} onChange={(e) => updateItem(i, "serviceDate", e.target.value)} className="h-10 text-sm rounded-xl border-slate-200 bg-white shadow-sm" />
                            </td>
                          )}
                          {showProductService && (
                            <td className="px-3 py-2">
                              <Input value={item.productService} placeholder="Product / Service" onChange={(e) => updateItem(i, "productService", e.target.value)} className="h-10 text-sm rounded-xl border-slate-200 bg-white shadow-sm min-w-0 w-full" />
                            </td>
                          )}
                          <td className="px-3 py-2">
                            <Input value={item.description} placeholder="Description" onChange={(e) => updateItem(i, "description", e.target.value)} className="h-10 text-sm rounded-xl border-slate-200 bg-white shadow-sm min-w-0 w-full" />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} className="h-10 text-sm rounded-xl border-slate-200 bg-white shadow-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <Input type="number" value={item.rate} onChange={(e) => updateItem(i, "rate", parseFloat(e.target.value) || 0)} className="h-10 text-sm rounded-xl border-slate-200 bg-white shadow-sm" />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-sm font-semibold tabular-nums text-slate-900">₱{((item.quantity * item.rate) * (1 + item.tax / 100)).toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-2">
                            <Input value={item.class} placeholder="Class" onChange={(e) => updateItem(i, "class", e.target.value)} className="h-10 text-sm rounded-xl border-slate-200 bg-white shadow-sm" />
                          </td>
                          <td className="px-3 py-2">
                            {items.length > 1 && (
                              <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-9 w-9 rounded-xl p-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-600 hover:bg-red-50" type="button">
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center gap-2 px-3 py-2.5 border-t border-slate-200/70 bg-slate-50/60">
                  <Button variant="ghost" size="sm" onClick={addItem} className="h-9 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50" type="button">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add line
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearAllLines} className="h-9 text-xs font-medium text-slate-500 hover:text-slate-900" type="button">
                    Clear all
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t" />

            {/* ─── Notes & Memo ─── */}
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer payment options</h3>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note to customer</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[100px] resize-none" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Memo on statement</Label>
                <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="This memo will appear on statements" className="min-h-[80px] resize-none" />
              </div>
            </div>
          </div>

          {/* Customer Attachments */}
            {customerId && (
              <div className="bg-card border rounded-xl shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Attachments ({attachments.length})</h3>
                  </div>
                  <Button 
                    onClick={handleAddAttachment} 
                    size="sm" 
                    variant="outline"
                    disabled={uploadingAttachment}
                  >
                    {uploadingAttachment ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Add Attachment
                      </>
                    )}
                  </Button>
                </div>

                {attachments.length > 0 ? (
                  <div className="space-y-3 border border-slate-200 rounded-xl p-4">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-blue-600 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{attachment.filename}</p>
                            <p className="text-sm text-muted-foreground">
                              Uploaded {new Date(attachment.uploaded_at).toLocaleDateString()}
                              {attachment.file_size && 
                                ` • ${(attachment.file_size / 1024).toFixed(2)} KB`
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
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
                              const link = document.createElement('a');
                              link.href = attachment.file_url;
                              link.download = attachment.filename;
                              link.click();
                            }}
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReplaceAttachment(attachment.id)}
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
                            onClick={() => handleDeleteAttachment(attachment.id)}
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
                  <div className="text-center py-10 border border-slate-200 rounded-xl bg-slate-50">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm text-slate-600">No attachments yet</p>
                    <p className="text-xs text-slate-500">Click “Add Attachment” to upload files</p>
                  </div>
                )}
              </div>
            )}
            

          {/* Footer Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
            <Button variant="outline" className="h-9 text-sm">Print or Download</Button>
            <Button variant="outline" onClick={openMakeRecurring} className="h-9 text-sm">Make Recurring</Button>
            <Button className="h-9 bg-green-600 hover:bg-green-700 text-white text-sm" onClick={saveInvoice} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button className="h-9 bg-green-700 hover:bg-green-800 text-white text-sm flex items-center gap-1.5" onClick={reviewAndSend} disabled={sending}>
              {sending ? "Sending..." : "Review and Send"}
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>
          </div>
        </div>

        {/* Right Side Settings Panel */}
        {showSettings && (
          <div className="w-[320px] border-l bg-card shrink-0 self-start">
          <div className="p-5 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">Invoice {invoiceNo.split("-")[1]}</h2>
                <button className="text-xs text-green-700 hover:text-green-800 hover:underline mt-0.5">Edit default settings</button>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Customisation */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setCustomisationOpen(!customisationOpen)}
                className="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <span>Customisation</span>
                {customisationOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {customisationOpen && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t">
                  {[
                    { label: "Ship to", checked: showShipTo, onChange: setShowShipTo },
                    { label: "Service date", checked: showServiceDate, onChange: setShowServiceDate },
                    { label: "Product/service", checked: showProductService, onChange: setShowProductService },
                    { label: "Company reg. number", checked: showCompanyReg, onChange: setShowCompanyReg },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-1">
                      <span className="text-sm text-foreground">{item.label}</span>
                      <Switch checked={item.checked} onCheckedChange={item.onChange} />
                    </div>
                  ))}
                  <button className="text-xs text-green-700 hover:text-green-800 hover:underline pt-1">Custom fields · Manage</button>
                </div>
              )}
            </div>

            {/* Payment Options */}
            <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setPaymentOptionsOpen(!paymentOptionsOpen)}
                className="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                <span>Payment options</span>
                {paymentOptionsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {paymentOptionsOpen && (
                <div className="px-4 pb-4 pt-1 space-y-3 border-t">
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Deposit</span>
                      <button className="text-xs text-green-700 hover:underline">Manage</button>
                      <span className="text-[10px] font-bold bg-pink-600 text-white px-1.5 py-px rounded">NEW</span>
                    </div>
                    <Switch checked={showDeposit} onCheckedChange={setShowDeposit} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">Discount</span>
                    <Switch checked={showDiscount} onCheckedChange={setShowDiscount} />
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm">Shipping fee</span>
                    <Switch checked={showShippingFee} onCheckedChange={setShowShippingFee} />
                  </div>
                </div>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Floating Settings Button */}
        {!showSettings && (
          <Button
            onClick={() => setShowSettings(true)}
            className="fixed right-6 top-24 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white"
            size="icon"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
      </div> {/* end flex row */}

      {/* Manage Tags Modal */}
      {/* Manage Codes Modal */}
      <ManageCodesModal
        isOpen={showCodeSelector}
        onClose={() => setShowCodeSelector(false)}
      />

      {/* Make Recurring Dialog */}
      <Dialog open={showRecurring} onOpenChange={setShowRecurring}>
        <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Make invoice recurring</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Set up an automatic schedule for this invoice
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowRecurring(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Schedule name</Label>
              <Input className="h-10" value={recurringName} onChange={(e) => setRecurringName(e.target.value)} placeholder="e.g., Monthly invoice - ACME" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frequency</Label>
                <Select value={recurringFrequency} onValueChange={(v: any) => setRecurringFrequency(v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Every</Label>
                <Input className="h-10" type="number" min={1} max={52} value={recurringInterval} onChange={(e) => setRecurringInterval(Math.max(1, Math.min(52, Number(e.target.value) || 1)))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start date</Label>
                <Input className="h-10" type="date" value={recurringStartDate} onChange={(e) => setRecurringStartDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setShowRecurring(false)} disabled={recurringSaving}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]" onClick={saveRecurring} disabled={recurringSaving}>
              {recurringSaving ? "Saving..." : "Save schedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
