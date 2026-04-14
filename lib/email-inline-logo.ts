/**
 * Content-ID for inline logo MIME parts. Domain-style IDs improve Outlook compatibility.
 * Must match exactly in HTML: <img src="cid:…" /> and in nodemailer attachment `cid`.
 */
export const EMAIL_LOGO_CONTENT_ID = "companylogo@petrosphere.com.ph";

export const emailLogoCidHref = `cid:${EMAIL_LOGO_CONTENT_ID}`;

export function emailLogoImgHtml(): string {
  return `<img src="${emailLogoCidHref}" alt="Company Logo" width="160" height="60" style="max-height:60px;max-width:160px;height:auto;width:auto;display:block;border:0;outline:none;text-decoration:none;" />`;
}
