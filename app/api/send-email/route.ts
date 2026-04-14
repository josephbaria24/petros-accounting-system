//app\api\send-email\route.ts
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { to, subject, message, attachments, inlineImages } = await req.json();

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
  const smtpFromEmail = (process.env.SMTP_FROM_EMAIL?.trim() || smtpUser || "").trim();
  const smtpSecure =
    (process.env.SMTP_SECURE?.trim().toLowerCase() === "true") ||
    smtpPort === 465;

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

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    const mailOptions: any = {
      from: `"${smtpFromName}" <${smtpFromEmail}>`,
      to,
      subject,
      html: message,
      attachments: [],
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
          inlineAttachments.push({
            filename: `inline-logo.${ext}`,
            content: imgBuffer,
            cid: img.cid,
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

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Email send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
