//components\invoice\send-reminder-dialog.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2, Paperclip, Upload, X } from "lucide-react";
import { Checkbox } from "@radix-ui/react-checkbox";

type SendReminderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_no: string;
    customer_name: string;
    customer_email?: string | null;
    total_amount: number;
    balance_due: number;
    due_date?: string | null;
    issue_date?: string | null;
  };
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

export default function SendReminderDialog({
  open,
  onOpenChange,
  invoice,
}: SendReminderDialogProps) {
  const supabase = createClient();
  const [sending, setSending] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [sendMeCopy, setSendMeCopy] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState("email");
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [emailData, setEmailData] = useState({
    from: "info@petrosphere.com.ph",
    to: invoice.customer_email || "",
    subject: "",
  });

  // Load templates and last used settings on open
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadLastUsedSettings();
      generatePdfPreview();
    }
  }, [open]);

  const loadLastUsedSettings = () => {
    try {
      // Load last used logo
      const savedLogo = localStorage.getItem(LAST_LOGO_KEY);
      if (savedLogo) {
        const logoData = JSON.parse(savedLogo);
        setLogoPreview(logoData.preview); // This contains the base64 data
        setLogoUrl(logoData.url);
      }
    } catch (error) {
      console.error("Error loading last used settings:", error);
    }
  };

