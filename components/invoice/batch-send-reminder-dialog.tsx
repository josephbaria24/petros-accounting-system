"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Upload, X, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

type BatchInvoice = {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_email?: string | null;
  total_amount: number;
  balance_due: number;
  due_date?: string | null;
  issue_date?: string | null;
};

type BatchSendReminderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: BatchInvoice[];
  onRemindersSent: () => void;
};

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  message: string;
  type: string;
};

const LAST_TEMPLATE_KEY = "lastUsedReminderTemplate";
const LAST_LOGO_KEY = "lastUsedLogo";

export default function BatchSendReminderDialog({
  open,
  onOpenChange,
  invoices,
  onRemindersSent,
}: BatchSendReminderDialogProps) {
  const supabase = createClient();
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailData, setEmailData] = useState({
    from: "info@petrosphere.com.ph",
    subject: "",
  });

  // Load templates and last used settings on open
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadLastUsedSettings();
    }
  }, [open]);

  const loadLastUsedSettings = () => {
    try {
      const savedLogo = localStorage.getItem(LAST_LOGO_KEY);
      if (savedLogo) {
        const logoData = JSON.parse(savedLogo);
        setLogoPreview(logoData.preview);
        setLogoUrl(logoData.url);
      }
    } catch (error) {
      console.error("Error loading last used settings:", error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("type", "payment_reminder")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);

      const lastTemplateId = localStorage.getItem(LAST_TEMPLATE_KEY);
      if (lastTemplateId && data?.some((t) => t.id === lastTemplateId)) {
        setSelectedTemplate(lastTemplateId);
        applyTemplate(lastTemplateId, data);
      } else {
        loadDefaultTemplate();
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const applyTemplate = (templateId: string, templateList?: EmailTemplate[]) => {
    if (templateId === "default" || !templateId) {
      loadDefaultTemplate();
      return;
    }

    const templateSource = templateList || templates;
    const template = templateSource.find((t) => t.id === templateId);
    if (template && editorRef.current) {
      setEmailData((prev) => ({ ...prev, subject: template.subject }));
      editorRef.current.innerHTML = template.message;
    }
  };

  const loadDefaultTemplate = () => {
    if (!editorRef.current) return;

    const defaultSubject = "Payment Reminder: Invoice [Invoice Number] from Your Company";
    const defaultMessage = `Dear [Customer Name],<br><br>This is a friendly reminder that payment for the following invoice is overdue by 4 days.<br><br>You can pay using the following:<br><br>BPI Bank:<br>Gcash:<br>Pay over the counter<br><br>Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this reminder.`;

    setEmailData((prev) => ({
      ...prev,
      subject: defaultSubject,
    }));

    editorRef.current.innerHTML = defaultMessage;
  };

  useEffect(() => {
    if (open && editorRef.current && !selectedTemplate) {
      loadDefaultTemplate();
    }
  }, [open]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append("logo", logoFile);

      const response = await fetch("/api/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setLogoUrl(data.url);
        localStorage.setItem(
          LAST_LOGO_KEY,
          JSON.stringify({ preview: logoPreview, url: data.url })
        );
        alert("Logo uploaded successfully!");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Error uploading logo. Please try again.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const toggleInvoiceExpand = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  const getPersonalizedMessage = (invoice: BatchInvoice) => {
    const editorContent = editorRef.current?.innerHTML || "";
    return editorContent
      .replace(/\[Customer Name\]/g, invoice.customer_name)
      .replace(/\[Invoice Number\]/g, invoice.invoice_no);
  };

  const getEmailPreviewHtml = (invoice: BatchInvoice) => {
    const personalizedMessage = getPersonalizedMessage(invoice);
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: white;">
        <div style="text-align: center; margin-bottom: 30px;">
          ${
            logoPreview || logoUrl
              ? `<img src="${logoPreview || logoUrl}" alt="Company Logo" style="max-width: 150px; max-height: 80px; object-fit: contain;" />`
              : '<div style="width: 150px; height: 80px; margin: 0 auto; background-color: #f0f0f0; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: #999;">Company Logo</div>'
          }
        </div>
        
        <div style="font-size: 14px; line-height: 1.6; color: #333;">
          ${personalizedMessage}
        </div>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 30px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${invoice.invoice_no}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Issue Date:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${
                invoice.issue_date
                  ? new Date(invoice.issue_date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
              <td style="padding: 8px 0; text-align: right;">${
                invoice.due_date
                  ? new Date(invoice.due_date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "N/A"
              }</td>
            </tr>
            <tr style="border-top: 2px solid #ddd;">
              <td style="padding: 12px 0;"><strong>Amount Due:</strong></td>
              <td style="padding: 12px 0; text-align: right; font-size: 20px; color: #d32f2f;"><strong>₱${invoice.balance_due.toLocaleString(
                "en-PH",
                { minimumFractionDigits: 2, maximumFractionDigits: 2 }
              )}</strong></td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: 500;">View Invoice</a>
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
          <p>Questions? Contact us at your-email@company.com</p>
        </div>
      </div>
    `;
  };

  const generateHTMLMessageForInvoice = async (invoice: BatchInvoice) => {
    const personalizedMessage = getPersonalizedMessage(invoice);
    const inlineImages = [];
    const attachments = [];

    // Get PDF for attachment
    try {
      const response = await fetch("/api/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          invoiceId: invoice.id,
          logoUrl: logoUrl || undefined
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const pdfBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        attachments.push({
          filename: `invoice-${invoice.invoice_no}.pdf`,
          content: pdfBase64,
        });
      }
    } catch (err) {
      console.log("Could not attach PDF for invoice:", invoice.invoice_no, err);
    }

    // Add logo as inline image
    if (logoPreview) {
      inlineImages.push({
        filename: logoFile?.name || "logo.png",
        content: logoPreview,
        cid: "companylogo",
      });
    }

    return {
      html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    ${
      logoPreview || logoUrl
        ? `<img src="cid:companylogo" alt="Company Logo" style="max-width: 150px; max-height: 80px;" />`
        : '<div style="width: 150px; height: 80px; margin: 0 auto; background-color: #f0f0f0; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: #999;">Company Logo</div>'
    }
  </div>
  
  <div style="font-size: 14px; line-height: 1.6; color: #333;">
    ${personalizedMessage}
  </div>
  
  <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 30px 0;">
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${invoice.invoice_no}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Issue Date:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${
          invoice.issue_date
            ? new Date(invoice.issue_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "N/A"
        }</td>
      </tr>
      <tr>
        <td style="padding: 8px 0;"><strong>Due Date:</strong></td>
        <td style="padding: 8px 0; text-align: right;">${
          invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "N/A"
        }</td>
      </tr>
      <tr style="border-top: 2px solid #ddd;">
        <td style="padding: 12px 0;"><strong>Amount Due:</strong></td>
        <td style="padding: 12px 0; text-align: right; font-size: 20px; color: #d32f2f;"><strong>₱${invoice.balance_due.toLocaleString(
          "en-PH",
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}</strong></td>
      </tr>
    </table>
  </div>
  
  <div style="text-align: center; margin-top: 30px;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; font-weight: 500;">View Invoice</a>
  </div>
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
    <p>Questions? Contact us at your-email@company.com</p>
  </div>
</div>
      `.trim(),
      inlineImages,
      attachments,
    };
  };

  const handleSendAll = async () => {
    if (!emailData.subject) {
      alert("Please fill in the subject");
      return;
    }

    if (!editorRef.current?.textContent?.trim()) {
      alert("Please enter a message");
      return;
    }

    // Check for missing emails
    const invoicesWithoutEmail = invoices.filter(inv => !inv.customer_email);
    if (invoicesWithoutEmail.length > 0) {
      const confirmed = window.confirm(
        `${invoicesWithoutEmail.length} invoice(s) have customers without email addresses and will be skipped. Continue?`
      );
      if (!confirmed) return;
    }

    setSending(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const invoice of invoices) {
        if (!invoice.customer_email) {
          failCount++;
          continue;
        }

        try {
          const { html, inlineImages, attachments } = await generateHTMLMessageForInvoice(invoice);

          // Send email
          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: invoice.customer_email,
              subject: emailData.subject
                .replace(/\[Customer Name\]/g, invoice.customer_name)
                .replace(/\[Invoice Number\]/g, invoice.invoice_no),
              message: html,
              inlineImages: inlineImages.length > 0 ? inlineImages : undefined,
              attachments: attachments.length > 0 ? attachments : undefined,
            }),
          });

          const result = await response.json();

          if (result.success) {
            // Record reminder sent
            await supabase.from("invoice_reminders").insert({
              invoice_id: invoice.id,
              sent_to: invoice.customer_email,
              subject: emailData.subject,
              sent_at: new Date().toISOString(),
            });
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to send to ${invoice.customer_email}:`, result.error);
          }
        } catch (error) {
          failCount++;
          console.error(`Error sending to ${invoice.customer_email}:`, error);
        }
      }

      if (selectedTemplate) {
        localStorage.setItem(LAST_TEMPLATE_KEY, selectedTemplate);
      }

      alert(`Batch send complete!\nSuccess: ${successCount}\nFailed: ${failCount}`);
      onRemindersSent();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending batch reminders:", error);
      alert("Error sending reminders. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const invoicesWithEmail = invoices.filter(inv => inv.customer_email);
  const invoicesWithoutEmail = invoices.filter(inv => !inv.customer_email);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Batch Reminders ({invoices.length} invoices)</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Left side - Email form */}
          <div className="w-[400px] space-y-4 overflow-y-auto pr-4">
            {/* Logo Upload */}
            <div className="space-y-2 border p-4 rounded-lg bg-slate-50">
              <Label>Company Logo</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoFile || logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
                {(logoFile || logoPreview) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview("");
                      setLogoUrl("");
                      localStorage.removeItem(LAST_LOGO_KEY);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                className="hidden"
              />
              {logoPreview && (
                <div className="flex gap-2 items-center">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="h-16 w-auto max-w-xs rounded border"
                  />
                  <Button
                    size="sm"
                    onClick={handleLogoUpload}
                    disabled={uploadingLogo || !!logoUrl}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {logoUrl ? "Uploaded ✓" : "Upload to FTP"}
                  </Button>
                </div>
              )}
            </div>

            {/* Template Selector */}
            <div className="space-y-2">
              <Label htmlFor="template">Use Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(value) => {
                  setSelectedTemplate(value);
                  applyTemplate(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    Default Payment Reminder
                  </SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From */}
            <div className="space-y-2">
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                value={emailData.from}
                onChange={(e) =>
                  setEmailData({ ...emailData, from: e.target.value })
                }
                className="bg-gray-50"
              />
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) =>
                  setEmailData({ ...emailData, subject: e.target.value })
                }
                placeholder="Use [Customer Name] and [Invoice Number] as placeholders"
              />
              <p className="text-xs text-gray-500">
                Tip: Use [Customer Name] and [Invoice Number] for personalization
              </p>
            </div>

            {/* Email body editor */}
            <div className="space-y-2">
              <Label>Email body</Label>
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[150px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card"
                style={{
                  lineHeight: "1.6",
                  fontSize: "14px",
                }}
                suppressContentEditableWarning
              />
              <p className="text-xs text-gray-500">
                Use [Customer Name] and [Invoice Number] as placeholders
              </p>
            </div>
          </div>

          {/* Right side - Invoice list with previews */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">Ready to send: {invoicesWithEmail.length}</h3>
                  {invoicesWithoutEmail.length > 0 && (
                    <p className="text-sm text-orange-600 mt-1">
                      ⚠️ {invoicesWithoutEmail.length} invoice(s) will be skipped (no email)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-4">
                {invoices.map((invoice) => {
                  const isExpanded = expandedInvoices.has(invoice.id);
                  const hasEmail = !!invoice.customer_email;

                  return (
                    <div
                      key={invoice.id}
                      className={`border rounded-lg ${
                        hasEmail ? "bg-white" : "bg-gray-50 opacity-75"
                      }`}
                    >
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleInvoiceExpand(invoice.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">{invoice.invoice_no}</span>
                            <span className="text-sm text-gray-600">{invoice.customer_name}</span>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {hasEmail ? (
                              <span className="text-green-600">✓ {invoice.customer_email}</span>
                            ) : (
                              <span className="text-orange-600">⚠️ No email address</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            ₱{invoice.balance_due.toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && hasEmail && (
                        <div className="border-t p-4 bg-gray-50">
                          <h4 className="text-sm font-semibold mb-2">Email Preview:</h4>
                          <div className="bg-white border rounded p-3 max-h-96 overflow-y-auto">
                            <div className="text-xs text-gray-500 mb-3 pb-3 border-b">
                              <div className="mb-1">
                                <span className="font-semibold">To:</span> {invoice.customer_email}
                              </div>
                              <div>
                                <span className="font-semibold">Subject:</span>{" "}
                                {emailData.subject
                                  .replace(/\[Customer Name\]/g, invoice.customer_name)
                                  .replace(/\[Invoice Number\]/g, invoice.invoice_no)}
                              </div>
                            </div>
                            <div
                              dangerouslySetInnerHTML={{ __html: getEmailPreviewHtml(invoice) }}
                              className="prose prose-sm max-w-none"
                              style={{ fontSize: "12px" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSendAll}
            disabled={sending || !emailData.subject || invoicesWithEmail.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send {invoicesWithEmail.length} Reminder{invoicesWithEmail.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}