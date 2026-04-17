//app\api\send-email\route.ts
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

const LOOSE_EMAIL = /^[^\s<>]+@[^\s<>]+\.[^\s<>]+$/;
function contentTypeForExt(ext: string): string | undefined {
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
    case "svg+xml":
      return "image/svg+xml";
    default:
      return undefined;
  }
}

function normalizeSmtpRecipients(to: unknown): string {
  if (typeof to !== "string") return "";
  const pieces = to
    .split(/[,;]/)
    .map((p) => p.trim().replace(/[\r\n]/g, ""))
    .filter(Boolean);
  const valid = pieces.filter((p) => LOOSE_EMAIL.test(p));
  return valid.join(", ");
}

function parseOptionalSingleEmail(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim().replace(/[\r\n]/g, "");
  if (!t || !LOOSE_EMAIL.test(t)) return undefined;
  return t;
}

function parseOptionalBccList(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const norm = normalizeSmtpRecipients(v);
  return norm || undefined;
}

/** Drop Bcc addresses that already appear in To (some MTAs reject duplicates). */
function bccExcludingTo(bcc: string | undefined, toList: string): string | undefined {
  if (!bcc?.trim()) return undefined;
  const toLower = new Set(
    toList
      .split(",")
      .map((a) => a.trim().toLowerCase())
      .filter(Boolean)
  );
  const kept = bcc
    .split(",")
    .map((a) => a.trim())
    .filter((a) => a && !toLower.has(a.toLowerCase()));
  return kept.length ? kept.join(", ") : undefined;
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function isRetryableSmtpError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  let response = "";
  let responseCode: number | undefined;
  if (typeof error === "object" && error !== null) {
    const o = error as { response?: string; responseCode?: number };
    if (typeof o.response === "string") response = o.response.toLowerCase();
    if (typeof o.responseCode === "number") responseCode = o.responseCode;
  }
  const combined = msg + response;
  if (responseCode === 421 || responseCode === 450 || responseCode === 451 || responseCode === 452) return true;
  if (
    /econnreset|etimedout|eai_again|socket|connection closed|eof|tls handshake|timeout|temporary failure|try again|greylist|resource(s)? unavailable|too many connections|service not available|421|450|451|452/i.test(
      combined
    )
  )
    return true;
  // Opaque permanent-looking codes that often clear on a new session (Exchange / shared hosting).
  if (/5\.0\.0|message failed/i.test(combined)) return true;
  return false;
}

function formatClientSmtpError(errorMessage: string, smtpResponse?: string): string {
  const r = smtpResponse?.trim();
  if (!r) return errorMessage;
  const m = errorMessage.trim();
  if (!m) return r;
  if (m.toLowerCase().includes(r.toLowerCase())) return m;
  return `${m} (${r})`;
}

/** SMTP accepted MAIL/RCPT but rejected the message body (common with large PDFs or strict scanners). */
function isDataPhaseFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const e = error as Error & { code?: string; command?: string };
  if (e.code === "EMESSAGE") return true;
  if (e.command === "DATA") return true;
  return false;
}

const DATA_FALLBACK_NOTICE = `
<p style="margin:16px 0 0;padding:12px 0 0;border-top:1px solid #e2e8f0;font-size:13px;line-height:1.5;color:#64748b;">
  Your mail server did not accept the full message. This copy was sent without attachments or embedded images.
  Open PetroBook to view or download the invoice PDF.
</p>`;

