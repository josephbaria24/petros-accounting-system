/**
 * Content-ID for inline logo MIME parts.
 * Avoid `@` in the id — some SMTP gateways mishandle domain-style CIDs and return generic 5.0.0 failures.
 * Must match exactly in HTML: <img src="cid:…" /> and in nodemailer attachment `cid`.
 */
export const EMAIL_LOGO_CONTENT_ID = "petrosphere-inline-logo";

export const emailLogoCidHref = `cid:${EMAIL_LOGO_CONTENT_ID}`;

export function emailLogoImgHtml(): string {
  return `<img src="${emailLogoCidHref}" alt="Company Logo" width="160" height="60" style="max-height:60px;max-width:160px;height:auto;width:auto;display:block;border:0;outline:none;text-decoration:none;" />`;
}