const generatePdfPreview = async () => {
    setLoadingPdf(true);
    try {
      const response = await fetch("/api/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          invoiceId: invoice.id,
          logoBase64: logoPreview || undefined // Pass the base64 preview
        }),
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }
    } catch (error) {
      console.error("Error generating PDF preview:", error);
    } finally {
      setLoadingPdf(false);
    }
  };

  // Cleanup PDF URL when dialog closes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("type", "payment_reminder")
        .order("name");

      if (error) throw error;
      setTemplates(data || []);

      // Set last used template as default
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

    const daysOverdue = invoice.due_date
      ? Math.floor(
          (new Date().getTime() - new Date(invoice.due_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    const defaultSubject = `Reminder: Invoice ${invoice.invoice_no} from Your Company`;
    const defaultMessage = `Dear ${invoice.customer_name},<br><br>Just a reminder that we have not received a payment for this invoice yet. Let us know if you have any questions.<br><br>Thanks for your business!`;

    setEmailData((prev) => ({
      ...prev,
      subject: defaultSubject,
    }));

    editorRef.current.innerHTML = defaultMessage;
  };

  const handleOverwriteTemplate = async () => {
    if (!selectedTemplate || selectedTemplate === "default") return;

    const currentTemplate = templates.find((t) => t.id === selectedTemplate);
    if (!currentTemplate) return;

    const confirmed = window.confirm(
      `Are you sure you want to overwrite the template "${currentTemplate.name}" with the current content?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: emailData.subject,
          message: editorRef.current?.innerHTML || "",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTemplate);

      if (error) throw error;

      alert("Template updated successfully!");
      await loadTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      alert("Error updating template. Please try again.");
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate || selectedTemplate === "default") return;

    const currentTemplate = templates.find((t) => t.id === selectedTemplate);
    if (!currentTemplate) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete the template "${currentTemplate.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", selectedTemplate);

      if (error) throw error;

      // Clear localStorage if this was the last used template
      if (localStorage.getItem(LAST_TEMPLATE_KEY) === selectedTemplate) {
        localStorage.removeItem(LAST_TEMPLATE_KEY);
      }

      alert("Template deleted successfully!");
      
      // Reset to default template
      setSelectedTemplate("default");
      loadDefaultTemplate();
      
      // Reload templates
      await loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Error deleting template. Please try again.");
    }
  };

  // Generate default email content
  useEffect(() => {
    if (open && editorRef.current && !selectedTemplate) {
      loadDefaultTemplate();
    }
  }, [open, invoice]);

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
        
        // Save logo to localStorage for future use
        localStorage.setItem(
          LAST_LOGO_KEY,
          JSON.stringify({ preview: logoPreview, url: data.url })
        );
        
        // Regenerate PDF with new logo
        await generatePdfPreview();
        
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

  const generateHTMLMessage = async () => {
    const editorContent = editorRef.current?.innerHTML || "";
    const inlineImages = [];
    const attachments = [];
    let pdfBase64 = "";

    // Get PDF for attachment
    try {
      const response = await fetch("/api/generate-invoice-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          invoiceId: invoice.id,
          logoBase64: logoPreview || undefined // Pass the base64 preview here too
        }),
      });
      if (response.ok) {
        const blob = await response.blob();
        pdfBase64 = await new Promise((resolve) => {
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
      console.log("Could not attach PDF:", err);
    }

    // Add logo as inline image - use base64 preview (works for both uploaded and local)
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
    ${editorContent}
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
    
  </div>
  
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center;">
    <p>Questions? Contact us at info@petrosphere.com.ph</p>
  </div>
</div>
      `.trim(),
      inlineImages,
      attachments,
    };
  };

  const handleSend = async () => {
    if (!emailData.to || !emailData.subject) {
      alert("Please fill in recipient and subject");
      return;
    }

    if (!editorRef.current?.textContent?.trim()) {
      alert("Please enter a message");
      return;
    }

    setSending(true);

    try {
      const { html, inlineImages, attachments } = await generateHTMLMessage();

      if (saveAsTemplate && templateName.trim()) {
        const { error: templateError } = await supabase
          .from("email_templates")
          .upsert({
            name: templateName,
            subject: emailData.subject,
            message: editorRef.current?.innerHTML || "",
            type: "payment_reminder",
            updated_at: new Date().toISOString(),
          });

        if (templateError) {
          console.error("Error saving template:", templateError);
          alert("Warning: Could not save template, but will still send email");
        }
      }

      // Save last used template
      if (selectedTemplate) {
        localStorage.setItem(LAST_TEMPLATE_KEY, selectedTemplate);
      }

      // Send email
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          message: html,
          inlineImages: inlineImages.length > 0 ? inlineImages : undefined,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await supabase.from("invoice_reminders").insert({
          invoice_id: invoice.id,
          sent_to: emailData.to,
          subject: emailData.subject,
          sent_at: new Date().toISOString(),
        });

        alert("Reminder sent successfully!");
        onOpenChange(false);
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      alert("Error sending reminder. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Generate email preview HTML
  const getEmailPreviewHtml = () => {
    const editorContent = editorRef.current?.innerHTML || "";
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
          ${editorContent}
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Invoice {invoice.invoice_no}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Left side - Email form */}
          <div className="flex-1 space-y-4 overflow-y-auto pr-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="template">Use Template</Label>
                {selectedTemplate && selectedTemplate !== "default" && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOverwriteTemplate}
                      className="text-blue-600 hover:text-blue-700 h-auto py-1 px-2 text-xs"
                    >
                      Overwrite
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDeleteTemplate}
                      className="text-red-600 hover:text-red-700 h-auto py-1 px-2 text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
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

            {/* To */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="to">
                  To{" "}
                  <span className="text-blue-600 text-xs ml-2">1 Cc/Bcc</span>
                </Label>
              </div>
              <Input
                id="to"
                type="email"
                value={emailData.to}
                onChange={(e) =>
                  setEmailData({ ...emailData, to: e.target.value })
                }
                placeholder="Separate multiple emails with commas"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendMeCopy"
                  checked={sendMeCopy}
                  onCheckedChange={(checked) =>
                    setSendMeCopy(checked as boolean)
                  }
                />
                <Label
                  htmlFor="sendMeCopy"
                  className="text-sm font-normal cursor-pointer"
                >
                  Send me a copy
                </Label>
              </div>
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
              />
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Paperclip className="h-4 w-4" />
                <span>Invoice PDF attached</span>
              </div>
            </div>

            {/* Email body editor */}
            <div className="space-y-2">
              <Label>Email body</Label>
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[200px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-card"
                style={{
                  lineHeight: "1.6",
                  fontSize: "14px",
                }}
                suppressContentEditableWarning
              />
              <p className="text-xs text-blue-600 hover:underline cursor-pointer">
                Manage online delivery settings
              </p>
            </div>

            {/* Save as template */}
            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="saveTemplate"
                  checked={saveAsTemplate}
                  onCheckedChange={(checked) =>
                    setSaveAsTemplate(checked as boolean)
                  }
                />
                <Label
                  htmlFor="saveTemplate"
                  className="cursor-pointer text-sm font-normal"
                >
                  Save as template for future use
                </Label>
              </div>

              {saveAsTemplate && (
                <Input
                  placeholder="Template name (e.g., Standard Payment Reminder)"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="ml-6"
                />
              )}
            </div>
          </div>

          {/* Right side - Preview with Tabs */}
          <div className="w-[450px] border-l pl-6 flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email Content</TabsTrigger>
                <TabsTrigger value="pdf">Invoice PDF</TabsTrigger>
              </TabsList>
              
              <TabsContent value="email" className="flex-1 overflow-y-auto mt-4">
                <div className="border rounded-lg bg-card p-4">
                  <div className="text-xs 0 mb-3 pb-3 border-b">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">From:</span>
                      <span>{emailData.from}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold">To:</span>
                      <span>{emailData.to || "recipient@email.com"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Subject:</span>
                      <span className="truncate ml-2">{emailData.subject || "No subject"}</span>
                    </div>
                  </div>
                  <div 
                    dangerouslySetInnerHTML={{ __html: getEmailPreviewHtml() }}
                    className="prose prose-sm max-w-none"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="pdf" className="flex-1 overflow-hidden mt-4">
                <div className="h-full border rounded-lg bg-card flex items-center justify-center">
                  {loadingPdf ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin " />
                      <p className="text-sm =">Loading PDF preview...</p>
                    </div>
                  ) : pdfUrl ? (
                    <iframe
                      src={pdfUrl}
                      className="w-full h-full rounded-lg"
                      title="Invoice PDF Preview"
                    />
                  ) : (
                    <div className="text-center text-gray-500">
                      <p className="text-sm">PDF preview not available</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !emailData.to || !emailData.subject}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}