export async function POST(req: Request) {
  const { to, subject, message, attachments, inlineImages, replyTo, bcc } = await req.json();

  const smtpDisabled = process.env.SMTP_DISABLED?.trim().toLowerCase() === "true";
  if (smtpDisabled) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "SMTP_DISABLED=true",
    });
  }

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPortRaw = process.env.SMTP_PORT?.trim();
  const smtpPort = smtpPortRaw ? Number(smtpPortRaw) : NaN;
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS;
  const smtpFromName = (process.env.SMTP_FROM_NAME?.trim() || "PetroBook").trim();
  // Only use SMTP_FROM_EMAIL when it is a real address. A non-empty but invalid value
  // (common in hosted env placeholders) must not override SMTP_USER.
  const smtpFromEmailRaw = process.env.SMTP_FROM_EMAIL?.trim();
  const smtpFromEmail = (
    parseOptionalSingleEmail(smtpFromEmailRaw) ||
    smtpUser ||
    ""
  ).trim();
  const smtpSecure =
    (process.env.SMTP_SECURE?.trim().toLowerCase() === "true") ||
    smtpPort === 465;
  const smtpFromEmailIsValid = Boolean(smtpFromEmail && LOOSE_EMAIL.test(smtpFromEmail));

  const toNormalized = normalizeSmtpRecipients(to);
  if (!toNormalized) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing recipient email address." },
      { status: 400 }
    );
  }

  if (!smtpHost || !Number.isFinite(smtpPort) || !smtpUser || !smtpPass || !smtpFromEmail) {
    // Dev convenience: avoid hard-failing when SMTP isn't configured locally.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "SMTP not configured (development mode)",
      });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "Email is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally SMTP_FROM_EMAIL/SMTP_FROM_NAME/SMTP_SECURE).",
      },
      { status: 400 }
    );
  }
  if (!smtpFromEmailIsValid) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Email is not configured: set SMTP_FROM_EMAIL to a valid sender address your SMTP provider allows, or use an SMTP_USER that is a valid email address.",
      },
      { status: 400 }
    );
  }

  const useIpv4 = process.env.SMTP_USE_IPV4?.trim().toLowerCase() === "true";
  const requireTls = process.env.SMTP_REQUIRE_TLS?.trim().toLowerCase() === "true";

  const transportOptions = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    ...(useIpv4 ? { family: 4 as const } : {}),
    ...(requireTls ? { requireTLS: true } : {}),
  };

  const createTransport = () => nodemailer.createTransport(transportOptions);

  try {
    const replyToAddr = parseOptionalSingleEmail(replyTo);
    const rawBcc = parseOptionalBccList(bcc);
    const bccAddr = bccExcludingTo(rawBcc, toNormalized);

    const mailOptions: nodemailer.SendMailOptions = {
      from: {
        name: smtpFromName.replace(/[\r\n]/g, " ").slice(0, 200),
        address: smtpFromEmail,
      },
      to: toNormalized,
      subject: typeof subject === "string" ? subject.replace(/[\r\n]/g, " ").slice(0, 998) : "",
      html: typeof message === "string" ? message : "",
      attachments: [],
      ...(replyToAddr ? { replyTo: replyToAddr } : {}),
      ...(bccAddr ? { bcc: bccAddr } : {}),
    };

    // Separate inline (CID) images from regular file attachments.
    // Inline images go into a multipart/related section so email clients
    // render them where src="cid:xxx" appears in the HTML body.
    const inlineAttachments: any[] = [];
    const fileAttachments: any[] = [];

    if (inlineImages && Array.isArray(inlineImages) && inlineImages.length > 0) {
      for (const img of inlineImages) {
        let imgBuffer: Buffer | null = null;
        let ext = "png";

        if (typeof img.content === "string" && (img.content.startsWith("http://") || img.content.startsWith("https://"))) {
          try {
            const imgResp = await fetch(img.content);
            if (imgResp.ok) {
              const ct = imgResp.headers.get("content-type") || "";
              if (ct.includes("jpeg") || ct.includes("jpg")) ext = "jpg";
              else if (ct.includes("gif")) ext = "gif";
              else if (ct.includes("webp")) ext = "webp";
              imgBuffer = Buffer.from(await imgResp.arrayBuffer());
            }
          } catch (e) {
            console.error("[send-email] inline image fetch failed:", e);
          }
        } else if (typeof img.content === "string") {
          const mimeMatch = img.content.match(/^data:image\/([^;]+);/);
          if (mimeMatch) ext = mimeMatch[1] === "jpeg" ? "jpg" : mimeMatch[1];
          const base64Content = img.content.includes(",")
            ? img.content.split(",")[1]
            : img.content;
          imgBuffer = Buffer.from(base64Content, "base64");
        }

        if (imgBuffer && imgBuffer.length > 0) {
          // Safe filename only — cid may contain "@" (Outlook-style); never use cid as filename.
          const contentType = contentTypeForExt(ext);
          inlineAttachments.push({
            filename: `inline-logo.${ext}`,
            content: imgBuffer,
            cid: img.cid,
            contentDisposition: "inline",
            ...(contentType ? { contentType } : {}),
          });
        }
      }
    }

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach((attachment: any) => {
        const base64Content = attachment.content.includes(",")
          ? attachment.content.split(",")[1]
          : attachment.content;
        fileAttachments.push({
          filename: attachment.filename,
          content: Buffer.from(base64Content, "base64"),
        });
      });
    }

    // Inline (CID) parts first so multipart/related binds correctly to the HTML body.
    mailOptions.attachments = [...inlineAttachments, ...fileAttachments];

    const retriesRaw = process.env.SMTP_SEND_RETRIES?.trim();
    const maxAttempts = Math.min(5, Math.max(1, retriesRaw ? Number(retriesRaw) : 3));
    const dataFallbackDisabled =
      process.env.SMTP_DISABLE_DATA_FALLBACK?.trim().toLowerCase() === "true";

    const sendMailWithRetries = async (opts: nodemailer.SendMailOptions) => {
      let transporter = createTransport();
      let lastErr: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await transporter.sendMail(opts);
          lastErr = undefined;
          try {
            await transporter.close();
          } catch {
            /* ignore */
          }
          break;
        } catch (e) {
          lastErr = e;
          const canRetry = attempt < maxAttempts && isRetryableSmtpError(e);
          console.error(`[send-email] send attempt ${attempt}/${maxAttempts} failed:`, e);
          if (!canRetry) throw e;
          try {
            await transporter.close();
          } catch {
            /* ignore */
          }
          await delay(500 * 2 ** (attempt - 1));
          transporter = createTransport();
        }
      }
      if (lastErr != null) throw lastErr;
    };

    let degraded: "pdf_omitted" | "attachments_omitted" | undefined;

    try {
      await sendMailWithRetries(mailOptions);
    } catch (firstErr) {
      if (
        dataFallbackDisabled ||
        !isDataPhaseFailure(firstErr) ||
        (fileAttachments.length === 0 && inlineAttachments.length === 0)
      ) {
        throw firstErr;
      }

      console.warn(
        "[send-email] DATA phase rejected (EMESSAGE / command DATA). Trying smaller payloads — common with PDF size or MIME scanning."
      );

      // 1) Drop file attachments (usually invoice PDF); keep inline logo.
      if (fileAttachments.length > 0) {
        try {
          const withoutPdf: nodemailer.SendMailOptions = {
            ...mailOptions,
            attachments: [...inlineAttachments],
          };
          await sendMailWithRetries(withoutPdf);
          degraded = "pdf_omitted";
        } catch (err2) {
          if (!isDataPhaseFailure(err2)) throw err2;
          // 2) Drop everything embedded; plain HTML + notice.
          const minimal: nodemailer.SendMailOptions = {
            ...mailOptions,
            attachments: [],
            html: String(mailOptions.html ?? "") + DATA_FALLBACK_NOTICE,
          };
          try {
            await sendMailWithRetries(minimal);
            degraded = "attachments_omitted";
          } catch (err3) {
            if (!isDataPhaseFailure(err3)) throw err3;
            // 3) Ultra-minimal plain text only (no HTML at all) to isolate HTML/content-filter issues.
            const textOnly: nodemailer.SendMailOptions = {
              ...mailOptions,
              attachments: [],
              html: undefined,
              text:
                "Payment reminder sent from PetroBook.\n\nYour mail server rejected the formatted message body. Please open PetroBook to view the invoice details.",
            };
            await sendMailWithRetries(textOnly);
            degraded = "attachments_omitted";
          }
        }
      } else if (inlineAttachments.length > 0) {
        const minimal: nodemailer.SendMailOptions = {
          ...mailOptions,
          attachments: [],
          html: String(mailOptions.html ?? "") + DATA_FALLBACK_NOTICE,
        };
        try {
          await sendMailWithRetries(minimal);
          degraded = "attachments_omitted";
        } catch (err3) {
          if (!isDataPhaseFailure(err3)) throw err3;
          const textOnly: nodemailer.SendMailOptions = {
            ...mailOptions,
            attachments: [],
            html: undefined,
            text:
              "Payment reminder sent from PetroBook.\n\nYour mail server rejected the formatted message body. Please open PetroBook to view the invoice details.",
          };
          await sendMailWithRetries(textOnly);
          degraded = "attachments_omitted";
        }
      } else {
        throw firstErr;
      }
    }

    return NextResponse.json({
      success: true,
      ...(degraded ? { degraded } : {}),
    });
  } catch (error: unknown) {
    console.error("Email send error:", error);
    let errorMessage = "Unknown error";
    let smtpResponse: string | undefined;
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    if (typeof error === "object" && error !== null && "response" in error) {
      const r = (error as { response?: string }).response;
      if (typeof r === "string" && r.trim()) smtpResponse = r.trim();
    }
    const combined = errorMessage + (smtpResponse || "");
    const hint =
      /5\.7\.|not authorized|relay|authentication|credentials/i.test(combined)
        ? " Check SMTP_USER / SMTP_PASS and that SMTP_FROM_EMAIL is an allowed “From” address for this server."
        : /5\.1\.|invalid|unknown|recipient/i.test(combined)
          ? " Check that the recipient address is valid and accepts mail."
          : /5\.0\.0|message failed/i.test(combined)
            ? " If the log shows command: DATA / code: EMESSAGE, the server rejected the message body (often the PDF or MIME). The API retries without attachments when possible. Otherwise set SMTP_USE_IPV4=true or check provider status and credentials."
            : "";
    const clientError = formatClientSmtpError(errorMessage, smtpResponse);
    return NextResponse.json(
      {
        success: false,
        error: clientError,
        ...(smtpResponse && !clientError.toLowerCase().includes(smtpResponse.toLowerCase())
          ? { smtpResponse }
          : {}),
        ...(hint ? { hint } : {}),
      },
      { status: 500 }
    );
  }
}
