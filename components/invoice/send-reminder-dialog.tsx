//components\invoice\send-reminder-dialog.tsx
"use client";
import { sileo } from "sileo";

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
import {
  EMAIL_LOGO_CONTENT_ID,
  emailLogoImgHtml,
} from "@/lib/email-inline-logo";
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
    const defaultMessage = `Dear ${invoice.customer_name},<br><br>We would like to kindly remind you that the payment for this invoice remains outstanding as of today. We would greatly appreciate your prompt attention to this matter.<br><br>If the payment has already been processed, please disregard this message. Otherwise, we would appreciate it if you could provide an update regarding the payment status or the expected date of settlement.<br><br>If you have any questions or require further clarification regarding this invoice, please feel free to contact us. We are happy to assist you.<br><br>Thank you for your attention and continued cooperation.`;

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

      sileo.success({ title: "Template updated", description: "Template saved successfully." });
      await loadTemplates();
    } catch (error) {
      console.error("Error updating template:", error);
      sileo.error({ title: "Update failed", description: "Could not update template. Please try again." });
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

      sileo.success({ title: "Template deleted" });
      
      // Reset to default template
      setSelectedTemplate("default");
      loadDefaultTemplate();
      
      // Reload templates
      await loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      sileo.error({ title: "Delete failed", description: "Could not delete template. Please try again." });
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

  /** Same pixels as preview: prefer data URL from file picker; else try to load saved URL to data URL for reliable CID embedding. */
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

  const generateHTMLMessage = async () => {
    const editorContent = editorRef.current?.innerHTML || "";
    const inlineImages: { filename: string; content: string; cid: string }[] = [];
    const attachments: { filename: string; content: string }[] = [];
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

    const logoContent = await resolveLogoContentForEmail();
    if (logoContent) {
      inlineImages.push({
        filename: "inline-logo.png",
        content: logoContent,
        cid: EMAIL_LOGO_CONTENT_ID,
      });
    }

    const issueDateFmt = invoice.issue_date
      ? new Date(invoice.issue_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "N/A";
    const dueDateFmt = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "N/A";
    const amountFmt = `₱${invoice.balance_due.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const logoHtml = logoContent
      ? emailLogoImgHtml()
      : `<div style="display:inline-block;padding:10px 20px;background:#f3f4f6;border-radius:6px;color:#9ca3af;font-size:13px;font-weight:500;letter-spacing:0.02em;">Your Company</div>`;

    return {
      html: `
<div style="background-color:#f4f6f8;padding:40px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);border:1px solid #e2e8f0;">

    <!-- Gold top bar (30%) -->
    <div style="height:5px;background:linear-gradient(90deg,#c9a84c,#e8c96a,#c9a84c);"></div>

    <!-- Navy logo header (60%) -->
    <div style="padding:28px 40px 22px;text-align:left;background:#1a2f4e;">
      ${logoHtml}
      <p style="margin:14px 0 0;font-size:11px;color:#94a3b8;line-height:1.7;letter-spacing:0.01em;">
        304, 3F, Trigold Business Park, National Highway<br/>
        San Pedro, 5300, Puerto Princesa City
      </p>
    </div>

    <!-- Body (10% white) -->
    <div style="padding:32px 40px 0;background:#ffffff;">
      <div style="display:inline-block;background:#c9a84c;color:#1a2f4e;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;padding:5px 12px;border-radius:4px;margin-bottom:20px;">
        Payment Reminder
      </div>
      <div style="font-size:15px;line-height:1.75;color:#1e293b;">
        ${editorContent}
      </div>
    </div>

    <!-- Invoice details card -->
    <div style="margin:28px 40px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <!-- Navy card header (60%) -->
      <div style="padding:13px 20px;background:#1a2f4e;">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#c9a84c;">Invoice Details</span>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#ffffff;">
        <tr>
          <td style="padding:13px 20px;font-size:13px;color:#64748b;font-weight:500;border-bottom:1px solid #f1f5f9;">Invoice Number</td>
          <td style="padding:13px 20px;font-size:13px;color:#1a2f4e;font-weight:700;text-align:right;border-bottom:1px solid #f1f5f9;">${invoice.invoice_no}</td>
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
      <!-- Gold amount-due row (30%) -->
      <div style="padding:18px 20px;background:#fdf3d6;border-top:2px solid #c9a84c;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#1a2f4e;">Total Amount Due</td>
            <td style="text-align:right;font-size:26px;font-weight:800;color:#1a2f4e;letter-spacing:-0.5px;">${amountFmt}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Navy footer (60%) -->
    <div style="padding:24px 40px 28px;text-align:center;background:#1a2f4e;">
      <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;line-height:1.6;">
        Questions? Contact us at
        <a href="mailto:info@petrosphere.com.ph" style="color:#c9a84c;text-decoration:none;font-weight:600;">info@petrosphere.com.ph</a>
      </p>
      <p style="margin:0;font-size:11px;color:#475569;">This is an automated payment reminder. Please disregard if already paid.</p>
    </div>

  </div>
</div>
      `.trim(),
      inlineImages,
      attachments,
    };
  };

  const handleSend = async () => {
    if (!emailData.to || !emailData.subject) {
      sileo.warning({ title: "Missing fields", description: "Please fill in recipient and subject." });
      return;
    }

    if (!editorRef.current?.textContent?.trim()) {
      sileo.warning({ title: "Empty message", description: "Please enter a message before sending." });
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
          sileo.warning({ title: "Template not saved", description: "Could not save template, but the email will still be sent." });
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

        sileo.success({ title: "Reminder sent", description: "The reminder email was sent successfully." });
        onOpenChange(false);
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      sileo.error({ title: "Send failed", description: "Could not send reminder. Please try again." });
    } finally {
      setSending(false);
    }
  };

  // Generate email preview HTML (uses real logo URL, not cid)
  const getEmailPreviewHtml = () => {
    const editorContent = editorRef.current?.innerHTML || "";
    const issueDateFmt = invoice.issue_date
      ? new Date(invoice.issue_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "N/A";
    const dueDateFmt = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : "N/A";
    const amountFmt = `₱${invoice.balance_due.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const logoSrc = logoPreview || logoUrl;
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" alt="Company Logo" style="max-height:60px;max-width:160px;object-fit:contain;" />`
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
        ${editorContent}
      </div>
    </div>

    <div style="margin:28px 40px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <div style="padding:13px 20px;background:#1a2f4e;">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#c9a84c;">Invoice Details</span>
      </div>
      <table style="width:100%;border-collapse:collapse;background:#ffffff;">
        <tr>
          <td style="padding:13px 20px;font-size:13px;color:#64748b;font-weight:500;border-bottom:1px solid #f1f5f9;">Invoice Number</td>
          <td style="padding:13px 20px;font-size:13px;color:#1a2f4e;font-weight:700;text-align:right;border-bottom:1px solid #f1f5f9;">${invoice.invoice_no}</td>
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
</div>
    `;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-6xl p-0 gap-0 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
              <Paperclip className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold leading-tight">
                Send Invoice
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {invoice.invoice_no} · {invoice.customer_name} ·{" "}
                <span className="text-red-600 font-medium">
                  ₱{invoice.balance_due.toLocaleString("en-PH", { minimumFractionDigits: 2 })} due
                </span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — compose form */}
          <div className="flex-1 flex flex-col overflow-hidden border-r">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Logo */}
              <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-lg border">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-10 w-auto max-w-[120px] rounded object-contain" />
                ) : (
                  <div className="h-10 w-20 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground border border-dashed">
                    No logo
                  </div>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {logoPreview ? "Change" : "Upload Logo"}
                  </Button>
                  {logoPreview && !logoUrl && (
                    <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={handleLogoUpload} disabled={uploadingLogo}>
                      {uploadingLogo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save to FTP"}
                    </Button>
                  )}
                  {logoUrl && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
                  {logoPreview && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500"
                      onClick={() => { setLogoFile(null); setLogoPreview(""); setLogoUrl(""); localStorage.removeItem(LAST_LOGO_KEY); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" />
              </div>

              {/* Template */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Use Template</Label>
                  {selectedTemplate && selectedTemplate !== "default" && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={handleOverwriteTemplate}
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        Overwrite
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleDeleteTemplate}
                        className="h-6 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
                <Select value={selectedTemplate} onValueChange={(v) => { setSelectedTemplate(v); applyTemplate(v); }}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Payment Reminder</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* From */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">From</Label>
                <Input value={emailData.from} onChange={(e) => setEmailData({ ...emailData, from: e.target.value })} className="h-10 bg-muted/30" />
              </div>

              {/* To */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">To</Label>
                <Input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                  placeholder="recipient@email.com"
                  className="h-10"
                />
                <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
                  <Checkbox
                    checked={sendMeCopy}
                    onCheckedChange={(checked) => setSendMeCopy(checked as boolean)}
                    className="h-4 w-4 rounded border border-input data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <span className="text-xs text-muted-foreground">Send me a copy</span>
                </label>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subject</Label>
                <Input value={emailData.subject} onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })} className="h-10" />
                <div className="flex items-center gap-1.5 text-xs text-green-600 mt-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>Invoice PDF attached</span>
                </div>
              </div>

              {/* Body editor */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email body</Label>
                <div
                  ref={editorRef}
                  contentEditable
                  className="min-h-[160px] p-3 border rounded-md text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-500 bg-card"
                  suppressContentEditableWarning
                />
                <p className="text-xs text-blue-600 hover:underline cursor-pointer">Manage online delivery settings</p>
              </div>

              {/* Save as template */}
              <div className="space-y-2 pt-3 border-t">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox
                    checked={saveAsTemplate}
                    onCheckedChange={(checked) => setSaveAsTemplate(checked as boolean)}
                    className="h-4 w-4 rounded border border-input data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                  <span className="text-sm text-foreground">Save as template for future use</span>
                </label>
                {saveAsTemplate && (
                  <Input
                    placeholder="Template name (e.g., Standard Payment Reminder)"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-10 ml-6"
                  />
                )}
              </div>

            </div>
          </div>

          {/* Right — preview panel */}
          <div className="w-[440px] flex flex-col overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              {/* Tab nav — underline style */}
              <div className="border-b shrink-0 px-2">
                <TabsList className="h-auto bg-transparent p-0 gap-0">
                  {[
                    { value: "email", label: "Email Content" },
                    { value: "pdf",   label: "Invoice PDF" },
                  ].map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="relative px-5 py-3 text-sm font-medium rounded-none bg-transparent shadow-none
                                 text-muted-foreground hover:text-foreground transition-colors
                                 data-[state=active]:text-green-700
                                 data-[state=active]:after:absolute data-[state=active]:after:bottom-0
                                 data-[state=active]:after:left-0 data-[state=active]:after:right-0
                                 data-[state=active]:after:h-0.5 data-[state=active]:after:bg-green-600
                                 data-[state=active]:after:content-[''] data-[state=active]:after:rounded-t"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {/* Email preview */}
              <TabsContent value="email" className="flex-1 overflow-y-auto p-4 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                <div className="border rounded-lg overflow-hidden bg-card text-xs">
                  {/* Meta header */}
                  <div className="px-4 py-3 bg-muted/40 border-b space-y-1">
                    <div className="flex gap-2">
                      <span className="font-semibold text-muted-foreground w-14 shrink-0">From:</span>
                      <span className="truncate">{emailData.from}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-muted-foreground w-14 shrink-0">To:</span>
                      <span className="truncate">{emailData.to || "recipient@email.com"}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-semibold text-muted-foreground w-14 shrink-0">Subject:</span>
                      <span className="truncate">{emailData.subject || "No subject"}</span>
                    </div>
                  </div>
                  {/* Body preview */}
                  <div
                    dangerouslySetInnerHTML={{ __html: getEmailPreviewHtml() }}
                    className="prose prose-sm max-w-none"
                  />
                </div>
              </TabsContent>

              {/* PDF preview */}
              <TabsContent value="pdf" className="flex-1 overflow-hidden p-4 mt-0 focus-visible:ring-0 focus-visible:outline-none">
                <div className="h-full border rounded-lg bg-card flex items-center justify-center">
                  {loadingPdf ? (
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">Generating PDF preview…</p>
                    </div>
                  ) : pdfUrl ? (
                    <iframe src={pdfUrl} className="w-full h-full rounded-lg" title="Invoice PDF Preview" />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <p className="text-sm">PDF preview not available</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <Paperclip className="h-3.5 w-3.5" />
            <span>Invoice PDF will be attached</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !emailData.to || !emailData.subject}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[90px]"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
