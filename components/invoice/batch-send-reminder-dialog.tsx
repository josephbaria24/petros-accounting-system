"use client";
import { sileo } from "sileo";

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
import {
  EMAIL_LOGO_CONTENT_ID,
  emailLogoCidHref,
} from "@/lib/email-inline-logo";

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
        sileo.success({ title: "Logo uploaded" });
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      sileo.error({ title: "Upload failed", description: "Could not upload logo. Please try again." });
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

  const buildEmailHtml = (inv: BatchInvoice, bodyHtml: string, logoSrc: string) => {
    const issueDateFmt = inv.issue_date
      ? new Date(inv.issue_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "N/A";
    const dueDateFmt = inv.due_date
      ? new Date(inv.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "N/A";
    const amountFmt = `₱${inv.balance_due.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" alt="Company Logo" width="160" height="60" style="max-height:60px;max-width:160px;height:auto;width:auto;display:block;border:0;object-fit:contain;" />`
      : `<div style="display:inline-block;padding:10px 20px;background:#f3f4f6;border-radius:6px;color:#9ca3af;font-size:13px;font-weight:500;letter-spacing:0.02em;">Your Company</div>`;

    return `
<div style="background-color:#f4f6f8;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);border:1px solid #e2e8f0;">
    <div style="height:5px;background:linear-gradient(90deg,#c9a84c,#e8c96a,#c9a84c);"></div>
    <div style="padding:28px 40px 22px;text-align:left;background:#1a2f4e;">
      ${logoHtml}
      <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;line-height:1.7;letter-spacing:0.01em;">
        304, 3F, Trigold Business Park, National Highway<br/>
        San Pedro, 5300, Puerto Princesa City
      </p>
    </div>
    <div style="padding:32px 40px 0;background:#ffffff;">
      <div style="display:inline-block;background:#c9a84c;color:#1a2f4e;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;padding:5px 12px;border-radius:4px;margin-bottom:20px;">
        Payment Reminder
      </div>
      <div style="font-size:15px;line-height:1.75;color:#1e293b;">
        ${bodyHtml}
      </div>
    </div>
    <div style="margin:28px 40px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div style="padding:13px 20px;background:#1a2f4e;">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#c9a84c;">Invoice Details</span>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#ffffff;">
        <tr>
          <td style="padding:13px 20px;font-size:13px;color:#64748b;font-weight:500;border-bottom:1px solid #f1f5f9;">Invoice Number</td>
          <td style="padding:13px 20px;font-size:13px;color:#1a2f4e;font-weight:700;text-align:right;border-bottom:1px solid #f1f5f9;">${inv.invoice_no}</td>
        </tr>
        <tr>
          <td style="padding:13px 20px;font-size:13px;color:#64748b;font-weight:500;border-bottom:1px solid #f1f5f9;">Issue Date</td>
          <td style="padding:13px 20px;font-size:13px;color:#1e293b;font-weight:500;text-align:right;border-bottom:1px solid #f1f5f9;">${issueDateFmt}</td>
        </tr>
        <tr>
          <td style="padding:13px 20px;font-size:13px;color:#64748b;font-weight:500;">Due Date</td>
          <td style="padding:13px 20px;font-size:13px;color:#1e293b;font-weight:500;text-align:right;">${dueDateFmt}</td>
        </tr>
      </table>
      <div style="padding:18px 20px;background:#fdf3d6;border-top:2px solid #c9a84c;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#1a2f4e;">Total Amount Due</td>
            <td style="text-align:right;font-size:26px;font-weight:800;color:#1a2f4e;letter-spacing:-0.5px;">${amountFmt}</td>
          </tr>
        </table>
      </div>
    </div>
    <div style="padding:24px 40px 28px;text-align:center;background:#1a2f4e;">
      <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.6;">
        Questions? Contact us at
        <a href="mailto:info@petrosphere.com.ph" style="color:#c9a84c;text-decoration:none;font-weight:600;">info@petrosphere.com.ph</a>
      </p>
      <p style="margin:0;font-size:11px;color:#475569;">This is an automated payment reminder. Please disregard if already paid.</p>
    </div>
  </div>
</div>`;
  };

  const getEmailPreviewHtml = (invoice: BatchInvoice) => {
    const personalizedMessage = getPersonalizedMessage(invoice);
    return buildEmailHtml(invoice, personalizedMessage, logoPreview || logoUrl || "");
  };

  const resolveLogoContentForEmail = async (): Promise<string> => {
    if (logoPreview?.startsWith("data:")) return logoPreview;
    if (logoPreview) return logoPreview;
    if (logoUrl?.startsWith("http")) {
      try {
        const r = await fetch(logoUrl);
        if (!r.ok) return logoUrl;
        const blob = await r.blob();
        return await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = () => resolve(logoUrl!);
          fr.readAsDataURL(blob);
        });
      } catch {
        return logoUrl;
      }
    }
    return "";
  };

  const generateHTMLMessageForInvoice = async (invoice: BatchInvoice) => {
    const personalizedMessage = getPersonalizedMessage(invoice);
    const inlineImages: { filename: string; content: string; cid: string }[] = [];
    const attachments: { filename: string; content: string }[] = [];

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

    const logoContent = await resolveLogoContentForEmail();
    if (logoContent) {
      inlineImages.push({
        filename: "inline-logo.png",
        content: logoContent,
        cid: EMAIL_LOGO_CONTENT_ID,
      });
    }

    const cidLogoHtml = logoContent ? emailLogoCidHref : "";

    return {
      html: buildEmailHtml(invoice, personalizedMessage, cidLogoHtml).trim(),
      inlineImages,
      attachments,
    };
  };

  const handleSendAll = async () => {
    if (!emailData.subject) {
      sileo.warning({ title: "Missing subject", description: "Please fill in the email subject." });
      return;
    }

    if (!editorRef.current?.textContent?.trim()) {
      sileo.warning({ title: "Empty message", description: "Please enter a message before sending." });
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

      sileo.success({ title: "Batch send complete", description: `Sent: ${successCount} | Failed: ${failCount}` });
      onRemindersSent();
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending batch reminders:", error);
      sileo.error({ title: "Send failed", description: "Could not send reminders. Please try again." });
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
            <div className="space-y-2 border p-4 rounded-lg bg-card">
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
                className="bg-card"
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
            <div className="mb-4 p-4 bg-card rounded-lg border border-blue-200">
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
                        hasEmail ? "bg-card" : "bg-gray-50 opacity-75"
                      }`}
                    >
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary"
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
