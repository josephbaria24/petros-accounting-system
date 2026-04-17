// lib/generate-invoice-pdf.ts
import jsPDF from 'jspdf';
import '@/fonts/DejaVuSans-normal.js';
import '@/fonts/DejaVuSans-bold.js';

type InvoiceItem = {
  serviceDate: string;
  productService: string;
  description: string;
  quantity: number;
  rate: number;
  tax: number;
  class: string;
};

type InvoiceData = {
  invoiceNo: string;
  customerName: string;
  billingAddress: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  note: string;
  terms: string;
  location: string;
};

export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  const doc = new jsPDF();
  doc.setFont("DejaVuSans", "normal");

  const PAGE_W = 210;
  const MARGIN = 15;
  const RIGHT = PAGE_W - MARGIN;
  const W = RIGHT - MARGIN;

  // Palette (aligned with the branded server PDF)
  const NAVY = [26, 47, 78] as const;
  const GOLD = [201, 168, 76] as const;
  const DARK = [30, 41, 59] as const;
  const MID = [100, 116, 139] as const;
  const ALT = [248, 250, 252] as const;
  const LLINE = [226, 232, 240] as const;
  const CARD = [245, 247, 250] as const;
  const MUTED = [148, 163, 184] as const;

  const tc = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
  const fc = (r: number, g: number, b: number) => doc.setFillColor(r, g, b);
  const dc = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);

  const fmtPHP = (n: number) =>
    `\u20b1${Number(n || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const safeLines = (value: string) =>
    String(value || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

  // Header band (compact to keep the invoice to one page)
  const HDR_H = 44;
  fc(...NAVY); doc.rect(0, 0, PAGE_W, HDR_H, "F");
  fc(...GOLD); doc.rect(0, HDR_H, PAGE_W, 2.5, "F");
  dc(18, 32, 52); doc.setLineWidth(0.15);
  doc.line(0, HDR_H + 2.5, PAGE_W, HDR_H + 2.5);

  // Logo (client-side best-effort)
  const LOGO_TOP = 7;
  const LOGO_MAX_H = 18;
  const LOGO_MAX_W = 44;
  let logoBottom = LOGO_TOP + LOGO_MAX_H;
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.src = "/logo.png";
    await new Promise((resolve) => {
      const t = setTimeout(() => resolve(false), 900);
      logoImg.onload = () => {
        clearTimeout(t);
        try {
          // Preserve aspect ratio (avoid stretched logo)
          const iw = (logoImg as HTMLImageElement).naturalWidth || 1;
          const ih = (logoImg as HTMLImageElement).naturalHeight || 1;
          const scale = Math.min(LOGO_MAX_W / iw, LOGO_MAX_H / ih);
          const w = Math.max(1, iw * scale);
          const h = Math.max(1, ih * scale);
          doc.addImage(logoImg, "PNG", MARGIN, LOGO_TOP, w, h);
          logoBottom = LOGO_TOP + h + 3;
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      logoImg.onerror = () => {
        clearTimeout(t);
        resolve(false);
      };
    });
  } catch {
    // ignore
  }

  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(7);
  tc(...MUTED);
  doc.text("304, 3F, Trigold Business Park, National Highway", MARGIN, logoBottom);
  doc.text("San Pedro, 5300, Puerto Princesa City", MARGIN, logoBottom + 4);

  // Title + meta (top right)
  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("INVOICE", RIGHT, 20, { align: "right" });
  doc.setFont("DejaVuSans", "normal");
  doc.setFontSize(7);
  doc.setTextColor(226, 232, 240);
  doc.text("Tax document", RIGHT, 25.5, { align: "right" });

  const badgeText = "SENT";
  doc.setFont("DejaVuSans", "bold");
  doc.setFontSize(7.5);
  const badgeW = Math.max(32, doc.getTextWidth(badgeText) + 9);
  const badgeX = RIGHT - badgeW;
  const badgeY = 28.5;
  fc(...GOLD); doc.roundedRect(badgeX, badgeY, badgeW, 7, 1.2, 1.2, "F");
  tc(...NAVY);
  doc.text(badgeText, badgeX + badgeW / 2, badgeY + 4.8, { align: "center" });

  // Card: invoice details + bill to
  const cardTop = HDR_H + 8;
  const COL2 = 112;
  const meta: [string, string][] = [
    ["Invoice number", String(data.invoiceNo)],
    ["Issue date", String(data.issueDate)],
    ["Due date", String(data.dueDate)],
  ];

  const addrLines = data.billingAddress ? doc.splitTextToSize(String(data.billingAddress), 76) : [];
  const hLeft = 8 + 7 + meta.length * 10 + 7;
  const hRight =
    8 +
    7 +
    9 +
    0 +
    (addrLines.length ? addrLines.length * 5.2 : 0) +
    7;
  const cardH = Math.max(hLeft, hRight);
  const cardY = cardTop - 3;

  fc(...CARD);
  doc.roundedRect(MARGIN, cardY, W, cardH, 2.5, 2.5, "F");
  dc(...LLINE); doc.setLineWidth(0.25);
  doc.roundedRect(MARGIN, cardY, W, cardH, 2.5, 2.5, "S");

  let ly = cardTop + 3.5;
  doc.setFont("DejaVuSans", "bold"); doc.setFontSize(8); tc(...NAVY);
  doc.text("Invoice details", MARGIN + 5, ly);
  ly += 6.2;
  meta.forEach(([lbl, val]) => {
    doc.setFont("DejaVuSans", "normal"); doc.setFontSize(7); tc(...MID);
    doc.text(lbl, MARGIN + 5, ly);
    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9); tc(...DARK);
    doc.text(val, MARGIN + 5, ly + 4);
    ly += 10;
  });

  let billY = cardTop + 3.5;
  doc.setFont("DejaVuSans", "bold"); doc.setFontSize(8); tc(...NAVY);
  doc.text("Bill to", COL2, billY);
  dc(...GOLD); doc.setLineWidth(0.35);
  doc.line(COL2, billY + 1.8, COL2 + 22, billY + 1.8);
  billY += 7;
  doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9.5); tc(...DARK);
  doc.text(data.customerName || "N/A", COL2, billY);
  billY += 6;
  if (addrLines.length) {
    doc.setFont("DejaVuSans", "normal"); doc.setFontSize(8); tc(...MID);
    doc.text(addrLines, COL2, billY);
  }

  let y = cardY + cardH + 9;

  // Items table
  // Columns: #, Service date, Product/service, Description, Qty, Unit price, Tax, Amount, Class
  // Keep it compact for A4 while remaining readable.
  const CX = {
    num: MARGIN + 4,
    date: MARGIN + 12,
    product: MARGIN + 34,
    desc: MARGIN + 80,
    qty: RIGHT - 66,
    price: RIGHT - 46,
    tax: RIGHT - 30,
    class: RIGHT - 18,
    amt: RIGHT - 4,
  };
  const HEADER_H = 6;
  const ROW_MIN = 7.2;
  const baselineInRow = (rowTop: number, h: number) => rowTop + h - 2.4;
  const fmtShortDate = (s: string) => {
    const v = String(s || "").trim();
    if (!v) return "—";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "2-digit" });
  };

  doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9); tc(...NAVY);
  doc.text("Line items", MARGIN, y);
  y += 7.5;
  dc(...GOLD); doc.setLineWidth(0.4);
  doc.line(MARGIN, y, RIGHT, y);
  y += 3;

  const drawHeader = (headerTop: number) => {
    fc(...NAVY); doc.rect(MARGIN, headerTop, W, HEADER_H, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(8);
    const t = baselineInRow(headerTop, HEADER_H);
    doc.text("#", CX.num, t);
    doc.text("Service date", CX.date, t);
    doc.text("Product/service", CX.product, t);
    doc.text("Description", CX.desc, t);
    doc.text("Qty", CX.qty, t, { align: "right" });
    doc.text("Unit price", CX.price, t, { align: "right" });
    doc.text("Tax", CX.tax, t, { align: "right" });
    doc.text("Amount", CX.amt, t, { align: "right" });
    doc.text("Class", CX.class, t, { align: "right" });
  };

  let headerTop = y;
  drawHeader(headerTop);
  y = headerTop + HEADER_H;

  // One-page guarantee:
  // - Never add a new page. If too many items, show the first rows and a final “+X more items”.
  // - If note doesn't fit, omit it (still stored in app).
  const ONE_PAGE_BOTTOM = 262;
  const SAFE_BOTTOM = 238;
  const itemsSafeEnd = SAFE_BOTTOM - 40; // reserve room for totals and (optional) note label
  const moreLineH = 6.2;

  let truncatedCount = 0;
  for (let idx = 0; idx < data.items.length; idx++) {
    const item = data.items[idx];
    const qty = Number(item.quantity || 0);
    const rate = Number(item.rate || 0);
    const taxRate = Number(item.tax || 0);
    const lineAmount = qty * rate;
    const lineTax = (lineAmount * taxRate) / 100;
    const lineTotal = lineAmount + lineTax;

    const productText = String(item.productService || "").trim() || "—";
    const descText = String(item.description || "").trim() || "—";
    const dLines = doc.splitTextToSize(descText, CX.qty - CX.desc - 6);
    const textLines = Array.isArray(dLines) ? dLines : [String(dLines)];
    const cellH = Math.max(ROW_MIN, textLines.length * 5.2 + 3.2);

    if (y + cellH > itemsSafeEnd) {
      truncatedCount = data.items.length - idx;
      break;
    }

    const rowTop = y;
    if (idx % 2 === 1) {
      fc(...ALT); doc.rect(MARGIN, rowTop, W, cellH, "F");
    }
    dc(...LLINE); doc.setLineWidth(0.12);
    doc.line(MARGIN, rowTop + cellH, RIGHT, rowTop + cellH);

    tc(...DARK);
    doc.setFont("DejaVuSans", "normal"); doc.setFontSize(8.5);

    if (textLines.length === 1) {
      const bl = baselineInRow(rowTop, cellH);
      doc.text(String(idx + 1), CX.num, bl);
      doc.setFontSize(8);
      doc.text(fmtShortDate(item.serviceDate), CX.date, bl);
      doc.text(doc.splitTextToSize(productText, CX.desc - CX.product - 4)[0] || "—", CX.product, bl);
      doc.setFontSize(8.5);
      doc.text(textLines[0], CX.desc, bl);
      doc.text(String(qty), CX.qty, bl, { align: "right" });
      doc.text(fmtPHP(rate), CX.price, bl, { align: "right" });
      doc.text(`${Number.isFinite(taxRate) ? taxRate : 0}%`, CX.tax, bl, { align: "right" });
      doc.text(String(item.class || "—"), CX.class, bl, { align: "right" });
      doc.setFont("DejaVuSans", "bold");
      doc.text(fmtPHP(lineTotal), CX.amt, bl, { align: "right" });
    } else {
      // Multi-line description: keep aux fields aligned to the row baseline.
      let ty = rowTop + 4;
      textLines.forEach((line: string) => {
        doc.setFont("DejaVuSans", "normal");
        doc.text(line, CX.desc, ty);
        ty += 5.2;
      });
      const bl = baselineInRow(rowTop, cellH);
      doc.text(String(idx + 1), CX.num, bl);
      doc.setFontSize(8);
      doc.text(fmtShortDate(item.serviceDate), CX.date, bl);
      doc.text(doc.splitTextToSize(productText, CX.desc - CX.product - 4)[0] || "—", CX.product, bl);
      doc.setFontSize(8.5);
      doc.text(String(qty), CX.qty, bl, { align: "right" });
      doc.text(fmtPHP(rate), CX.price, bl, { align: "right" });
      doc.text(`${Number.isFinite(taxRate) ? taxRate : 0}%`, CX.tax, bl, { align: "right" });
      doc.text(String(item.class || "—"), CX.class, bl, { align: "right" });
      doc.setFont("DejaVuSans", "bold");
      doc.text(fmtPHP(lineTotal), CX.amt, bl, { align: "right" });
    }
    doc.setFont("DejaVuSans", "normal");
    y = rowTop + cellH;
  }

  if (truncatedCount > 0) {
    const rowTop = y;
    dc(...LLINE); doc.setLineWidth(0.12);
    doc.line(MARGIN, rowTop + moreLineH, RIGHT, rowTop + moreLineH);
    doc.setFont("DejaVuSans", "normal"); doc.setFontSize(8); tc(...MID);
    doc.text(
      `+${truncatedCount} more item${truncatedCount === 1 ? "" : "s"} (see app for full list)`,
      CX.desc,
      rowTop + 4.5
    );
    y = rowTop + moreLineH;
  }

  // Totals
  y += 10;
  const SUM_RIGHT = RIGHT - 4;
  const TLBL = RIGHT - 72;

  doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9); tc(...NAVY);
  doc.text("Summary", SUM_RIGHT, y, { align: "right" });
  y += 5;
  dc(...GOLD); doc.setLineWidth(0.45);
  doc.line(TLBL, y, SUM_RIGHT, y);
  y += 7;

  const addRow = (lbl: string, val: string) => {
    doc.setFont("DejaVuSans", "normal"); doc.setFontSize(9); tc(...MID);
    doc.text(lbl, TLBL, y);
    doc.text(val, SUM_RIGHT, y, { align: "right" });
    y += 7;
  };

  addRow("Subtotal", fmtPHP(Number(data.subtotal || 0)));
  if (Number(data.taxTotal || 0) > 0) addRow("Tax", fmtPHP(Number(data.taxTotal || 0)));

  y += 10;
  const TBX = TLBL - 4;
  const TBW = SUM_RIGHT - TBX + 1;
  const BOX_H = 9;
  const dueTop = y;
  fc(...NAVY);
  doc.roundedRect(TBX, dueTop, TBW, BOX_H, 1.8, 1.8, "F");
  const dueBl = baselineInRow(dueTop, BOX_H);
  doc.setTextColor(255, 255, 255);
  doc.setFont("DejaVuSans", "bold"); doc.setFontSize(9);
  doc.text("Amount due", TLBL + 2, dueBl);
  doc.setFontSize(10);
  doc.text(fmtPHP(Number(data.total || 0)), SUM_RIGHT - 1, dueBl, { align: "right" });
  tc(...DARK);

  // Note
  const noteText = String(data.note || "").trim();
  if (noteText) {
    y = dueTop + BOX_H + 10;
    // One-page guarantee: omit note if it doesn't fit.
    if (y <= SAFE_BOTTOM - 18) {
      doc.setFont("DejaVuSans", "bold"); doc.setFontSize(8.5); tc(...NAVY);
      doc.text("Note", MARGIN, y);
      y += 6;
      doc.setFont("DejaVuSans", "normal"); doc.setFontSize(8); tc(...MID);
      const noteLines = doc.splitTextToSize(noteText, 170);
      const maxLines = Math.max(1, Math.floor((SAFE_BOTTOM - y) / 5.2));
      doc.text(noteLines.slice(0, maxLines), MARGIN, y);
    }
  }

  // Footer on all pages
  // Use jsPDF's page count (internal pages array can include extra slots).
  const PAGES = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc.internal as any).pages.length - 1;
  for (let pg = 1; pg <= PAGES; pg++) {
    doc.setPage(pg);
    dc(...GOLD); doc.setLineWidth(0.4);
    doc.line(MARGIN, ONE_PAGE_BOTTOM, RIGHT, ONE_PAGE_BOTTOM);
    doc.setFont("DejaVuSans", "bold"); doc.setFontSize(7.5); tc(...NAVY);
    doc.text("Questions?", MARGIN, 268);
    doc.setFont("DejaVuSans", "normal"); doc.setFontSize(6.8); tc(...MID);
    doc.text("0917-708-7994  •  info@petrosphere.com.ph  •  Mon–Fri 8:00–17:00", MARGIN, 273);
    doc.setFontSize(6.8); tc(...MID);
    doc.text("PETROBOOK", PAGE_W / 2, 268, { align: "center" });
    // Single-page invoice: keep footer clean (no page numbers).
    tc(...DARK);
  }

  const pdfOutput = doc.output("datauristring");
  return pdfOutput.split(",")[1];
}