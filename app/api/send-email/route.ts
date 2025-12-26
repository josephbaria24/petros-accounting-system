//app\api\send-email\route.ts
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { to, subject, message, attachments, inlineImages } = await req.json();

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const mailOptions: any = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: message,
      attachments: [],
    };

    // Add inline images (embedded with cid:)
    if (inlineImages && Array.isArray(inlineImages) && inlineImages.length > 0) {
      inlineImages.forEach((img: any) => {
        const base64Content = img.content.includes(",")
          ? img.content.split(",")[1]
          : img.content;
        mailOptions.attachments.push({
          filename: img.filename,
          content: Buffer.from(base64Content, "base64"),
          cid: img.cid,
        });
      });
    }

    // Add file attachments (PDF, etc)
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      attachments.forEach((attachment: any) => {
        const base64Content = attachment.content.includes(",")
          ? attachment.content.split(",")[1]
          : attachment.content;
        mailOptions.attachments.push({
          filename: attachment.filename,
          content: Buffer.from(base64Content, "base64"),
        });
      });
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Email send error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
