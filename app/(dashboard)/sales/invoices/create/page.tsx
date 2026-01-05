//app\sales\invoices\create\page.tsx
"use client";

import { useState, useEffect } from "react";
import CustomerSelector from "@/components/invoice/customer-selector";
import ManageTagsModal from "@/components/invoice/manage-tags-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, X, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [tags, setTags] = useState<string[]>([]);
  const [invoiceAmounts, setInvoiceAmounts] = useState("Out of Scope of Tax");
  const [showManageTags, setShowManageTags] = useState(false);

  const [items, setItems] = useState<InvoiceItem[]>([
    { serviceDate: "", productService: "", description: "", quantity: 1, rate: 0, tax: 0, class: "" },
  ]);

  const [note, setNote] = useState("Thank you for making business with us!");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

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

  const handleTagSelect = (tagId: string) => {
    if (!tags.includes(tagId)) {
      setTags([...tags, tagId]);
    }
    setShowManageTags(false);
  };

  const removeTag = (tagId: string) => {
    setTags(tags.filter((id) => id !== tagId));
  };

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
      }
    }
  }, [customerId, customers, showShipTo]);

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
          tags: tags.join(","),
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

      if (tags.length > 0 && invoice) {
        const tagInserts = tags.map((tagId) => ({
          invoice_id: invoice.id,
          tag_id: tagId,
        }));
        const { error: tagsError } = await supabase.from("invoice_tags").insert(tagInserts);
        if (tagsError) console.error("Error saving tags:", tagsError);
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
    alert("Please choose a customer");
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
        tags: tags.join(","),
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

    if (tags.length > 0) {
      const tagInserts = tags.map((tagId) => ({
        invoice_id: invoice.id,
        tag_id: tagId,
      }));
      await supabase.from("invoice_tags").insert(tagInserts);
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
        subject: `Invoice ${invoiceNo} from Your Company`,
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
            <p style="color: #666;">Best regards,<br/><strong>Your Company</strong></p>
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

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      throw new Error(emailResult.error || "Failed to send email");
    }
  console.log("Email sent successfully");
    toast({
      title: "Invoice sent",
      description: "The invoice has been emailed successfully.",
    });

    window.location.href = "/sales?tab=invoices"; // ✅ Opens invoices tab
  } catch (error) {
    console.error("Error sending invoice:", error);
    alert(`Error sending invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    setSending(false);
  }
};
  // Add this return statement after the reviewAndSend function

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto ${showManageTags ? 'overflow-hidden' : ''}`}>
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-primary">Invoice</h1>
            <div className="text-sm text-muted-foreground">
              Balance due (hidden): <span className="font-semibold">₱{total.toFixed(2)}</span>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="border rounded-lg p-6 space-y-6">
            {/* Customer Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CustomerSelector value={customerId} onChange={setCustomerId} />
              </div>

              <div className="gap-2 flex flex-col md:flex-row md:items-center">
                <Input
                    type="email"
                    placeholder="customer@email.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="max-w-xs"
                />

                {!showCcBcc && (
                    <button onClick={() => setShowCcBcc(true)} className="text-sm text-blue-600 hover:underline">
                    + Cc/Bcc
                    </button>
                )}

                {showCcBcc && (
                    <Input
                    type="text"
                    placeholder="Cc/Bcc emails (comma separated)"
                    value={ccBcc}
                    onChange={(e) => setCcBcc(e.target.value)}
                    className="max-w-xs"
                    />
                )}
              </div>
              

              {customerId && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-md p-4">
                    <div className="font-medium mb-1">Bill to</div>
                    <Textarea value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="min-h-[80px]" />
                    <button onClick={() => (window.location.href = `/sales/customers/${customerId}/edit`)} className="text-sm text-blue-600 hover:underline mt-2">
                      Edit Customer
                    </button>
                  </div>

                  {showShipTo && (
                    <div className="border rounded-md p-4">
                      <div className="font-medium mb-1">Ship to</div>
                      <Textarea value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="min-h-[80px]" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Invoice Details Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Tags (hidden):</Label>
                  <div className="flex flex-wrap gap-2 mt-1 mb-2">
                    {tags.map((tagId) => (
                      <div
                        key={tagId}
                        className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-sm"
                      >
                        <span>Tag {tagId.slice(0, 8)}</span>
                        <button
                          onClick={() => removeTag(tagId)}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Input placeholder="Start typing to add a tag" readOnly onClick={() => setShowManageTags(true)} />
                  <button 
                    onClick={() => setShowManageTags(true)} 
                    className="text-sm text-blue-600 hover:underline mt-1"
                  >
                    Manage tags
                  </button>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Invoice amounts are (hidden)</Label>
                  <Select value={invoiceAmounts} onValueChange={setInvoiceAmounts}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Out of Scope of Tax">Out of Scope of Tax</SelectItem>
                      <SelectItem value="Tax Inclusive">Tax Inclusive</SelectItem>
                      <SelectItem value="Tax Exclusive">Tax Exclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showShipTo && (
                  <>
                    <div>
                      <Label>Ship via</Label>
                      <Input 
                        placeholder="Shipping method" 
                        value={shipVia} 
                        onChange={(e) => setShipVia(e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label>Shipping date</Label>
                      <Input 
                        type="date" 
                        placeholder="MM/DD/YYYY" 
                        value={shippingDate} 
                        onChange={(e) => setShippingDate(e.target.value)} 
                      />
                    </div>
                    <div>
                      <Label>Tracking no.</Label>
                      <Input 
                        placeholder="Tracking number" 
                        value={trackingNo} 
                        onChange={(e) => setTrackingNo(e.target.value)} 
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Location (hidden):</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Head Office - Puerto Princesa City">Head Office - Puerto Princesa City</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Invoice no.</Label>
                    <Input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} />
                  </div>
                  <div>
                    <Label>Terms</Label>
                    <Input value={terms} onChange={(e) => setTerms(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Invoice date</Label>
                    <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Due date</Label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Product/Service Table */}
            <div>
              <h3 className="font-semibold mb-3">Product or service</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/40">
                    <tr className="text-sm text-muted-foreground">
                      <th className="p-2 text-left w-8">#</th>
                      {showServiceDate && <th className="p-2 text-left w-32">Service Date</th>}
                      {showProductService && <th className="p-2 text-left">Product/service</th>}
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left w-20">Qty</th>
                      <th className="p-2 text-left w-24">Rate</th>
                      <th className="p-2 text-left w-24">Amount</th>
                      <th className="p-2 text-left w-32">Class (hidden)</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">⋮⋮</span>
                            <span>{i + 1}</span>
                          </div>
                        </td>
                        {showServiceDate && (
                          <td className="p-2">
                            <Input type="date" value={item.serviceDate} onChange={(e) => updateItem(i, "serviceDate", e.target.value)} className="text-sm" />
                          </td>
                        )}
                        {showProductService && (
                          <td className="p-2">
                            <Input value={item.productService} placeholder="Product/Service" onChange={(e) => updateItem(i, "productService", e.target.value)} className="text-sm" />
                          </td>
                        )}
                        <td className="p-2">
                          <Input value={item.description} placeholder="Description" onChange={(e) => updateItem(i, "description", e.target.value)} className="text-sm" />
                        </td>
                        <td className="p-2">
                          <Input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} className="text-sm" />
                        </td>
                        <td className="p-2">
                          <Input type="number" value={item.rate} onChange={(e) => updateItem(i, "rate", parseFloat(e.target.value) || 0)} className="text-sm" />
                        </td>
                        <td className="p-2 text-sm">₱{((item.quantity * item.rate) * (1 + item.tax / 100)).toFixed(2)}</td>
                        <td className="p-2">
                          <Input value={item.class} placeholder="Class" onChange={(e) => updateItem(i, "class", e.target.value)} className="text-sm" />
                        </td>
                        <td className="p-2">
                          {items.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="h-8 w-8 p-0">
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex gap-2 p-3 border-t">
                  <Button variant="outline" onClick={addItem} className="text-sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add product or service
                  </Button>
                  <Button variant="outline" onClick={clearAllLines} className="text-sm">
                    Clear all lines
                  </Button>
                </div>
              </div>
            </div>

            {/* Customer Payment Options */}
            <div className="space-y-4">
              <h3 className="font-semibold">Customer payment options</h3>

              <div>
                <Label>Note to customer</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" />
              </div>

              <div>
                <Label>Memo on statement (hidden)</Label>
                <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="This memo will appear on statements" className="mt-1" />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 border-t pt-4 pb-6">
            <Button variant="outline">Print or Download</Button>
            <Button variant="outline">Make Recurring</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={saveInvoice} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button 
              className="bg-green-700 hover:bg-green-800 flex items-center gap-2"
              onClick={reviewAndSend}
              disabled={sending}
            >
              {sending ? "Sending..." : "Review and Send"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side Settings Panel */}
      {showSettings && (
        <div className="w-96 border-l overflow-y-auto">
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Invoice {invoiceNo.split("-")[1]}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <button className="text-sm text-blue-600 hover:underline">Edit default settings</button>

            {/* Customisation Section */}
            <div className="border rounded-lg">
              <button
                onClick={() => setCustomisationOpen(!customisationOpen)}
                className="flex items-center justify-between w-full p-4 text-left font-medium hover:bg-muted/50"
              >
                <span>Customisation</span>
                {customisationOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {customisationOpen && (
                <div className="p-4 space-y-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Ship to</Label>
                    <Switch checked={showShipTo} onCheckedChange={setShowShipTo} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Service date</Label>
                    <Switch checked={showServiceDate} onCheckedChange={setShowServiceDate} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Product/service</Label>
                    <Switch checked={showProductService} onCheckedChange={setShowProductService} />
                  </div>
                 
                  <div className="flex items-center justify-between">
                    <Label>Company registration number</Label>
                    <Switch checked={showCompanyReg} onCheckedChange={setShowCompanyReg} />
                  </div>

                  <div className="pt-2">
                    <button className="text-sm text-blue-600 hover:underline">Custom fields - Manage</button>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Options Section */}
            <div className="border rounded-lg">
              <button
                onClick={() => setPaymentOptionsOpen(!paymentOptionsOpen)}
                className="flex items-center justify-between w-full p-4 text-left font-medium hover:bg-muted/50"
              >
                <span>Payment options</span>
                {paymentOptionsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {paymentOptionsOpen && (
                <div className="p-4 space-y-4 border-t">
                  <h4 className="font-medium text-sm">More options</h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label>Deposit</Label>
                      <button className="text-sm text-blue-600 hover:underline">Manage</button>
                      <span className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded">NEW</span>
                    </div>
                    <Switch checked={showDeposit} onCheckedChange={setShowDeposit} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Discount</Label>
                    <Switch checked={showDiscount} onCheckedChange={setShowDiscount} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Shipping fee</Label>
                    <Switch checked={showShippingFee} onCheckedChange={setShowShippingFee} />
                  </div>
                </div>
              )}
            </div>

            {/* Design Section */}
            <div className="border rounded-lg">
              <button
                onClick={() => setDesignOpen(!designOpen)}
                className="flex items-center justify-between w-full p-4 text-left font-medium hover:bg-muted/50"
              >
                <span>Design</span>
                {designOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {designOpen && (
                <div className="p-4 space-y-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Modernised template</span>
                    <button className="text-sm text-blue-600 hover:underline">Make default</button>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                      <input type="radio" name="template" className="w-4 h-4" />
                      <span className="text-sm">Modern</span>
                    </label>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Other templates</span>
                      <button className="text-sm text-blue-600 hover:underline">Add/Edit</button>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                        <input type="radio" name="template" className="w-4 h-4" />
                        <span className="text-sm">Standard</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer">
                        <input type="radio" name="template" className="w-4 h-4" />
                        <span className="text-sm">Friendly Theme</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Scheduling Section */}
            <div className="border rounded-lg">
              <button
                onClick={() => setSchedulingOpen(!schedulingOpen)}
                className="flex items-center justify-between w-full p-4 text-left font-medium hover:bg-muted/50"
              >
                <span>Scheduling</span>
                {schedulingOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Settings Button (when panel is closed) */}
      {!showSettings && (
        <Button
          onClick={() => setShowSettings(true)}
          className="fixed right-6 top-24 rounded-full shadow-lg"
          size="icon"
        >
          <Settings className="h-5 w-5" />
        </Button>
      )}

      {/* Manage Tags Modal */}
      <ManageTagsModal
        isOpen={showManageTags}
        onClose={() => setShowManageTags(false)}
        onTagSelect={handleTagSelect}
      />
    </div>
  );
}